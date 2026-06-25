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

from ._utils import generar_codigo_verificacion, _post_n8n, _post_n8n_async

logger = logging.getLogger(__name__)


def enviar_email_recuperacion_n8n(email, codigo, nombre=None):
    """Envía código de recuperación de contraseña vía n8n."""
    nombre_usuario = nombre or 'Usuario'
    html_email = f"""<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #F8F9FA;">
  <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">

    <div style="text-align: center; padding: 30px 20px 20px 20px;">
      <img src="https://raw.githubusercontent.com/AutomatizaRussell/Resourse_GestionHumana/main/Logo_RB2021.png" alt="Russell Bedford" style="height: 50px; margin-bottom: 15px;">
    </div>
    <div style="height: 4px; background: linear-gradient(to right, #001871 50%, #00a9ce 50%, #00a9ce 75%, #ed8b00 75%, #ed8b00 100%);"></div>

    <div style="padding: 40px 30px;">
      <h2 style="color: #001871; font-size: 24px; margin-top: 0; margin-bottom: 20px;">Recuperación de Contraseña</h2>
      <p style="font-size: 16px; color: #4A5568; margin-bottom: 20px; line-height: 1.6;">Hola <strong>{nombre_usuario}</strong>,</p>
      <p style="font-size: 16px; color: #4A5568; margin-bottom: 25px; line-height: 1.6;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Por favor, utiliza el siguiente código de verificación para continuar con el proceso:</p>

      <div style="background-color: #F8F9FA; padding: 35px 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #e2e8f0; border-top: 4px solid #00a9ce; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #4A5568; font-size: 14px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Tu código de verificación</p>
        <div style="color: #001871; font-size: 40px; font-weight: bold; letter-spacing: 12px; margin: 0;">
          {codigo}
        </div>
      </div>

      <p style="font-size: 14px; color: #718096; margin-top: 25px; line-height: 1.5;">
        <strong style="color: #e53e3e;">Importante:</strong> Este código expira en 15 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura; tu cuenta sigue protegida.
      </p>
    </div>

    <div style="background-color: #001871; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0; font-size: 14px;"><strong>GCT - Sistema de Gestión</strong></p>
      <p style="margin: 5px 0 0 0; color: #e2e8f0;">Russell Bedford Colombia</p>
      <p style="margin: 10px 0 0 0;"><a href="https://conecta.rbgct.cloud" style="color: #00a9ce; text-decoration: none; font-size: 13px; font-weight: bold;">🌐 conecta.rbgct.cloud</a></p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #a0aec0;">Este es un mensaje automático, por favor no respondas a este correo.</p>
    </div>

  </div>
</div>"""
    payload = {
        'tipo': 'recuperacion_password',
        'destinatario': email,
        'asunto': 'Recuperación de Contraseña - GCT',
        'html_email': html_email,
        'datos_sensibles': {'correo_login': email, 'codigo_verificacion': codigo},
        'datos_usuario': {'nombre': nombre_usuario, 'expira_en': '15 minutos'},
    }
    return _post_n8n(email, payload, 'recuperacion_password')


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

    # Enviar email vía n8n
    email_sent, result = enviar_email_recuperacion_n8n(email, codigo, nombre_usuario)

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
    """
    Notifica a admin/superadmin cuando un empleado restablece su contraseña.
    Envía webhook a n8n para notificación (email o teams).
    """
    try:
        from django.conf import settings
        n8n_url = settings.N8N_WEBHOOK_URL
        if not n8n_url:
            return

        payload = {
            'tipo': 'notificacion_admin',
            'evento': 'password_restablecida',
            'datos_empleado': {
                'id': empleado.id_empleado,
                'nombre': f"{empleado.primer_nombre} {empleado.primer_apellido}",
                'email': empleado.correo_corporativo,
                'area': str(empleado.area) if empleado.area else 'Sin área',
                'cargo': str(empleado.cargo) if empleado.cargo else 'Sin cargo'
            },
            'mensaje': f"El empleado {empleado.primer_nombre} {empleado.primer_apellido} ha restablecido su contraseña",
            'timestamp': str(datetime.now())
        }

        _post_n8n_async(empleado.correo_corporativo, payload, 'notificacion_password_restablecida')
        logger.info(f"[N8N NOTIFICACION] Notificación admin enviada en background")

    except Exception as e:
        logger.error(f"[NOTIFICACION] Error: {str(e)}")
