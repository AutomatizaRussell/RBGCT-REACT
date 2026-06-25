"""
ViewSets y endpoints de administración:
SolicitudesPassword, ReglamentoItem, N8nLog, ApiKey,
actividad reciente, alertas de recuperación, health check.
"""
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from django.db import models as django_models
from django.core.cache import cache

from ..models import (
    SolicitudesPassword, ReglamentoItem, N8nLog, ApiKey,
    SuperAdmin, DatosEmpleado, Alerta,
)
from ..serializers import (
    SolicitudesPasswordSerializer, ReglamentoItemSerializer, N8nLogSerializer, ApiKeySerializer,
)
from ..permissions import IsSuperAdminUser, IsAdminOrSuperAdmin
from ..throttles import RecuperacionPasswordThrottle

from ._utils import (
    CACHE_KEY_ACTIVIDAD_RECIENTE,
    CACHE_KEY_ALERTAS_RECUPERACION,
    ACTIVIDAD_RECIENTE_MAX_ITEMS,
    ALERTAS_RECIENTES_MAX_ITEMS,
    _es_superadmin,
)

logger = logging.getLogger(__name__)


class SolicitudesPasswordViewSet(viewsets.ModelViewSet):
    queryset = SolicitudesPassword.objects.all().order_by('-fecha_solicitud')
    serializer_class = SolicitudesPasswordSerializer

    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        solicitudes = SolicitudesPassword.objects.filter(leida=False)
        serializer = self.get_serializer(solicitudes, many=True)
        return Response(serializer.data)


class ReglamentoItemViewSet(viewsets.ModelViewSet):
    queryset = ReglamentoItem.objects.all().order_by('orden')
    serializer_class = ReglamentoItemSerializer

    def create(self, request, *args, **kwargs):
        # Asignar orden al final si no se especifica
        if 'orden' not in request.data or request.data['orden'] is None:
            max_orden = ReglamentoItem.objects.aggregate(django_models.Max('orden'))['orden__max'] or 0
            # En DRF, request.data ya debería tener todo (POST + FILES)
            from django.http import QueryDict
            if isinstance(request.data, QueryDict):
                data = request.data.copy()
            else:
                data = dict(request.data)
            data['orden'] = max_orden + 1
            # Copiar archivos explícitamente
            for key, file_obj in request.FILES.items():
                data[key] = file_obj
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def mover(self, request, pk=None):
        """Mueve el item hacia arriba o abajo intercambiando orden con el vecino."""
        item = self.get_object()
        direccion = request.data.get('direccion')  # 'arriba' o 'abajo'

        items_ordenados = list(ReglamentoItem.objects.order_by('orden'))
        idx = next((i for i, x in enumerate(items_ordenados) if x.id == item.id), None)

        if idx is None:
            return Response({'error': 'Item no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if direccion == 'arriba' and idx > 0:
            vecino = items_ordenados[idx - 1]
        elif direccion == 'abajo' and idx < len(items_ordenados) - 1:
            vecino = items_ordenados[idx + 1]
        else:
            return Response({'error': 'No se puede mover en esa dirección'}, status=status.HTTP_400_BAD_REQUEST)

        item.orden, vecino.orden = vecino.orden, item.orden
        item.save(update_fields=['orden'])
        vecino.save(update_fields=['orden'])

        todos = ReglamentoItem.objects.order_by('orden')
        return Response(ReglamentoItemSerializer(todos, many=True).data)


class N8nLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Logs de integraciones con n8n — solo lectura."""
    queryset = N8nLog.objects.all().order_by('-created_at')
    serializer_class = N8nLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        limit = self.request.query_params.get('limit', 50)
        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 50
        return qs[:limit]


class ApiKeyViewSet(viewsets.ModelViewSet):
    """
    Gestión de API Keys para automatizaciones externas.
    Solo SuperAdmins pueden crear/ver/revocar API keys.
    """
    queryset = ApiKey.objects.all().order_by('-created_at')
    serializer_class = ApiKeySerializer
    permission_classes = [IsSuperAdminUser]

    def get_queryset(self):
        """Filtrar por estado si se pasa parámetro"""
        qs = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs

    def perform_create(self, serializer):
        """Asignar el superadmin actual como creador"""
        user = self.request.user
        creado_por = None
        if hasattr(user, 'id') and SuperAdmin.objects.filter(id=user.id).exists():
            creado_por = user
        serializer.save(creado_por=creado_por)

    def create(self, request, *args, **kwargs):
        """Override para devolver la key completa solo al crear"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revocar (desactivar) una API key"""
        api_key = self.get_object()
        api_key.is_active = False
        api_key.save()
        return Response({'status': 'revoked', 'id': str(api_key.id)})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Reactivar una API key revocada"""
        api_key = self.get_object()
        api_key.is_active = True
        api_key.save()
        return Response({'status': 'activated', 'id': str(api_key.id)})

    @action(detail=False, methods=['post'])
    def verify(self, request):
        """Verificar si una API key es válida (para testing)"""
        key = request.data.get('key', '').strip()
        if not key:
            return Response({'error': 'Key requerida'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            api_key = ApiKey.objects.get(key=key, is_active=True)
            api_key.mark_used()
            return Response({
                'valid': True,
                'nombre': api_key.nombre,
                'permisos': api_key.permisos,
                'uso_count': api_key.uso_count
            })
        except ApiKey.DoesNotExist:
            return Response({'valid': False}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
@throttle_classes([UserRateThrottle])
def actividad_reciente(request):
    """
    Obtiene usuarios activos recientemente.
    Retorna:
    - activos: usuarios con actividad en últimos 10 minutos (En línea)
    - recientes: usuarios con actividad en últimas 24 horas (Desconectados)
    """
    cached = cache.get(CACHE_KEY_ACTIVIDAD_RECIENTE)
    if cached:
        return Response(cached)

    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Q

    ahora = timezone.now()
    limite_activo = ahora - timedelta(minutes=10)  # En línea (10 minutos - usuarios concurrentes)
    limite_reciente = ahora - timedelta(hours=24)  # Reciente (24 horas)

    # Empleados activos (últimos 10 min) - limitados para evitar respuestas gigantes.
    activos = list(
        DatosEmpleado.objects.filter(
            ultima_actividad__gte=limite_activo,
            estado='ACTIVA'
        )
        .select_related('persona')
        .only(
            'id_empleado', 'correo_corporativo', 'id_permisos', 'ultima_actividad',
            'persona__primer_nombre', 'persona__primer_apellido'
        )
        .order_by('-ultima_actividad')[:ACTIVIDAD_RECIENTE_MAX_ITEMS]
    )

    # Superadmins activos
    admins_activos = list(
        SuperAdmin.objects.filter(last_login__gte=limite_activo)
        .only('id', 'nombre', 'apellido', 'email', 'last_login')
        .order_by('-last_login')[:ACTIVIDAD_RECIENTE_MAX_ITEMS]
    )

    # Empleados recientes (últimas 24 horas, pero no en línea actualmente)
    recientes = list(
        DatosEmpleado.objects.filter(
            Q(ultima_actividad__gte=limite_reciente, ultima_actividad__lt=limite_activo) |
            Q(ultima_actividad__isnull=True, fecha_ingreso__gte=limite_reciente),
            estado='ACTIVA'
        )
        .exclude(id_empleado__in=[emp.id_empleado for emp in activos])
        .select_related('persona')
        .only(
            'id_empleado', 'correo_corporativo', 'id_permisos', 'ultima_actividad',
            'persona__primer_nombre', 'persona__primer_apellido'
        )
        .order_by('-ultima_actividad')[:ACTIVIDAD_RECIENTE_MAX_ITEMS]
    )

    # Superadmins recientes
    admins_recientes = list(
        SuperAdmin.objects.filter(
            last_login__gte=limite_reciente,
            last_login__lt=limite_activo
        )
        .only('id', 'nombre', 'apellido', 'email', 'last_login')
        .order_by('-last_login')[:ACTIVIDAD_RECIENTE_MAX_ITEMS]
    )

    def minutos_transcurridos(timestamp):
        if not timestamp:
            return None
        delta = ahora - timestamp
        return int(delta.total_seconds() / 60)

    # Formatear respuesta
    activos_data = []

    for emp in activos:
        activos_data.append({
            'id': emp.id_empleado,
            'nombre': f"{emp.primer_nombre} {emp.primer_apellido}",
            'email': emp.correo_corporativo,
            'rol': 'Administrador' if emp.id_permisos == 1 else 'Editor' if emp.id_permisos == 2 else 'Usuario',
            'estado': 'en_linea',
            'minutos_transcurridos': 0,
            'ultima_actividad': emp.ultima_actividad.isoformat() if emp.ultima_actividad else None
        })

    for admin in admins_activos:
        activos_data.append({
            'id': f"admin_{admin.id}",
            'nombre': f"{admin.nombre} {admin.apellido}",
            'email': admin.email,
            'rol': 'SuperAdmin',
            'estado': 'en_linea',
            'minutos_transcurridos': 0,
            'ultima_actividad': admin.last_login.isoformat() if admin.last_login else None
        })

    recientes_data = []

    for emp in recientes:
        mins = minutos_transcurridos(emp.ultima_actividad)
        recientes_data.append({
            'id': emp.id_empleado,
            'nombre': f"{emp.primer_nombre} {emp.primer_apellido}",
            'email': emp.correo_corporativo,
            'rol': 'Administrador' if emp.id_permisos == 1 else 'Editor' if emp.id_permisos == 2 else 'Usuario',
            'estado': 'desconectado',
            'minutos_transcurridos': mins,
            'ultima_actividad': emp.ultima_actividad.isoformat() if emp.ultima_actividad else None
        })

    for admin in admins_recientes:
        mins = minutos_transcurridos(admin.last_login)
        recientes_data.append({
            'id': f"admin_{admin.id}",
            'nombre': f"{admin.nombre} {admin.apellido}",
            'email': admin.email,
            'rol': 'SuperAdmin',
            'estado': 'desconectado',
            'minutos_transcurridos': mins,
            'ultima_actividad': admin.last_login.isoformat() if admin.last_login else None
        })

    payload = {
        'total_en_linea': len(activos_data),
        'total_recientes': len(recientes_data),
        'activos': activos_data,
        'recientes': recientes_data,
        'timestamp': ahora.isoformat()
    }
    cache.set(CACHE_KEY_ACTIVIDAD_RECIENTE, payload, timeout=60)
    return Response(payload)


# Endpoint para registrar intento de recuperación - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RecuperacionPasswordThrottle])
def registrar_intento_recuperacion(request):
    """
    Registra un intento de recuperación de contraseña en la base de datos
    Espera: email
    Retorna: información completa del usuario si existe
    """
    from django.utils import timezone

    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email requerido'}, status=status.HTTP_400_BAD_REQUEST)

    # Buscar si el email existe en empleados o superadmins
    empleado = DatosEmpleado.objects.filter(correo_corporativo=email).first()
    admin = SuperAdmin.objects.filter(email=email).first() if not empleado else None

    # Determinar información
    existe_en_sistema = bool(empleado or admin)
    nombre_solicitante = None
    rol_solicitante = None
    empleado_relacionado = None

    if empleado:
        nombre_solicitante = f"{empleado.primer_nombre} {empleado.primer_apellido}"
        # El rol viene del cargo o de los permisos
        rol_solicitante = str(empleado.cargo) if empleado.cargo else 'Empleado'
        empleado_relacionado = empleado
    elif admin:
        nombre_solicitante = f"{admin.nombre} {admin.apellido}"
        rol_solicitante = 'SuperAdmin'
    else:
        nombre_solicitante = 'Usuario No Registrado'
        rol_solicitante = 'Desconocido'

    # Crear alerta en base de datos
    alerta = Alerta.objects.create(
        tipo='recuperacion_password',
        empleado=empleado_relacionado,
        email_solicitante=email,
        nombre_solicitante=nombre_solicitante,
        rol_solicitante=rol_solicitante,
        estado_alerta='pendiente',
        usuario_existe=existe_en_sistema
    )
    cache.delete(CACHE_KEY_ALERTAS_RECUPERACION)
    cache.delete(CACHE_KEY_ACTIVIDAD_RECIENTE)

    logger.warning(f"[ALERTA] Intento de recuperación de contraseña: {email} - {'EXISTE' if existe_en_sistema else 'NO EXISTE'}")

    # Respuesta acotada: no exponer PII ni existencia detallada del usuario.
    response_data = {
        'message': 'Intento registrado',
        'alerta': {
            'id': alerta.id,
            'timestamp': alerta.fecha_creacion.isoformat(),
            'estado': alerta.estado_alerta
        }
    }

    return Response(response_data)


# Endpoint para obtener alertas de recuperación
@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
@throttle_classes([UserRateThrottle])
def get_alertas_recuperacion(request):
    """
    Obtiene alertas de recuperación de contraseña pendientes (últimas 24 horas).
    Se limita el volumen para evitar respuestas muy pesadas en dashboards.
    desde la base de datos PostgreSQL
    """
    cached = cache.get(CACHE_KEY_ALERTAS_RECUPERACION)
    if cached:
        return Response(cached)

    from django.utils import timezone
    from datetime import timedelta

    limite = timezone.now() - timedelta(hours=24)

    # Solo pendientes para tablero operativo.
    alertas_query = Alerta.objects.filter(
        tipo='recuperacion_password',
        fecha_creacion__gte=limite,
        estado_alerta='pendiente',
    ).select_related(
        'empleado__persona',
        'empleado__area',
        'empleado__cargo',
    ).only(
        'id', 'email_solicitante', 'nombre_solicitante', 'rol_solicitante',
        'estado_alerta', 'usuario_existe', 'fecha_creacion',
        'empleado__id_empleado', 'empleado__correo_corporativo', 'empleado__fecha_ingreso',
        'empleado__estado',
        'empleado__persona__primer_nombre', 'empleado__persona__segundo_nombre',
        'empleado__persona__primer_apellido', 'empleado__persona__segundo_apellido',
        'empleado__area__nombre_area', 'empleado__cargo__nombre_cargo',
    ).order_by('-fecha_creacion')[:ALERTAS_RECIENTES_MAX_ITEMS]

    alertas_list = []
    for alerta in alertas_query:
        alerta_data = {
            'id': alerta.id,
            'email': alerta.email_solicitante,
            'nombre': alerta.nombre_solicitante,
            'rol': alerta.rol_solicitante,
            'estado': alerta.estado_alerta,
            'usuario_existe': alerta.usuario_existe,
            'timestamp': alerta.fecha_creacion.isoformat(),
            'atendida': alerta.estado_alerta == 'atendida'
        }

        # Si tiene empleado relacionado, agregar toda la información
        if alerta.empleado:
            emp = alerta.empleado
            alerta_data['empleado_info'] = {
                'id': emp.id_empleado,
                'nombre_completo': f"{emp.primer_nombre} {emp.segundo_nombre or ''} {emp.primer_apellido} {emp.segundo_apellido or ''}".strip(),
                'correo': emp.correo_corporativo,
                'area': emp.area.nombre_area if emp.area else None,
                'cargo': emp.cargo.nombre_cargo if emp.cargo else None,
                'fecha_ingreso': emp.fecha_ingreso.isoformat() if emp.fecha_ingreso else None,
                'estado': emp.estado,
            }

        alertas_list.append(alerta_data)

    payload = {
        'total': len(alertas_list),
        'alertas': alertas_list
    }
    cache.set(CACHE_KEY_ALERTAS_RECUPERACION, payload, timeout=60)
    return Response(payload)


# Health check público para watchdog/healthchecks de infraestructura.
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    from django.db import connection
    estado = {'status': 'ok', 'db': False, 'cache': False}
    try:
        with connection.cursor() as cur:
            cur.execute('SELECT 1')
            estado['db'] = cur.fetchone()[0] == 1
    except Exception as e:
        logger.error(f"[HEALTH] DB caída: {e}")
    try:
        cache.set('health_probe', '1', 10)
        estado['cache'] = cache.get('health_probe') == '1'
    except Exception as e:
        logger.error(f"[HEALTH] Cache caída: {e}")
    if not (estado['db'] and estado['cache']):
        estado['status'] = 'degraded'
        return Response(estado, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(estado)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
@throttle_classes([UserRateThrottle])
def atender_alerta(request, alerta_id):
    """
    Marca una alerta como atendida
    """
    from django.utils import timezone

    try:
        alerta = Alerta.objects.get(id=alerta_id)
        alerta.estado_alerta = 'atendida'
        alerta.fecha_actualizacion = timezone.now()
        # Intentar obtener el admin del request si está autenticado
        alerta.save()
        cache.delete(CACHE_KEY_ALERTAS_RECUPERACION)
        cache.delete(CACHE_KEY_ACTIVIDAD_RECIENTE)

        return Response({
            'success': True,
            'message': 'Alerta marcada como atendida',
            'alerta_id': alerta_id
        })
    except Alerta.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Alerta no encontrada'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
@throttle_classes([UserRateThrottle])
def eliminar_alerta(request, alerta_id):
    """
    Elimina una alerta permanentemente
    """
    try:
        alerta = Alerta.objects.get(id=alerta_id)
        alerta.delete()
        cache.delete(CACHE_KEY_ALERTAS_RECUPERACION)
        cache.delete(CACHE_KEY_ACTIVIDAD_RECIENTE)

        return Response({
            'success': True,
            'message': 'Alerta eliminada permanentemente',
            'alerta_id': alerta_id
        })
    except Alerta.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Alerta no encontrada'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
