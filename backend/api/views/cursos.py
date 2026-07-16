"""
ViewSets de cursos: Curso, CursoContenido, CursoHistorial, NotificacionCurso.
"""
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.db import models as django_models
from django.db.models import Q

from ..models import Curso, CursoModulo, CursoContenido, CursoHistorial, NotificacionCurso, DatosEmpleado, CursoProgreso, CuestionarioIntento, AsignacionFormacion, ExclusionFormacion
from ..serializers import (
    CursoSerializer, CursoModuloSerializer, CursoContenidoSerializer,
    CursoHistorialSerializer, NotificacionCursoSerializer,
    CuestionarioIntentoSerializer, AsignacionFormacionSerializer,
)
from ..permissions import IsAdminOrSuperAdmin, IsEditorOrAbove
from ..file_validation import validate_office_document
from ._utils import get_usuario_nombre, _es_empleado, _es_superadmin

logger = logging.getLogger(__name__)


class CursosPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all()  # requerido por el router para inferir basename
    serializer_class = CursoSerializer
    pagination_class = CursosPagination

    def get_permissions(self):
        write_actions = {'create', 'update', 'partial_update', 'destroy', 'reordenar', 'exportar_calificaciones'}
        if self.action in write_actions:
            return [IsEditorOrAbove()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        base = Curso.objects.all().order_by('orden').prefetch_related('modulos', 'contenidos')

        if _es_superadmin(user):
            return base

        if _es_empleado(user):
            permisos = int(getattr(user, 'id_permisos', 3) or 3)
            if permisos <= 2:  # admin (1) o editor (2): ven todo
                return base
            # Empleado regular: filtrar por visibilidad y por fechas de disponibilidad
            from django.utils import timezone
            today = timezone.now().date()
            qs = base.filter(activo=True)
            area_id  = getattr(user, 'area_id', None)
            # M2M: el empleado pertenece a alguna de las áreas del curso
            area_q = Q(visibilidad='area', areas__id_area=area_id) if area_id else Q(pk__in=[])

            # Nivel de cargo normalizado (igual que en el organigrama)
            from ..views.empleados import _nivel_cargo
            cargo_nombre = ''
            try:
                if user.cargo_id:
                    from ..models import DatosCargo
                    cargo_nombre = DatosCargo.objects.filter(pk=user.cargo_id).values_list('nombre_cargo', flat=True).first() or ''
            except Exception:
                pass
            user_nivel = _nivel_cargo(cargo_nombre)
            # Visibilidad por cargo: respetar las áreas elegidas por el admin.
            # Si el curso no tiene áreas → aplica a todos los empleados con ese nivel.
            # Si tiene áreas → solo empleados en esas áreas.
            if user_nivel != 99:
                cargo_q = Q(visibilidad='cargo', nivel_cargo=user_nivel) & (
                    Q(areas__isnull=True) | Q(areas__id_area=user.area_id)
                )
            else:
                cargo_q = Q(pk__in=[])

            # IDs de cursos asignados directamente a este empleado
            asignados_ids = AsignacionFormacion.objects.filter(
                empleado=user
            ).values_list('curso_id', flat=True)

            # IDs de cursos bloqueados explícitamente para este empleado
            excluidos_ids = ExclusionFormacion.objects.filter(
                empleado=user
            ).values_list('curso_id', flat=True)

            qs = qs.filter(
                Q(visibilidad='todos') |
                area_q |
                cargo_q |
                Q(visibilidad='persona', empleado_asignado=user) |
                Q(id__in=asignados_ids)
            ).exclude(
                id__in=excluidos_ids  # quitar bloqueados explícitamente
            ).distinct()
            # Solo cursos dentro del plazo (inicio ≤ hoy ≤ fin)
            qs = qs.filter(
                Q(fecha_inicio__isnull=True) | Q(fecha_inicio__lte=today)
            ).filter(
                Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=today)
            )
            return qs

        return base

    def perform_create(self, serializer):
        creado_por = self.request.user if _es_empleado(self.request.user) else None
        serializer.save(creado_por=creado_por)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        area_ids = data.pop('area_ids', None) or data.pop('areas', None) or []
        if isinstance(area_ids, str):
            import json as _j
            try: area_ids = _j.loads(area_ids)
            except Exception: area_ids = []
        if not data.get('orden'):
            max_orden = Curso.objects.aggregate(django_models.Max('orden'))['orden__max'] or 0
            data['orden'] = max_orden + 1
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        if area_ids:
            from ..models import DatosArea
            instance.areas.set(DatosArea.objects.filter(id_area__in=area_ids))
        CursoHistorial.objects.create(
            curso=instance,
            curso_nombre=instance.nombre,
            accion='crear',
            descripcion=f"Curso '{instance.nombre}' creado. Visibilidad: {instance.get_visibilidad_display()}",
            usuario_nombre=get_usuario_nombre(request.user)
        )
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_name = instance.nombre
        data = request.data.copy()
        area_ids = data.pop('area_ids', None) or data.pop('areas', None)
        if isinstance(area_ids, str):
            import json as _j
            try: area_ids = _j.loads(area_ids)
            except Exception: area_ids = None
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if area_ids is not None:
            from ..models import DatosArea
            instance.areas.set(DatosArea.objects.filter(id_area__in=area_ids))
        instance.refresh_from_db()
        plazo = ''
        if instance.fecha_inicio or instance.fecha_fin:
            plazo = f" Plazo: {instance.fecha_inicio or '∞'} → {instance.fecha_fin or '∞'}."
        CursoHistorial.objects.create(
            curso=instance,
            curso_nombre=instance.nombre,
            accion='editar',
            descripcion=f"Curso '{old_name}' editado. Nuevo nombre: '{instance.nombre}'. Visibilidad: {instance.get_visibilidad_display()}.{plazo}",
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

    # ── Acciones extras ──────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='modulos')
    def modulos(self, request, pk=None):
        """Devuelve los módulos de un curso específico. Equivalente a /api/curso-modulos/?curso_id=\u003cpk\u003e"""
        curso = self.get_object()
        modulos = CursoModulo.objects.filter(curso=curso).order_by('orden')
        serializer = CursoModuloSerializer(modulos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='por-area')
    def por_area(self, request):
        """Cursos/capacitaciones visibles en un área (para tabla de usuarios admin)."""
        area_id = request.query_params.get('area_id')
        if not area_id:
            return Response({'error': 'area_id requerido.'}, status=400)
        # Muestra cursos/capacitaciones visibles para esta área:
        # - visibilidad='todos': aparece en todas las áreas
        # - tiene esta área en su M2M (sin importar si es visibilidad area/cargo/persona)
        qs = Curso.objects.filter(
            Q(visibilidad='todos') |
            Q(areas__id_area=area_id)
        ).distinct().prefetch_related('areas', 'contenidos')
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['post'], url_path='reordenar')
    def reordenar(self, request):
        """Actualiza el orden de múltiples cursos. Body: [{id, orden}, ...]"""
        items = request.data if isinstance(request.data, list) else request.data.get('orden', [])
        for item in items:
            try:
                Curso.objects.filter(id=item['id']).update(orden=item['orden'])
            except (KeyError, TypeError):
                pass
        return Response({'ok': True})

    @action(detail=True, methods=['get'], url_path='exportar-calificaciones')
    def exportar_calificaciones(self, request, pk=None):
        """Admin/editor: retorna calificaciones de cuestionarios del curso para exportar."""
        curso = self.get_object()
        intentos = (
            CuestionarioIntento.objects
            .filter(curso=curso)
            .select_related('empleado', 'empleado__persona', 'contenido')
            .order_by('empleado', 'contenido', 'num_intento')
        )
        rows = []
        for i in intentos:
            persona = getattr(i.empleado, 'persona', None)
            if persona:
                nombre = f"{getattr(persona, 'primer_nombre', '')} {getattr(persona, 'primer_apellido', '')}".strip()
            else:
                nombre = getattr(i.empleado, 'correo_corporativo', str(i.empleado.id_empleado))
            rows.append({
                'empleado': nombre,
                'correo': getattr(i.empleado, 'correo_corporativo', ''),
                'cuestionario': i.contenido.titulo if i.contenido else '',
                'puntaje': round(float(i.puntaje), 1),
                'aprobado': 'Sí' if i.aprobado else 'No',
                'num_intento': i.num_intento,
                'tiempo_seg': i.tiempo_segundos or 0,
                'fecha': i.fecha_intento.strftime('%Y-%m-%d %H:%M') if i.fecha_intento else '',
            })
        return Response({'curso': curso.nombre, 'intentos': rows})

    @action(detail=False, methods=['get'], url_path='mi-progreso-global')
    def mi_progreso_global(self, request):
        """Devuelve progreso de todos los cursos del empleado + stats de gamificación."""
        if not _es_empleado(request.user):
            return Response({'por_curso': {}, 'stats': {}, 'quizzes': []})

        from django.db.models import Count as DCount, Avg

        # Contenidos completados por curso
        progresos = CursoProgreso.objects.filter(
            empleado=request.user
        ).values('curso_id').annotate(completados=DCount('id'))
        por_curso = {str(p['curso_id']): p['completados'] for p in progresos}

        total_items_completados = sum(por_curso.values())

        # Cursos accesibles con total de contenidos
        cursos_qs = self.get_queryset().annotate(n_contenidos=DCount('contenidos'))
        total_accesibles = cursos_qs.count()
        cursos_completados = sum(
            1 for c in cursos_qs
            if c.n_contenidos > 0 and por_curso.get(str(c.id), 0) >= c.n_contenidos
        )
        cursos_iniciados = sum(
            1 for c in cursos_qs if por_curso.get(str(c.id), 0) > 0
        )

        # Stats de cuestionarios
        intentos_q = CuestionarioIntento.objects.filter(empleado=request.user)
        total_intentos  = intentos_q.count()
        aprobados       = intentos_q.filter(aprobado=True).count()
        avg_puntaje     = intentos_q.aggregate(avg=Avg('puntaje'))['avg'] or 0

        # Mejor puntaje por cuestionario (para logros)
        mejores = list(
            intentos_q.values('contenido_id').annotate(
                mejor=DCount('id'),
                aprobado_alguna=DCount('id', filter=django_models.Q(aprobado=True))
            )
        )
        quizzes_aprobados = sum(1 for m in mejores if m['aprobado_alguna'] > 0)

        return Response({
            'por_curso': por_curso,
            'stats': {
                'cursos_accesibles':  total_accesibles,
                'cursos_iniciados':   cursos_iniciados,
                'cursos_completados': cursos_completados,
                'items_completados':  total_items_completados,
                'quizzes_aprobados':  quizzes_aprobados,
                'total_intentos':     total_intentos,
                'promedio_puntaje':   round(float(avg_puntaje), 1),
            },
        })

    @action(detail=False, methods=['get'], url_path='resumen-empleados')
    def resumen_empleados(self, request):
        """Admin/editor: resumen de progreso de todos los empleados en todos los cursos."""
        if not (
            _es_superadmin(request.user) or
            (_es_empleado(request.user) and int(getattr(request.user, 'id_permisos', 3)) <= 2)
        ):
            return Response({'error': 'Sin permisos.'}, status=403)

        from django.db.models import Count, Max, Q as DQ
        from ..models import DatosArea, DatosCargo

        area_id  = request.query_params.get('area_id')
        cargo_id = request.query_params.get('cargo_id')

        empleados_qs = DatosEmpleado.objects.filter(estado='ACTIVA').select_related('persona')
        if area_id:
            empleados_qs = empleados_qs.filter(area_id=area_id)
        if cargo_id:
            empleados_qs = empleados_qs.filter(cargo_id=cargo_id)

        # Diccionarios de nombres para resolución eficiente (evita N+1 queries)
        area_names  = dict(DatosArea.objects.values_list('id_area', 'nombre_area'))
        cargo_names = dict(DatosCargo.objects.values_list('id_cargo', 'nombre_cargo'))

        # Todos los cursos activos con conteo de contenidos
        cursos = list(
            Curso.objects.filter(activo=True)
            .annotate(n_contenidos=Count('contenidos', distinct=True))
            .values('id', 'nombre', 'tipo', 'n_contenidos')
            .order_by('orden')
        )

        # Progreso: contenidos completados por empleado×curso
        prog_map = {}
        for p in CursoProgreso.objects.filter(empleado__in=empleados_qs).values(
            'empleado_id', 'curso_id'
        ).annotate(completados=Count('id')):
            prog_map.setdefault(p['empleado_id'], {})[p['curso_id']] = p['completados']

        # Mejor intento de cuestionario por empleado×contenido
        intento_map = {}
        for i in CuestionarioIntento.objects.filter(empleado__in=empleados_qs).values(
            'empleado_id', 'curso_id', 'contenido_id', 'contenido__titulo'
        ).annotate(
            mejor_puntaje=Max('puntaje'),
            aprobados=Count('id', filter=DQ(aprobado=True)),
            num_intentos=Count('id'),
        ):
            intento_map.setdefault(i['empleado_id'], {}).setdefault(i['curso_id'], []).append({
                'cuestionario':  i['contenido__titulo'] or '—',
                'mejor_puntaje': round(float(i['mejor_puntaje']), 1),
                'aprobado':      i['aprobados'] > 0,
                'num_intentos':  i['num_intentos'],
            })

        result = []
        for emp in empleados_qs:
            persona = getattr(emp, 'persona', None)
            nombre = (
                f"{getattr(persona, 'primer_nombre', '')} {getattr(persona, 'primer_apellido', '')}".strip()
                if persona else emp.correo_corporativo or str(emp.id_empleado)
            )

            emp_prog   = prog_map.get(emp.id_empleado, {})
            emp_intent = intento_map.get(emp.id_empleado, {})

            cursos_emp = []
            for c in cursos:
                cid         = c['id']
                total       = c['n_contenidos']
                completados = emp_prog.get(cid, 0)
                quizzes     = emp_intent.get(cid, [])
                if completados > 0 or quizzes:
                    cursos_emp.append({
                        'curso_id':         cid,
                        'nombre':           c['nombre'],
                        'tipo':             c['tipo'],
                        'total_contenidos': total,
                        'completados':      completados,
                        'pct':              round(completados / total * 100) if total > 0 else 0,
                        'completo':         total > 0 and completados >= total,
                        'quizzes':          quizzes,
                    })

            result.append({
                'id_empleado':        emp.id_empleado,
                'nombre':             nombre,
                'correo':             emp.correo_corporativo or '',
                'area_id':            emp.area_id,
                'area':               area_names.get(emp.area_id, '') if emp.area_id else '',
                'cargo_id':           emp.cargo_id,
                'cargo':              cargo_names.get(emp.cargo_id, '') if emp.cargo_id else '',
                'cursos_totales':     len(cursos),
                'cursos_iniciados':   len(cursos_emp),
                'cursos_completados': sum(1 for c in cursos_emp if c['completo']),
                'cursos':             cursos_emp,
            })

        return Response(result)

    @action(detail=True, methods=['get'], url_path='mi-progreso')
    def mi_progreso(self, request, pk=None):
        """Progreso del empleado en el curso: completados con fecha, resumen de quizzes y calificación."""
        if not _es_empleado(request.user):
            return Response({'completados': [], 'quizzes': {}, 'calificacion': None})

        from django.db.models import Max, Q as DQ

        progresos = CursoProgreso.objects.filter(
            empleado=request.user, curso_id=pk
        ).values('contenido_id', 'fecha_completado')

        completados = [
            {'id': p['contenido_id'], 'fecha': p['fecha_completado'].isoformat()}
            for p in progresos
        ]

        intentos = CuestionarioIntento.objects.filter(
            empleado=request.user, curso_id=pk
        ).values('contenido_id').annotate(
            mejor_puntaje=Max('puntaje'),
            aprobados=django_models.Count('id', filter=DQ(aprobado=True)),
            num_intentos=django_models.Count('id'),
        )

        quizzes = {
            str(i['contenido_id']): {
                'mejor_puntaje': round(float(i['mejor_puntaje']), 1),
                'aprobado':      i['aprobados'] > 0,
                'num_intentos':  i['num_intentos'],
            }
            for i in intentos
        }

        calificacion = None
        if quizzes:
            calificacion = round(sum(v['mejor_puntaje'] for v in quizzes.values()) / len(quizzes), 1)

        return Response({
            'completados': completados,
            'quizzes':     quizzes,
            'calificacion': calificacion,
        })

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
        if contenido.tipo == 'cuestionario':
            return Response(
                {'error': 'Los cuestionarios se completan respondiendo, no marcando manualmente.'},
                status=400,
            )
        progreso, created = CursoProgreso.objects.get_or_create(
            empleado=request.user, contenido=contenido,
            defaults={'curso_id': pk}
        )
        if not created:
            progreso.delete()
            return Response({'completado': False})

        total_items = CursoContenido.objects.filter(curso_id=pk).count()
        completed_items = CursoProgreso.objects.filter(empleado=request.user, curso_id=pk).count()
        curso_completado = total_items > 0 and completed_items >= total_items
        if curso_completado:
            curso_obj = self.get_object()
            destinatarios = set()
            for enc in DatosEmpleado.objects.filter(es_encargado_cursos=True, estado='ACTIVA').exclude(id_empleado=request.user.id_empleado):
                destinatarios.add(enc.id_empleado)
            if curso_obj.creado_por_id and curso_obj.creado_por_id != request.user.id_empleado:
                destinatarios.add(curso_obj.creado_por_id)
            for dest_id in destinatarios:
                try:
                    dest = DatosEmpleado.objects.get(pk=dest_id)
                    NotificacionCurso.objects.get_or_create(
                        destinatario=dest, empleado=request.user, curso=curso_obj,
                        defaults={'leida': False},
                    )
                except DatosEmpleado.DoesNotExist:
                    pass

        return Response({'completado': True, 'curso_completado': curso_completado})


class CursoHistorialViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CursoHistorial.objects.all()
    serializer_class = CursoHistorialSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        curso_id = self.request.query_params.get('curso_id')
        if curso_id:
            qs = qs.filter(curso_id=curso_id)
        try:
            limit = int(self.request.query_params.get('limit', 100))
        except (ValueError, TypeError):
            limit = 100
        return qs[:limit]


class CursoContenidoViewSet(viewsets.ModelViewSet):
    queryset = CursoContenido.objects.all().order_by('orden')
    serializer_class = CursoContenidoSerializer

    def get_permissions(self):
        write_actions = {'create', 'update', 'partial_update', 'destroy', 'reordenar'}
        if self.action in write_actions:
            return [IsEditorOrAbove()]
        return [IsAuthenticated()]

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
        archivo = request.FILES.get('archivo')
        if archivo:
            try:
                validate_office_document(archivo)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            archivo.seek(0)
            archivo_bytes = archivo.read()
            archivo.seek(0)
        self.perform_create(serializer)
        instance = serializer.instance
        if archivo:
            from ..n8n_gateway import subir_intranet_async
            subir_intranet_async('cursos', archivo.name, archivo_bytes, archivo.content_type)
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

    @action(detail=False, methods=['post'], url_path='reordenar')
    def reordenar(self, request):
        """Actualiza el orden de contenidos. Body: [{id, orden}, ...]"""
        items = request.data if isinstance(request.data, list) else request.data.get('orden', [])
        for item in items:
            try:
                CursoContenido.objects.filter(id=item['id']).update(orden=item['orden'])
            except (KeyError, TypeError):
                pass
        return Response({'ok': True})

    @action(detail=True, methods=['post'], url_path='enviar-respuestas')
    def enviar_respuestas(self, request, pk=None):
        """Empleado envía sus respuestas. Calcula puntaje y guarda el intento."""
        if not _es_empleado(request.user):
            return Response({'error': 'Solo empleados pueden responder cuestionarios.'}, status=400)
        contenido = self.get_object()
        if contenido.tipo != 'cuestionario':
            return Response({'error': 'Este contenido no es un cuestionario.'}, status=400)

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
                if enviada is not None and correcta is not None and int(enviada) == int(correcta):
                    correctas += 1
            elif p.get('tipo') == 'verdadero_falso':
                if str(enviada).lower() == str(correcta).lower():
                    correctas += 1

        if total_autogradable > 0:
            puntaje = correctas / total_autogradable * 100
        else:
            # Solo preguntas texto_libre: aprueba si el empleado respondió todas (no vacías).
            textos = [p for p in preguntas if p.get('tipo') == 'texto_libre']
            respondidas = sum(1 for p in textos if str(respuestas_enviadas.get(p['id'], '')).strip())
            puntaje = 100.0 if textos and respondidas == len(textos) else 0.0
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

        es_ultimo_intento = contenido.max_intentos > 0 and num_intento >= contenido.max_intentos
        if aprobado or es_ultimo_intento:
            CursoProgreso.objects.get_or_create(
                empleado=request.user,
                contenido=contenido,
                defaults={'curso': contenido.curso},
            )
            curso_obj = contenido.curso
            total_items = CursoContenido.objects.filter(curso=curso_obj).count()
            completed_items = CursoProgreso.objects.filter(empleado=request.user, curso=curso_obj).count()
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
                            destinatario=dest, empleado=request.user, curso=curso_obj,
                            defaults={'leida': False},
                        )
                    except DatosEmpleado.DoesNotExist:
                        pass

        # Incluir respuestas correctas en la respuesta POST (no en el GET) para que
        # el frontend pueda mostrar la revisión sin exponer las claves antes del envío
        respuestas_correctas = {
            str(p['id']): p.get('correcta')
            for p in preguntas
            if p.get('tipo') != 'texto_libre'
        }

        return Response({
            'puntaje': intento.puntaje,
            'aprobado': intento.aprobado,
            'correctas': correctas,
            'total_autogradable': total_autogradable,
            'num_intento': intento.num_intento,
            'puntaje_aprobacion': puntaje_aprobacion,
            'marcado_completado': aprobado or es_ultimo_intento,
            'respuestas_correctas': respuestas_correctas,
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


class CursoModuloViewSet(viewsets.ModelViewSet):
    """CRUD de módulos de un curso. Filtrar por ?curso_id=X"""
    serializer_class = CursoModuloSerializer
    queryset = CursoModulo.objects.all().order_by('orden')

    def get_permissions(self):
        if self.action in {'create', 'update', 'partial_update', 'destroy', 'reordenar'}:
            return [IsEditorOrAbove()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        curso_id = self.request.query_params.get('curso_id')
        if curso_id:
            qs = qs.filter(curso_id=curso_id)
        return qs

    def perform_create(self, serializer):
        curso_id = self.request.data.get('curso')
        max_orden = CursoModulo.objects.filter(curso_id=curso_id).aggregate(
            django_models.Max('orden')
        )['orden__max'] or 0
        serializer.save(orden=max_orden + 1)

    @action(detail=False, methods=['post'], url_path='reordenar')
    def reordenar(self, request):
        """Actualiza el orden de módulos. Body: [{id, orden}, ...]"""
        items = request.data if isinstance(request.data, list) else request.data.get('orden', [])
        for item in items:
            try:
                CursoModulo.objects.filter(id=item['id']).update(orden=item['orden'])
            except (KeyError, TypeError):
                pass
        return Response({'ok': True})


class AsignacionFormacionViewSet(viewsets.ModelViewSet):
    """CRUD de asignaciones individuales curso ↔ empleado."""
    serializer_class = AsignacionFormacionSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = AsignacionFormacion.objects.select_related(
            'empleado__persona', 'curso', 'asignado_por__persona'
        )
        curso_id    = self.request.query_params.get('curso_id')
        empleado_id = self.request.query_params.get('empleado_id')
        area_id     = self.request.query_params.get('area_id')
        if curso_id:
            qs = qs.filter(curso_id=curso_id)
        if empleado_id:
            qs = qs.filter(empleado_id=empleado_id)
        if area_id:
            qs = qs.filter(empleado__area_id=area_id)
        return qs

    def perform_create(self, serializer):
        asignado_por = self.request.user if _es_empleado(self.request.user) else None
        serializer.save(asignado_por=asignado_por)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        """Alterna la asignación de un curso a un empleado. Body: {empleado_id, curso_id}"""
        empleado_id = request.data.get('empleado_id')
        curso_id    = request.data.get('curso_id')
        if not empleado_id or not curso_id:
            return Response({'error': 'empleado_id y curso_id requeridos.'}, status=400)
        try:
            emp   = DatosEmpleado.objects.get(pk=empleado_id)
            curso = Curso.objects.get(pk=curso_id)
        except (DatosEmpleado.DoesNotExist, Curso.DoesNotExist):
            return Response({'error': 'Empleado o curso no encontrado.'}, status=404)

        asignado_por = self.request.user if _es_empleado(self.request.user) else None
        asig, created = AsignacionFormacion.objects.get_or_create(
            empleado=emp, curso=curso,
            defaults={'asignado_por': asignado_por}
        )
        if not created:
            asig.delete()
            return Response({'asignado': False, 'empleado_id': empleado_id, 'curso_id': curso_id})
        return Response({'asignado': True, 'empleado_id': empleado_id, 'curso_id': curso_id, 'id': asig.id}, status=201)

    @action(detail=False, methods=['post'], url_path='batch-asignar')
    def batch_asignar(self, request):
        """Asigna un curso a múltiples empleados. Body: {curso_id, empleado_ids: [...]}"""
        curso_id     = request.data.get('curso_id')
        empleado_ids = request.data.get('empleado_ids', [])
        if not curso_id or not empleado_ids:
            return Response({'error': 'curso_id y empleado_ids requeridos.'}, status=400)
        try:
            curso = Curso.objects.get(pk=curso_id)
        except Curso.DoesNotExist:
            return Response({'error': 'Curso no encontrado.'}, status=404)

        asignado_por = self.request.user if _es_empleado(self.request.user) else None
        creados = 0
        for eid in empleado_ids:
            _, created = AsignacionFormacion.objects.get_or_create(
                empleado_id=eid, curso=curso,
                defaults={'asignado_por': asignado_por}
            )
            if created:
                creados += 1
        return Response({'creados': creados, 'curso_id': curso_id})

    @action(detail=False, methods=['get'], url_path='resumen-area')
    def resumen_area(self, request):
        """
        Devuelve mapa de asignaciones Y exclusiones para un área.
        Response: { asignaciones: {emp_id: [curso_id]}, exclusiones: {emp_id: [curso_id]} }
        """
        area_id = request.query_params.get('area_id')
        if not area_id:
            return Response({'error': 'area_id requerido.'}, status=400)

        asigs = AsignacionFormacion.objects.filter(
            empleado__area_id=area_id
        ).values('empleado_id', 'curso_id', 'id')
        mapa_asig = {}
        for a in asigs:
            mapa_asig.setdefault(str(a['empleado_id']), []).append(a['curso_id'])

        excls = ExclusionFormacion.objects.filter(
            empleado__area_id=area_id
        ).values('empleado_id', 'curso_id')
        mapa_excl = {}
        for e in excls:
            mapa_excl.setdefault(str(e['empleado_id']), []).append(e['curso_id'])

        return Response({'asignaciones': mapa_asig, 'exclusiones': mapa_excl})

    @action(detail=False, methods=['post'], url_path='toggle-exclusion')
    def toggle_exclusion(self, request):
        """Alterna el bloqueo de un curso para un empleado. Body: {empleado_id, curso_id}"""
        empleado_id = request.data.get('empleado_id')
        curso_id    = request.data.get('curso_id')
        if not empleado_id or not curso_id:
            return Response({'error': 'empleado_id y curso_id requeridos.'}, status=400)
        try:
            emp   = DatosEmpleado.objects.get(pk=empleado_id)
            curso = Curso.objects.get(pk=curso_id)
        except (DatosEmpleado.DoesNotExist, Curso.DoesNotExist):
            return Response({'error': 'Empleado o curso no encontrado.'}, status=404)

        excl_por = request.user if _es_empleado(request.user) else None
        excl, created = ExclusionFormacion.objects.get_or_create(
            empleado=emp, curso=curso,
            defaults={'excluido_por': excl_por}
        )
        if not created:
            excl.delete()
            return Response({'bloqueado': False, 'empleado_id': empleado_id, 'curso_id': curso_id})
        return Response({'bloqueado': True, 'empleado_id': empleado_id, 'curso_id': curso_id}, status=201)
