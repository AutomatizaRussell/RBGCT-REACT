"""
Sugerencias de empleados.
Flujo: empleado envía → campanita de admins → admin marca "recibido" → empleado ve la confirmación.
"""
import logging

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from rest_framework import status

from ..models import SugerenciaEmpleado
from ..permissions import IsAdminOrSuperAdmin

from ._utils import _es_empleado

logger = logging.getLogger(__name__)


def _sugerencia_a_dict(s, incluir_empleado=False):
    data = {
        'id': s.id,
        'sugerencia': s.sugerencia,
        'fecha_envio': s.fecha_envio.isoformat(),
        'recibida': s.recibida,
        'fecha_recibida': s.fecha_recibida.isoformat() if s.fecha_recibida else None,
        'confirmacion_vista': s.confirmacion_vista,
    }
    if incluir_empleado:
        data['empleado'] = {
            'id_empleado': s.empleado.id_empleado,
            'nombre': s.empleado.persona.nombre_completo if s.empleado.persona_id else '',
            'correo': s.empleado.correo_corporativo,
        }
    return data


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([UserRateThrottle])
def crear_sugerencia(request):
    """El empleado autenticado envía una sugerencia/duda/problema."""
    if not _es_empleado(request.user):
        return Response({'error': 'Solo los empleados pueden enviar sugerencias'},
                        status=status.HTTP_403_FORBIDDEN)
    texto = (request.data.get('sugerencia') or '').strip()
    if not texto:
        return Response({'error': 'La sugerencia no puede estar vacía'},
                        status=status.HTTP_400_BAD_REQUEST)
    if len(texto) > 4000:
        return Response({'error': 'La sugerencia es demasiado larga (máx. 4000 caracteres)'},
                        status=status.HTTP_400_BAD_REQUEST)
    s = SugerenciaEmpleado.objects.create(empleado=request.user, sugerencia=texto)
    logger.info(f"[SUGERENCIAS] Nueva sugerencia {s.id} de {request.user.correo_corporativo}")
    return Response(_sugerencia_a_dict(s), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mis_sugerencias(request):
    """Sugerencias del empleado autenticado (para su widget y su campanita)."""
    if not _es_empleado(request.user):
        return Response({'sugerencias': []})
    qs = SugerenciaEmpleado.objects.filter(empleado=request.user).order_by('-fecha_envio')[:50]
    return Response({'sugerencias': [_sugerencia_a_dict(s) for s in qs]})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirmar_sugerencia_vista(request, sugerencia_id):
    """El empleado marca como vista la confirmación de recibido (limpia su campanita)."""
    try:
        s = SugerenciaEmpleado.objects.get(id=sugerencia_id)
    except SugerenciaEmpleado.DoesNotExist:
        return Response({'error': 'Sugerencia no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    if not _es_empleado(request.user) or s.empleado_id != request.user.id_empleado:
        return Response({'error': 'Solo puedes confirmar tus propias sugerencias'},
                        status=status.HTTP_403_FORBIDDEN)
    s.confirmacion_vista = True
    s.save(update_fields=['confirmacion_vista'])
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def listar_sugerencias(request):
    """
    Admin/SuperAdmin:
    - ?empleado_id=X → historial completo de ese empleado (ficha de colaborador)
    - ?pendientes=1  → solo las no recibidas (campanita)
    """
    qs = SugerenciaEmpleado.objects.select_related('empleado', 'empleado__persona')
    empleado_id = request.query_params.get('empleado_id')
    if empleado_id:
        qs = qs.filter(empleado_id=empleado_id)
    if request.query_params.get('pendientes'):
        qs = qs.filter(recibida=False)
    qs = qs.order_by('-fecha_envio')[:200]
    return Response({'sugerencias': [_sugerencia_a_dict(s, incluir_empleado=True) for s in qs]})


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def recibir_sugerencia(request, sugerencia_id):
    """Admin marca la sugerencia como recibida; el empleado verá la confirmación."""
    from django.utils import timezone
    try:
        s = SugerenciaEmpleado.objects.get(id=sugerencia_id)
    except SugerenciaEmpleado.DoesNotExist:
        return Response({'error': 'Sugerencia no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    if not s.recibida:
        s.recibida = True
        s.fecha_recibida = timezone.now()
        s.save(update_fields=['recibida', 'fecha_recibida'])
        logger.info(f"[SUGERENCIAS] Sugerencia {s.id} marcada como recibida")
    return Response(_sugerencia_a_dict(s, incluir_empleado=True))
