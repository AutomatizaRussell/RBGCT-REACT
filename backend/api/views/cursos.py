"""
ViewSets de cursos: Curso, CursoContenido, CursoHistorial, NotificacionCurso.
"""
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models as django_models

from ..models import Curso, CursoContenido, CursoHistorial, NotificacionCurso, DatosEmpleado, CursoProgreso, CuestionarioIntento
from ..serializers import (
    CursoSerializer, CursoContenidoSerializer, CursoHistorialSerializer, NotificacionCursoSerializer,
    CuestionarioIntentoSerializer,
)
from ..permissions import IsAdminOrSuperAdmin
from ._utils import get_usuario_nombre, _es_empleado, _es_superadmin

logger = logging.getLogger(__name__)


class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all().order_by('orden')
    serializer_class = CursoSerializer

    def perform_create(self, serializer):
        creado_por = self.request.user if _es_empleado(self.request.user) else None
        serializer.save(creado_por=creado_por)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get('orden'):
            max_orden = Curso.objects.aggregate(django_models.Max('orden'))['orden__max'] or 0
            data['orden'] = max_orden + 1
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        # Registrar en historial
        CursoHistorial.objects.create(
            curso=instance,
            curso_nombre=instance.nombre,
            accion='crear',
            descripcion=f"Curso '{instance.nombre}' creado. Visibilidad: {instance.get_visibilidad_display()}",
            usuario_nombre=get_usuario_nombre(request.user)
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_name = instance.nombre
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance.refresh_from_db()
        CursoHistorial.objects.create(
            curso=instance,
            curso_nombre=instance.nombre,
            accion='editar',
            descripcion=f"Curso '{old_name}' editado. Nuevo nombre: '{instance.nombre}'. Visibilidad: {instance.get_visibilidad_display()}",
            usuario_nombre=get_usuario_nombre(request.user)
        )
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        CursoHistorial.objects.create(
            curso=None,
            curso_nombre=instance.nombre,
            accion='eliminar',
            descripcion=f"Curso '{instance.nombre}' eliminado con {instance.contenidos.count()} contenidos.",
            usuario_nombre=get_usuario_nombre(request.user)
        )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='mi-progreso')
    def mi_progreso(self, request, pk=None):
        """IDs de contenidos completados por el empleado autenticado en este curso."""
        if not _es_empleado(request.user):
            return Response({'completados': []})
        completados = CursoProgreso.objects.filter(
            empleado=request.user, curso_id=pk
        ).values_list('contenido_id', flat=True)
        return Response({'completados': list(completados)})

    @action(detail=True, methods=['post'], url_path='marcar-progreso')
    def marcar_progreso(self, request, pk=None):
        """Marca o desmarca un contenido como completado. Body: {contenido_id: int}"""
        if not _es_empleado(request.user):
            return Response({'error': 'Solo empleados pueden marcar progreso.'}, status=400)
        contenido_id = request.data.get('contenido_id')
        if not contenido_id:
            return Response({'error': 'contenido_id requerido.'}, status=400)
        try:
            contenido = CursoContenido.objects.get(pk=contenido_id, curso_id=pk)
        except CursoContenido.DoesNotExist:
            return Response({'error': 'Contenido no encontrado en este curso.'}, status=404)
        progreso, created = CursoProgreso.objects.get_or_create(
            empleado=request.user, contenido=contenido,
            defaults={'curso_id': pk}
        )
        if not created:
            progreso.delete()
            return Response({'completado': False})

        # Verificar si el curso quedó 100% completado
        total_items = CursoContenido.objects.filter(curso_id=pk).count()
        completed_items = CursoProgreso.objects.filter(
            empleado=request.user, curso_id=pk
        ).count()
        curso_completado = total_items > 0 and completed_items >= total_items
        if curso_completado:
            curso_obj = self.get_object()
            destinatarios = set()

            # Encargados de cursos
            for enc in DatosEmpleado.objects.filter(es_encargado_cursos=True, estado='ACTIVA').exclude(id_empleado=request.user.id_empleado):
                destinatarios.add(enc.id_empleado)

            # Creador del curso (si es DatosEmpleado y no es quien completó)
            if curso_obj.creado_por_id and curso_obj.creado_por_id != request.user.id_empleado:
                destinatarios.add(curso_obj.creado_por_id)

            for dest_id in destinatarios:
                try:
                    dest = DatosEmpleado.objects.get(pk=dest_id)
                    NotificacionCurso.objects.get_or_create(
                        destinatario=dest,
                        empleado=request.user,
                        curso=curso_obj,
                        defaults={'leida': False},
                    )
                except DatosEmpleado.DoesNotExist:
                    pass

        return Response({'completado': True, 'curso_completado': curso_completado})


class CursoHistorialViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CursoHistorial.objects.all()
    serializer_class = CursoHistorialSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        curso_id = self.request.query_params.get('curso_id')
        if curso_id:
            qs = qs.filter(curso_id=curso_id)
        limit = self.request.query_params.get('limit', 100)
        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 100
        return qs[:limit]


class CursoContenidoViewSet(viewsets.ModelViewSet):
    queryset = CursoContenido.objects.all().order_by('orden')
    serializer_class = CursoContenidoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        curso_id = self.request.query_params.get('curso_id')
        if curso_id:
            queryset = queryset.filter(curso_id=curso_id)
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if not hasattr(request.data, '_mutable') else request.data
        curso_id = data.get('curso')
        if not data.get('orden') and curso_id:
            max_orden = CursoContenido.objects.filter(curso_id=curso_id).aggregate(
                django_models.Max('orden'))['orden__max'] or 0
            try:
                data = data.copy()
            except Exception:
                pass
            data['orden'] = max_orden + 1
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        try:
            curso = Curso.objects.get(id=curso_id) if curso_id else None
        except Curso.DoesNotExist:
            curso = None
        if curso:
            CursoHistorial.objects.create(
                curso=curso,
                curso_nombre=curso.nombre,
                accion='agregar_contenido',
                descripcion=f"Contenido '{instance.titulo}' ({instance.get_tipo_display()}) agregado al curso '{curso.nombre}'.",
                usuario_nombre=get_usuario_nombre(request.user)
            )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        curso = instance.curso
        titulo = instance.titulo
        tipo_display = instance.get_tipo_display()
        CursoHistorial.objects.create(
            curso=curso,
            curso_nombre=curso.nombre if curso else '',
            accion='eliminar_contenido',
            descripcion=f"Contenido '{titulo}' ({tipo_display}) eliminado del curso '{curso.nombre if curso else 'Desconocido'}'.",
            usuario_nombre=get_usuario_nombre(request.user)
        )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='enviar-respuestas')
    def enviar_respuestas(self, request, pk=None):
        """Empleado envía sus respuestas. Calcula puntaje y guarda el intento."""
        if not _es_empleado(request.user):
            return Response({'error': 'Solo empleados pueden responder cuestionarios.'}, status=400)
        contenido = self.get_object()
        if contenido.tipo != 'cuestionario':
            return Response({'error': 'Este contenido no es un cuestionario.'}, status=400)

        # Verificar límite de intentos
        if contenido.max_intentos > 0:
            intentos_usados = CuestionarioIntento.objects.filter(
                empleado=request.user, contenido=contenido
            ).count()
            if intentos_usados >= contenido.max_intentos:
                return Response({
                    'error': f'Has alcanzado el límite de {contenido.max_intentos} intento(s) permitido(s).',
                    'max_intentos': contenido.max_intentos,
                    'intentos_usados': intentos_usados,
                }, status=400)

        import json as _json
        try:
            estructura = _json.loads(contenido.contenido or '{}')
        except (ValueError, TypeError):
            return Response({'error': 'Cuestionario mal formado.'}, status=400)

        preguntas = estructura.get('preguntas', [])
        puntaje_aprobacion = float(estructura.get('puntaje_aprobacion', 70))
        respuestas_enviadas = request.data.get('respuestas', {})
        tiempo = request.data.get('tiempo_segundos')

        total_autogradable = 0
        correctas = 0
        for p in preguntas:
            if p.get('tipo') == 'texto_libre':
                continue
            total_autogradable += 1
            enviada = respuestas_enviadas.get(p['id'])
            correcta = p.get('correcta')
            if p.get('tipo') == 'multiple':
                if enviada is not None and int(enviada) == int(correcta):
                    correctas += 1
            elif p.get('tipo') == 'verdadero_falso':
                if str(enviada).lower() == str(correcta).lower():
                    correctas += 1

        puntaje = (correctas / total_autogradable * 100) if total_autogradable > 0 else 100.0
        aprobado = puntaje >= puntaje_aprobacion

        num_intento = CuestionarioIntento.objects.filter(
            empleado=request.user, contenido=contenido
        ).count() + 1

        intento = CuestionarioIntento.objects.create(
            empleado=request.user,
            contenido=contenido,
            curso=contenido.curso,
            respuestas=respuestas_enviadas,
            puntaje=round(puntaje, 2),
            aprobado=aprobado,
            num_intento=num_intento,
            tiempo_segundos=tiempo,
        )

        # Marcar automáticamente como completado si: aprobó O agotó los intentos
        es_ultimo_intento = contenido.max_intentos > 0 and num_intento >= contenido.max_intentos
        if aprobado or es_ultimo_intento:
            CursoProgreso.objects.get_or_create(
                empleado=request.user,
                contenido=contenido,
                defaults={'curso': contenido.curso},
            )
            # Verificar si el curso quedó 100% completo y notificar
            curso_obj = contenido.curso
            total_items = CursoContenido.objects.filter(curso=curso_obj).count()
            completed_items = CursoProgreso.objects.filter(
                empleado=request.user, curso=curso_obj
            ).count()
            if total_items > 0 and completed_items >= total_items:
                destinatarios = set()
                for enc in DatosEmpleado.objects.filter(es_encargado_cursos=True, estado='ACTIVA').exclude(id_empleado=request.user.id_empleado):
                    destinatarios.add(enc.id_empleado)
                if curso_obj.creado_por_id and curso_obj.creado_por_id != request.user.id_empleado:
                    destinatarios.add(curso_obj.creado_por_id)
                for dest_id in destinatarios:
                    try:
                        dest = DatosEmpleado.objects.get(pk=dest_id)
                        NotificacionCurso.objects.get_or_create(
                            destinatario=dest,
                            empleado=request.user,
                            curso=curso_obj,
                            defaults={'leida': False},
                        )
                    except DatosEmpleado.DoesNotExist:
                        pass

        return Response({
            'puntaje': intento.puntaje,
            'aprobado': intento.aprobado,
            'correctas': correctas,
            'total_autogradable': total_autogradable,
            'num_intento': intento.num_intento,
            'puntaje_aprobacion': puntaje_aprobacion,
            'marcado_completado': aprobado or es_ultimo_intento,
        }, status=201)

    @action(detail=True, methods=['get'], url_path='mis-intentos')
    def mis_intentos(self, request, pk=None):
        """Empleado ve sus propios intentos en este cuestionario."""
        if not _es_empleado(request.user):
            return Response([])
        intentos = CuestionarioIntento.objects.filter(
            empleado=request.user, contenido_id=pk
        ).order_by('-fecha_intento')
        return Response(CuestionarioIntentoSerializer(intentos, many=True).data)

    @action(detail=True, methods=['get'], url_path='resultados')
    def resultados(self, request, pk=None):
        """Admin/editor ve los resultados de todos los empleados en este cuestionario."""
        if not (_es_superadmin(request.user) or
                (_es_empleado(request.user) and int(getattr(request.user, 'id_permisos', 3)) <= 2)):
            return Response({'error': 'Sin permisos.'}, status=403)
        intentos = CuestionarioIntento.objects.filter(contenido_id=pk).select_related(
            'empleado__persona'
        ).order_by('empleado', '-fecha_intento')
        return Response(CuestionarioIntentoSerializer(intentos, many=True).data)


class NotificacionCursoViewSet(viewsets.ModelViewSet):
    """Notificaciones de curso completado para encargados de cursos."""
    serializer_class = NotificacionCursoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        if not _es_empleado(self.request.user):
            return NotificacionCurso.objects.none()
        return NotificacionCurso.objects.filter(
            destinatario=self.request.user
        ).select_related('empleado__persona', 'curso')

    @action(detail=False, methods=['post'], url_path='marcar-todas-leidas')
    def marcar_todas_leidas(self, request):
        NotificacionCurso.objects.filter(
            destinatario=request.user, leida=False
        ).update(leida=True)
        return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def toggle_encargado_cursos(request):
    """Admin o SuperAdmin activa/desactiva el permiso de encargado de cursos."""
    id_empleado = request.data.get('id_empleado')
    valor = request.data.get('valor')
    if id_empleado is None or valor is None:
        return Response({'error': 'id_empleado y valor son requeridos.'}, status=400)
    try:
        empleado = DatosEmpleado.objects.get(pk=id_empleado)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado.'}, status=404)
    empleado.es_encargado_cursos = bool(valor)
    empleado.save(update_fields=['es_encargado_cursos'])
    return Response({'id_empleado': id_empleado, 'es_encargado_cursos': empleado.es_encargado_cursos})
