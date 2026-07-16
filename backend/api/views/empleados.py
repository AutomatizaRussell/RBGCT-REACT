"""
ViewSets y endpoints de empleados, áreas, cargos y perfil de usuario.
"""
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from django.db.models import Q, Count
import bcrypt

from ..models import DatosArea, DatosCargo, SuperAdmin, DatosEmpleado, DatosContacto, Persona, DatosAcademicos, MovimientoLaboral, Hijo
from ..serializers import (
    DatosAreaSerializer, DatosCargoSerializer, SuperAdminSerializer, DatosEmpleadoSerializer,
    DatosAcademicosSerializer, MovimientoLaboralSerializer,
)
from ..permissions import IsSuperAdminUser
from ..file_validation import validate_pdf_image, validate_office_document

from ._utils import _es_superadmin, _es_empleado


def _nivel_cargo(nombre):
    n = (nombre or '').upper()
    if 'SOCIO' in n:                                      return 0
    if 'GERENTE' in n:                                    return 1
    if 'LÍDER' in n or 'LIDER' in n or 'SEMI' in n:      return 3
    if 'SENIOR' in n:                                     return 2
    if 'ANALISTA' in n or 'ASISTENTE' in n:               return 4
    return 99


_NIVEL_LABEL = {0: 'Socio', 1: 'Gerente Asociado', 2: 'Senior', 3: 'Líder de equipo', 4: 'Analista'}

logger = logging.getLogger(__name__)


class DatosAreaViewSet(viewsets.ModelViewSet):
    queryset = DatosArea.objects.all()
    serializer_class = DatosAreaSerializer


class DatosCargoViewSet(viewsets.ModelViewSet):
    queryset = DatosCargo.objects.all()
    serializer_class = DatosCargoSerializer


class SuperAdminViewSet(viewsets.ModelViewSet):
    queryset = SuperAdmin.objects.all()
    serializer_class = SuperAdminSerializer

    @action(detail=False, methods=['get'])
    def by_email(self, request):
        email = request.query_params.get('email')
        if not email:
            return Response({'error': 'Email requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            admin = SuperAdmin.objects.get(email=email)
            serializer = self.get_serializer(admin)
            return Response(serializer.data)
        except SuperAdmin.DoesNotExist:
            return Response(None, status=status.HTTP_204_NO_CONTENT)


class DatosEmpleadoViewSet(viewsets.ModelViewSet):
    queryset = DatosEmpleado.objects.select_related(
        'persona', 'persona__contacto', 'area', 'cargo'
    ).prefetch_related(
        'persona__hijos',           # Evita N+1 en hijos
        'persona__academicos',      # Evita N+1 en académicos
        'movimientos',              # Evita N+1 en historial laboral
    ).defer('password_hash').order_by('-estado', 'persona__primer_apellido', 'persona__primer_nombre')
    serializer_class = DatosEmpleadoSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        """Actualizar empleado con validación de permisos de un solo uso"""
        import bcrypt
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Verificar si el usuario está editando su propio perfil
        is_own_profile = False
        if hasattr(request.user, 'id_empleado'):
            is_own_profile = str(instance.id_empleado) == str(request.user.id_empleado)
        elif hasattr(request.user, 'id'):
            # Para SuperAdmin, comparar de otra forma o siempre permitir
            is_own_profile = False  # SuperAdmin nunca edita su propio perfil por este endpoint

        # Preparar datos para el serializer
        data = request.data.copy()

        revocar_permiso = (
            not instance.primer_login and instance.permitir_edicion_datos and is_own_profile
        )
        if revocar_permiso:
            data['permitir_edicion_datos'] = False

        serializer = self.get_serializer(instance, data=data, partial=partial)

        if not serializer.is_valid():
            return Response(
                {'error': 'Datos inválidos', 'detalles': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_update(serializer)

        if revocar_permiso:
            instance.datos_completados = True
            instance.save(update_fields=['datos_completados'])

        # Preparar respuesta con mensaje si se revocó el permiso
        response_data = serializer.data.copy()
        if not instance.primer_login and is_own_profile:
            response_data['mensaje'] = 'Datos actualizados exitosamente. El permiso de edición ha sido revocado. Contacta al administrador para futuras actualizaciones.'

        return Response(response_data)

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """
        Cambiar estado del empleado (ACTIVA/INACTIVO)
        Espera: {estado: 'ACTIVA' o 'INACTIVO'}
        """
        try:
            empleado = self.get_object()
            nuevo_estado = request.data.get('estado')

            # Compatibilidad: aceptar INACTIVA enviado por clientes antiguos.
            if nuevo_estado == 'INACTIVA':
                nuevo_estado = 'INACTIVO'

            if nuevo_estado not in ['ACTIVA', 'INACTIVO']:
                return Response(
                    {'error': 'Estado inválido. Use ACTIVA o INACTIVO'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            empleado.estado = nuevo_estado
            empleado.save()

            logger.info(f"[EMPLEADO] Estado cambiado: {empleado.correo_corporativo} -> {nuevo_estado}")

            return Response({
                'message': f'Estado actualizado a {nuevo_estado}',
                'id_empleado': empleado.id_empleado,
                'estado': empleado.estado
            })

        except DatosEmpleado.DoesNotExist:
            return Response(
                {'error': 'Empleado no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"[EMPLEADO] Error cambiando estado: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def by_email(self, request):
        email = request.query_params.get('email')
        if not email:
            return Response({'error': 'Email requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            empleado = DatosEmpleado.objects.get(correo_corporativo=email, estado='ACTIVA')
            serializer = self.get_serializer(empleado)
            return Response(serializer.data)
        except DatosEmpleado.DoesNotExist:
            return Response(None, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def activos(self, request):
        empleados = DatosEmpleado.objects.filter(estado='ACTIVA')
        serializer = self.get_serializer(empleados, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def inactivos(self, request):
        empleados = DatosEmpleado.objects.filter(estado='INACTIVO')
        serializer = self.get_serializer(empleados, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request, pk=None):
        """Retorna el historial de movimientos laborales del empleado, ordenado del más reciente al más antiguo."""
        empleado = self.get_object()
        movimientos = MovimientoLaboral.objects.filter(empleado=empleado).order_by('-fecha_movimiento', '-created_at')
        serializer = MovimientoLaboralSerializer(movimientos, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def empleado_me(request):
    """Devuelve el empleado del usuario autenticado."""
    user = request.user
    if _es_superadmin(user):
        return Response({
            'id': str(user.id),
            'email': user.email,
            'nombre': user.nombre,
            'apellido': user.apellido,
            'type': 'superadmin',
        })
    if _es_empleado(user):
        try:
            empleado = DatosEmpleado.objects.select_related(
                'persona', 'persona__contacto', 'area', 'cargo'
            ).prefetch_related(
                'persona__hijos', 'persona__academicos', 'movimientos'
            ).get(id_empleado=user.id_empleado)
            serializer = DatosEmpleadoSerializer(empleado)
            return Response(serializer.data)
        except DatosEmpleado.DoesNotExist:
            return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'error': 'Usuario no reconocido'}, status=status.HTTP_403_FORBIDDEN)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def actualizar_mi_persona(request):
    """Permite al empleado actualizar sus datos personales (Persona model)."""
    if not _es_empleado(request.user):
        return Response({'error': 'Solo empleados pueden usar este endpoint'}, status=status.HTTP_403_FORBIDDEN)

    try:
        empleado = DatosEmpleado.objects.get(id_empleado=request.user.id_empleado)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    campos_persona = [
        'apodo', 'sexo', 'tipo_sangre', 'estado_civil',
        'ciudad_nacimiento', 'departamento_nacimiento', 'pais_nacimiento', 'nacionalidad',
        'estrato_socioeconomico', 'tipo_vivienda',
        'tiene_discapacidad', 'descripcion_discapacidad',
        'tiene_hijos', 'numero_hijos',
        'tiene_vehiculo', 'tipo_vehiculo', 'placa_vehiculo',
    ]

    persona = empleado.persona
    for campo in campos_persona:
        if campo in request.data:
            valor = request.data[campo]
            if campo in ('tiene_discapacidad', 'tiene_hijos', 'tiene_vehiculo'):
                setattr(persona, campo, bool(valor))
            elif campo in ('estrato_socioeconomico', 'numero_hijos'):
                setattr(persona, campo, int(valor) if valor not in ('', None) else None)
            else:
                setattr(persona, campo, valor or None)
    persona.save()

    empleado_update_fields = ['datos_persona_completados']
    empleado.datos_persona_completados = True
    if empleado.permitir_edicion_datos:
        empleado.permitir_edicion_datos = False
        empleado_update_fields.append('permitir_edicion_datos')
    if 'fecha_ingreso' in request.data:
        empleado.fecha_ingreso = request.data['fecha_ingreso'] or None
        empleado_update_fields.append('fecha_ingreso')
    empleado.save(update_fields=empleado_update_fields)

    return Response({'ok': True})


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def certificado_discapacidad(request):
    """Subir (POST) o eliminar (DELETE) el certificado de discapacidad del empleado autenticado."""
    if not _es_empleado(request.user):
        return Response({'error': 'Solo empleados pueden usar este endpoint'}, status=status.HTTP_403_FORBIDDEN)
    try:
        empleado = DatosEmpleado.objects.get(id_empleado=request.user.id_empleado)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    persona = empleado.persona

    if request.method == 'DELETE':
        if persona.certificado_discapacidad:
            persona.certificado_discapacidad.delete(save=False)
            persona.certificado_discapacidad = None
            persona.save(update_fields=['certificado_discapacidad'])
        return Response({'ok': True})

    archivo = request.FILES.get('certificado')
    if not archivo:
        return Response({'error': 'No se recibió ningún archivo'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_pdf_image(archivo)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    if persona.certificado_discapacidad:
        persona.certificado_discapacidad.delete(save=False)

    archivo.seek(0)
    archivo_bytes = archivo.read()
    archivo.seek(0)

    persona.certificado_discapacidad = archivo
    persona.save(update_fields=['certificado_discapacidad'])

    from ..n8n_gateway import subir_intranet_async
    subir_intranet_async('datos_academicos', archivo.name, archivo_bytes, archivo.content_type)

    return Response({'ok': True, 'url': persona.certificado_discapacidad.url})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def mis_hijos(request):
    """Lista (GET) o crea (POST) un hijo del empleado autenticado."""
    if not _es_empleado(request.user):
        return Response({'error': 'Solo empleados'}, status=status.HTTP_403_FORBIDDEN)
    try:
        empleado = DatosEmpleado.objects.get(id_empleado=request.user.id_empleado)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    persona = empleado.persona

    if request.method == 'GET':
        hijos = persona.hijos.all().values(
            'id', 'nombre', 'tipo_documento', 'numero_identificacion', 'fecha_nacimiento', 'sexo'
        )
        return Response(list(hijos))

    data = request.data
    if not data.get('nombre'):
        return Response({'error': 'El nombre es obligatorio'}, status=status.HTTP_400_BAD_REQUEST)

    hijo = Hijo.objects.create(
        persona=persona,
        nombre=data.get('nombre', ''),
        tipo_documento=data.get('tipo_documento', 'RC'),
        numero_identificacion=data.get('numero_identificacion') or None,
        fecha_nacimiento=data.get('fecha_nacimiento') or None,
        sexo=data.get('sexo') or None,
    )
    return Response({
        'id': hijo.id, 'nombre': hijo.nombre,
        'tipo_documento': hijo.tipo_documento,
        'numero_identificacion': hijo.numero_identificacion,
        'fecha_nacimiento': hijo.fecha_nacimiento,
        'sexo': hijo.sexo,
    }, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def mi_hijo_detalle(request, hijo_id):
    """Actualiza (PATCH) o elimina (DELETE) un hijo del empleado autenticado."""
    if not _es_empleado(request.user):
        return Response({'error': 'Solo empleados'}, status=status.HTTP_403_FORBIDDEN)
    try:
        empleado = DatosEmpleado.objects.get(id_empleado=request.user.id_empleado)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    try:
        hijo = Hijo.objects.get(id=hijo_id, persona=empleado.persona)
    except Hijo.DoesNotExist:
        return Response({'error': 'Hijo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        hijo.delete()
        return Response({'ok': True})

    data = request.data
    for campo in ('nombre', 'tipo_documento', 'numero_identificacion', 'fecha_nacimiento', 'sexo'):
        if campo in data:
            setattr(hijo, campo, data[campo] or None if campo != 'nombre' else data[campo])
    hijo.save()
    return Response({'ok': True})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def actualizar_mi_contacto(request):
    """Permite al empleado autenticado actualizar sus propios datos de contacto."""
    if not _es_empleado(request.user):
        return Response({'error': 'Solo empleados pueden usar este endpoint'}, status=status.HTTP_403_FORBIDDEN)

    try:
        empleado = DatosEmpleado.objects.get(id_empleado=request.user.id_empleado)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    campos_contacto = [
        'correo_personal', 'telefono',
        'pais_residencia', 'departamento_residencia', 'municipio_residencia', 'direccion', 'detalles_residencia',
        'telefono_emergencia', 'nombre_contacto_emergencia', 'parentesco_emergencia',
    ]
    contacto_data = {c: request.data[c] for c in campos_contacto if c in request.data}

    if contacto_data:
        from django.db import transaction
        with transaction.atomic():
            contacto, _ = DatosContacto.objects.get_or_create(persona=empleado.persona)
            for campo, valor in contacto_data.items():
                setattr(contacto, campo, valor or None)
            contacto.save()

    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([UserRateThrottle])
def ping_actividad(request):
    """
    Actualiza la última actividad del usuario autenticado.
    Se aplica cooldown para evitar escrituras innecesarias en DB.
    """
    from django.utils import timezone
    from django.core.cache import cache
    user = request.user
    now = timezone.now()

    if _es_empleado(user):
        if getattr(user, 'estado', None) != 'ACTIVA':
            return Response({'error': 'Usuario inactivo'}, status=status.HTTP_403_FORBIDDEN)
        cache_key = f'api:ping:last-write:empleado:{user.id_empleado}'
        if not cache.get(cache_key):
            user.ultima_actividad = now
            user.save(update_fields=['ultima_actividad'])
            cache.set(cache_key, True, timeout=60)
        return Response({
            'message': 'Actividad actualizada',
            'user': f"{user.primer_nombre} {user.primer_apellido}",
            'timestamp': now.isoformat()
        })

    if _es_superadmin(user):
        if getattr(user, 'estado', None) != 'ACTIVA':
            return Response({'error': 'Usuario inactivo'}, status=status.HTTP_403_FORBIDDEN)
        cache_key = f'api:ping:last-write:superadmin:{user.id}'
        if not cache.get(cache_key):
            user.last_login = now
            user.save(update_fields=['last_login'])
            cache.set(cache_key, True, timeout=60)
        return Response({
            'message': 'Actividad actualizada',
            'user': f"{user.nombre} {user.apellido}",
            'timestamp': now.isoformat()
        })

    return Response({'error': 'Usuario no autorizado'}, status=status.HTTP_403_FORBIDDEN)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organigrama_general(request):
    """Devuelve el organigrama completo de TODAS las áreas con sus empleados."""
    if not _es_empleado(request.user) and not _es_superadmin(request.user):
        return Response({'error': 'Solo empleados'}, status=status.HTTP_403_FORBIDDEN)

    # Obtener todas las áreas activas con empleados activos
    areas = DatosArea.objects.filter(
        datosempleado__estado='ACTIVA'
    ).distinct().order_by('nombre_area')

    resultado = []

    for area in areas:
        # Empleados activos de esta área
        empleados = DatosEmpleado.objects.filter(
            estado='ACTIVA',
            area=area
        ).select_related('persona', 'cargo').order_by('cargo__nombre_cargo')

        if not empleados.exists():
            continue

        # Agrupar por nivel de cargo
        niveles = {}
        for e in empleados:
            if not e.cargo or not e.persona:
                continue
            niv = _nivel_cargo(e.cargo.nombre_cargo)
            if niv == 99:
                continue
            niveles.setdefault(niv, []).append({
                'id': e.id_empleado,
                'nombre': e.persona.nombre_completo,
                'cargo': e.cargo.nombre_cargo,
                'correo': e.correo_corporativo,
            })

        cadena = [
            {'nivel': niv, 'label': _NIVEL_LABEL.get(niv, 'Otro'), 'personas': personas}
            for niv, personas in sorted(niveles.items())
        ]

        if cadena:
            resultado.append({
                'id': area.id_area,
                'nombre': area.nombre_area,
                'cadena': cadena,
            })

    return Response({
        'areas': resultado,
        'total_areas': len(resultado),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mi_organigrama(request):
    """Devuelve la cadena jerárquica del empleado autenticado dentro de su área."""
    if not _es_empleado(request.user):
        return Response({'error': 'Solo empleados'}, status=status.HTTP_403_FORBIDDEN)

    try:
        yo = DatosEmpleado.objects.select_related('persona', 'area', 'cargo').get(
            id_empleado=request.user.id_empleado
        )
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    mi_nivel = _nivel_cargo(yo.cargo.nombre_cargo if yo.cargo else '')
    mi_area_id = yo.area_id

    todos = DatosEmpleado.objects.filter(estado='ACTIVA').select_related('persona', 'cargo', 'area')

    niveles = {}
    for e in todos:
        if not e.cargo or not e.persona:
            continue
        niv = _nivel_cargo(e.cargo.nombre_cargo)
        if niv == 99:
            continue
        if niv != 0 and e.area_id != mi_area_id:
            continue
        niveles.setdefault(niv, []).append({
            'id': e.id_empleado,
            'nombre': e.persona.nombre_completo,
            'cargo': e.cargo.nombre_cargo,
            'es_yo': e.id_empleado == yo.id_empleado,
        })

    cadena = [
        {'nivel': niv, 'label': _NIVEL_LABEL.get(niv, 'Otro'), 'personas': personas}
        for niv, personas in sorted(niveles.items())
    ]

    return Response({
        'area': yo.area.nombre_area if yo.area else None,
        'mi_nivel': mi_nivel,
        'mi_nivel_label': _NIVEL_LABEL.get(mi_nivel, 'Otro'),
        'cadena': cadena,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def mis_academicos(request):
    """GET: lista los estudios del empleado autenticado. POST: agrega uno nuevo."""
    if not _es_empleado(request.user):
        return Response({'error': 'Solo empleados pueden usar este endpoint'}, status=status.HTTP_403_FORBIDDEN)

    try:
        empleado = DatosEmpleado.objects.get(id_empleado=request.user.id_empleado)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    persona = empleado.persona

    if request.method == 'GET':
        registros = DatosAcademicos.objects.filter(persona=persona)
        serializer = DatosAcademicosSerializer(registros, many=True)
        return Response(serializer.data)

    serializer = DatosAcademicosSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    diploma = request.FILES.get('diploma')
    if diploma:
        try:
            validate_pdf_image(diploma)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        diploma.seek(0)
        diploma_bytes = diploma.read()
        diploma.seek(0)

    serializer.save(persona=persona)

    if not empleado.datos_academicos_completados:
        empleado.datos_academicos_completados = True
        empleado.save(update_fields=['datos_academicos_completados'])

    if diploma:
        from ..n8n_gateway import subir_intranet_async
        subir_intranet_async('datos_academicos', diploma.name, diploma_bytes, diploma.content_type)

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def mis_academicos_detalle(request, pk):
    """PATCH: edita un estudio. DELETE: lo elimina. Solo el propio empleado."""
    if not _es_empleado(request.user):
        return Response({'error': 'Solo empleados pueden usar este endpoint'}, status=status.HTTP_403_FORBIDDEN)

    try:
        empleado = DatosEmpleado.objects.get(id_empleado=request.user.id_empleado)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    try:
        registro = DatosAcademicos.objects.get(pk=pk, persona=empleado.persona)
    except DatosAcademicos.DoesNotExist:
        return Response({'error': 'Registro no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        registro.delete()
        quedan = DatosAcademicos.objects.filter(persona=empleado.persona).exists()
        if not quedan and empleado.datos_academicos_completados:
            empleado.datos_academicos_completados = False
            empleado.save(update_fields=['datos_academicos_completados'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = DatosAcademicosSerializer(registro, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_academicos_empleado(request, empleado_id):
    """Admin: lista o crea datos académicos de cualquier empleado."""
    if not (_es_superadmin(request.user) or (hasattr(request.user, 'id_permisos') and request.user.id_permisos == 1)):
        return Response({'error': 'Sin permisos'}, status=status.HTTP_403_FORBIDDEN)

    try:
        empleado = DatosEmpleado.objects.get(id_empleado=empleado_id)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    persona = empleado.persona

    if request.method == 'GET':
        registros = DatosAcademicos.objects.filter(persona=persona)
        return Response(DatosAcademicosSerializer(registros, many=True).data)

    serializer = DatosAcademicosSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    diploma = request.FILES.get('diploma')
    if diploma:
        try:
            validate_pdf_image(diploma)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        diploma.seek(0)
        diploma_bytes = diploma.read()
        diploma.seek(0)

    serializer.save(persona=persona)
    if not empleado.datos_academicos_completados:
        empleado.datos_academicos_completados = True
        empleado.save(update_fields=['datos_academicos_completados'])

    if diploma:
        from ..n8n_gateway import subir_intranet_async
        subir_intranet_async('datos_academicos', diploma.name, diploma_bytes, diploma.content_type)

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_academicos_detalle(request, empleado_id, pk):
    """Admin: edita o elimina un registro académico de cualquier empleado."""
    if not (_es_superadmin(request.user) or (hasattr(request.user, 'id_permisos') and request.user.id_permisos == 1)):
        return Response({'error': 'Sin permisos'}, status=status.HTTP_403_FORBIDDEN)

    try:
        empleado = DatosEmpleado.objects.get(id_empleado=empleado_id)
        registro = DatosAcademicos.objects.get(pk=pk, persona=empleado.persona)
    except (DatosEmpleado.DoesNotExist, DatosAcademicos.DoesNotExist):
        return Response({'error': 'No encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        registro.delete()
        if not DatosAcademicos.objects.filter(persona=empleado.persona).exists():
            empleado.datos_academicos_completados = False
            empleado.save(update_fields=['datos_academicos_completados'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = DatosAcademicosSerializer(registro, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)
