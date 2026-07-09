"""
Flujo de recuperación de contraseña con n8n.
"""
import uuid
import logging
from datetime import datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
import bcrypt

from ..models import DatosEmpleado, SolicitudesPassword

from ._utils import generar_codigo_verificacion
from ..n8n_gateway import enviar_recuperacion_password, notificar_password_restablecida

logger = logging.getLogger(__name__)


# Endpoint para solicitar recuperación de contraseña - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
def solicitar_recuperacion_password(request):
    """
    Solicita recuperación de contraseña.
    Solo envía código si el email existe en la base de datos.
    """
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response({'error': 'Email requerido'}, status=status.HTTP_400_BAD_REQUEST)

    # Buscar si el email existe (solo empleados activos, no superadmins por seguridad)
    try:
        empleado = DatosEmpleado.objects.get(correo_corporativo=email, estado='ACTIVA')
        usuario_existe = True
        nombre_usuario = f"{empleado.primer_nombre} {empleado.primer_apellido}"
    except DatosEmpleado.DoesNotExist:
        usuario_existe = False
        # Registrar intento fallido para auditoría
        logger.warning(f"[RECUPERACION] Intento de recuperación para email no registrado: {email}")

    if not usuario_existe:
        # Respuesta genérica por seguridad (no revelar si existe o no)
        return Response({
            'message': 'Si el email está registrado, recibirás un código de verificación',
            'enviado': False
        }, status=status.HTTP_200_OK)

    # Generar código de verificación (6 dígitos)
    codigo = generar_codigo_verificacion()

    # Guardar en caché por 15 minutos
    cache_key = f"recuperacion_{email}"
    cache.set(cache_key, {
        'codigo': codigo,
        'email': email,
        'empleado_id': empleado.id_empleado,
        'intentos': 0
    }, timeout=900)  # 15 minutos

    email_sent, result = enviar_recuperacion_password(email, codigo, nombre_usuario)

    if email_sent:
        logger.info(f"[RECUPERACION] Código enviado a {email}")
        return Response({
            'message': 'Si el email está registrado, recibirás un código de verificación',
            'enviado': True,
            'email': email  # Solo para debug en desarrollo
        }, status=status.HTTP_200_OK)
    else:
        logger.error(f"[RECUPERACION] Error enviando código: {result}")
        return Response({
            'message': 'Error al enviar el código. Intenta más tarde.',
            'enviado': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Endpoint para verificar código de recuperación - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
def verificar_codigo_recuperacion(request):
    """
    Verifica el código de recuperación enviado por email.
    Si es válido, permite restablecer la contraseña.
    """
    email = request.data.get('email', '').strip().lower()
    codigo = request.data.get('codigo', '').strip()

    if not email or not codigo:
        return Response({'error': 'Email y código requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f"recuperacion_{email}"
    datos_recuperacion = cache.get(cache_key)

    if not datos_recuperacion:
        return Response({'error': 'Código expirado o inválido'}, status=status.HTTP_400_BAD_REQUEST)

    # Verificar código
    if datos_recuperacion['codigo'] != codigo:
        # Incrementar intentos fallidos
        datos_recuperacion['intentos'] = datos_recuperacion.get('intentos', 0) + 1

        # Si supera 3 intentos, invalidar
        if datos_recuperacion['intentos'] >= 3:
            cache.delete(cache_key)
            return Response({'error': 'Código bloqueado por múltiples intentos fallidos'}, status=status.HTTP_403_FORBIDDEN)

        cache.set(cache_key, datos_recuperacion, timeout=900)
        return Response({
            'error': 'Código incorrecto',
            'intentos_restantes': 3 - datos_recuperacion['intentos']
        }, status=status.HTTP_400_BAD_REQUEST)

    # Código válido - generar token temporal para restablecer
    token_temporal = str(uuid.uuid4())
    cache_key_token = f"reset_token_{token_temporal}"
    cache.set(cache_key_token, {
        'email': email,
        'empleado_id': datos_recuperacion['empleado_id'],
        'verificado': True
    }, timeout=900)  # 15 minutos para cambiar la contraseña

    # Limpiar caché del código (ya no se necesita)
    cache.delete(cache_key)

    logger.info(f"[RECUPERACION] Código verificado para {email}")

    return Response({
        'message': 'Código verificado correctamente',
        'token': token_temporal,  # Token para el siguiente paso
        'email': email
    }, status=status.HTTP_200_OK)


# Endpoint para restablecer contraseña - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
def restablecer_password(request):
    """
    Restablece la contraseña después de verificar el código.
    Requiere token temporal y nueva contraseña.
    """
    token = request.data.get('token', '').strip()
    nueva_password = request.data.get('nueva_password', '').strip()

    if not token or not nueva_password:
        return Response({'error': 'Token y nueva contraseña requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    if len(nueva_password) < 6:
        return Response({'error': 'La contraseña debe tener al menos 6 caracteres'}, status=status.HTTP_400_BAD_REQUEST)

    # Verificar token temporal
    cache_key_token = f"reset_token_{token}"
    datos_token = cache.get(cache_key_token)

    if not datos_token:
        return Response({'error': 'Token inválido o expirado'}, status=status.HTTP_400_BAD_REQUEST)

    email = datos_token['email']
    empleado_id = datos_token['empleado_id']

    try:
        empleado = DatosEmpleado.objects.get(id_empleado=empleado_id, estado='ACTIVA')

        # Actualizar contraseña
        password_hash = bcrypt.hashpw(nueva_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        empleado.password_hash = password_hash
        empleado.save(update_fields=['password_hash'])

        # Limpiar token
        cache.delete(cache_key_token)

        # Crear registro de solicitud atendida
        SolicitudesPassword.objects.create(
            empleado=empleado,
            leida=True,
            atendida=True
        )

        # NOTIFICAR A ADMIN vía webhook de n8n
        notificar_admin_password_restablecida(empleado)

        logger.info(f"[RECUPERACION] Contraseña restablecida para {email}")

        return Response({
            'message': 'Contraseña restablecida correctamente',
            'email': email,
            'completado': True
        }, status=status.HTTP_200_OK)

    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)


def notificar_admin_password_restablecida(empleado):
    """Notifica a admin cuando un empleado restablece su contraseña."""
    try:
        notificar_password_restablecida(
            email=empleado.correo_corporativo,
            nombre=f"{empleado.primer_nombre} {empleado.primer_apellido}",
            area=str(empleado.area) if empleado.area else '',
            cargo=str(empleado.cargo) if empleado.cargo else '',
        )
    except Exception as e:
        logger.error(f"[NOTIFICACION] Error: {e}")
