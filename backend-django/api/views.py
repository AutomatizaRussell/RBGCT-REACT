import jwt as pyjwt

from django.db import models as django_models
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
import bcrypt
import logging
import resend
import random
from django.core.cache import cache
from django.conf import settings
from .models import DatosArea, DatosCargo, SuperAdmin, DatosEmpleado, TareasCalendario, SolicitudesPassword, ReglamentoItem, Curso, CursoContenido
from .jwt_utils import generate_tokens, decode_token, build_superadmin_payload, build_empleado_payload, jwt_required

logger = logging.getLogger(__name__)

# Configurar Resend
resend.api_key = settings.RESEND_API_KEY

# Función para generar código de verificación
def generar_codigo_verificacion():
    """Genera código aleatorio de 6 dígitos"""
    return str(random.randint(100000, 999999))

# Función para enviar email con código
def enviar_email_verificacion(email, codigo):
    """Envía email con código de verificación usando Gmail SMTP (Django)"""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = 'Código de verificación - RBG CT'
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: #001e33; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">RBG CT</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Código de verificación</p>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                    Tu código de verificación es:
                </p>
                <div style="background: #001e33; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
                    {codigo}
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 20px;">
                    Este código expira en 15 minutos. No lo compartas con nadie.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #999; text-align: center;">
                    Si no solicitaste este código, ignora este mensaje.<br>
                    RBG CT - Sistema de Gestión
                </p>
            </div>
        </div>
        """
        
        send_mail(
            subject=subject,
            message=f'Tu código de verificación es: {codigo}. Expira en 15 minutos.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
            html_message=html_content
        )
        
        logger.info(f"[EMAIL] Código enviado a {email}")
        return True, {"status": "sent"}
        
    except Exception as e:
        logger.error(f"[EMAIL] Error enviando a {email}: {str(e)}")
        return False, str(e)

from .serializers import (
    DatosAreaSerializer, DatosCargoSerializer, SuperAdminSerializer,
    DatosEmpleadoSerializer, TareasCalendarioSerializer, SolicitudesPasswordSerializer,
    ReglamentoItemSerializer, CursoSerializer, CursoContenidoSerializer
)

# Endpoint de Login - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email y password requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 1. Verificar si es SuperAdmin
    try:
        admin = SuperAdmin.objects.get(email=email)
        if bcrypt.checkpw(password.encode('utf-8'), admin.password_hash.encode('utf-8')):
            tokens = generate_tokens(build_superadmin_payload(admin))
            return Response({
                'type': 'superadmin',
                'user': {
                    'id': str(admin.id),
                    'email': admin.email,
                    'nombre': admin.nombre,
                    'apellido': admin.apellido,
                },
                **tokens,
            })
        else:
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
    except SuperAdmin.DoesNotExist:
        pass

    # 2. Verificar si es Empleado
    try:
        empleado = DatosEmpleado.objects.get(correo_corporativo=email, estado='ACTIVA')
        if empleado.password_hash and bcrypt.checkpw(password.encode('utf-8'), empleado.password_hash.encode('utf-8')):

            from django.utils import timezone
            empleado.ultima_actividad = timezone.now()
            empleado.save(update_fields=['ultima_actividad'])

            # Primer login: requiere verificación por código
            if empleado.primer_login:
                return Response({
                    'type': 'empleado',
                    'user': {
                        'id_empleado': empleado.id_empleado,
                        'correo_corporativo': empleado.correo_corporativo,
                        'id_permisos': empleado.id_permisos,
                        'primer_login': True,
                        'datos_completados': empleado.datos_completados,
                    },
                    'requiere_verificacion': True,
                    'mensaje': 'Por favor ingresa el código de verificación enviado a tu correo',
                })

            tokens = generate_tokens(build_empleado_payload(empleado))
            return Response({
                'type': 'empleado',
                'user': {
                    'id_empleado': empleado.id_empleado,
                    'primer_nombre': empleado.primer_nombre,
                    'segundo_nombre': empleado.segundo_nombre,
                    'primer_apellido': empleado.primer_apellido,
                    'segundo_apellido': empleado.segundo_apellido,
                    'correo_corporativo': empleado.correo_corporativo,
                    'id_permisos': empleado.id_permisos,
                    'estado': empleado.estado,
                    'area_id': empleado.area_id,
                    'cargo_id': empleado.cargo_id,
                    'primer_login': False,
                    'datos_completados': empleado.datos_completados,
                    'permitir_edicion_datos': empleado.permitir_edicion_datos,
                },
                **tokens,
            })
        else:
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)


# Endpoint para crear usuarios (solo SuperAdmin)
@api_view(['POST'])
@permission_classes([AllowAny])  # Se valida dentro del endpoint
def crear_usuario_superadmin(request):
    """
    Solo SuperAdmin puede crear usuarios.
    Puede crear con datos completos o solo correo+contraseña.
    """
    logger.info(f"[CREAR USUARIO] Datos recibidos: {request.data}")
    
    # Verificar que sea SuperAdmin (enviar credenciales en el request)
    admin_email = request.data.get('admin_email', '').strip()
    admin_password = request.data.get('admin_password', '').strip()

    if not admin_email or not admin_password:
        logger.error(f"[CREAR USUARIO] Faltan credenciales: admin_email={admin_email}, admin_password={'*****' if admin_password else None}")
        return Response({'error': 'Credenciales de administrador requeridas'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        admin = SuperAdmin.objects.get(email=admin_email)
        password_valid = bcrypt.checkpw(admin_password.encode('utf-8'), admin.password_hash.encode('utf-8'))
        logger.info(f"[CREAR USUARIO] Admin encontrado: {admin_email}, password_valid: {password_valid}")
        if not password_valid:
            return Response({'error': 'Credenciales de administrador inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
    except SuperAdmin.DoesNotExist:
        logger.error(f"[CREAR USUARIO] Admin no existe: {admin_email}")
        return Response({'error': 'No autorizado. Solo SuperAdmin puede crear usuarios.'}, status=status.HTTP_403_FORBIDDEN)

    # Datos del nuevo usuario
    email = request.data.get('correo_corporativo', '').strip()
    password = request.data.get('password', '').strip()
    id_permisos = request.data.get('id_permisos', 3)  # Default: Usuario

    logger.info(f"[CREAR USUARIO] Nuevo usuario datos: email={email}, password={'*****' if password else None}, id_permisos={id_permisos}")

    if not email or not password:
        logger.error(f"[CREAR USUARIO] Faltan datos del nuevo usuario: email={'Vacio' if not email else 'OK'}, password={'Vacio' if not password else 'OK'}")
        return Response({'error': 'Email y contraseña requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    # Verificar si el email ya existe
    if DatosEmpleado.objects.filter(correo_corporativo=email).exists():
        logger.error(f"[CREAR USUARIO] Email ya existe: {email}")
        return Response({'error': 'El correo ya está registrado'}, status=status.HTTP_400_BAD_REQUEST)

    # Encriptar contraseña
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Crear usuario
    empleado_data = {
        'correo_corporativo': email,
        'password_hash': password_hash,
        'id_permisos': id_permisos,
        'estado': 'ACTIVA',
        'primer_login': True,
        'datos_completados': False,
        'permitir_edicion_datos': False,
    }

    # Si se envían datos completos
    if request.data.get('primer_nombre'):
        empleado_data.update({
            'primer_nombre': request.data.get('primer_nombre'),
            'segundo_nombre': request.data.get('segundo_nombre', ''),
            'primer_apellido': request.data.get('primer_apellido'),
            'segundo_apellido': request.data.get('segundo_apellido', ''),
            'apodo': request.data.get('apodo', ''),
            'correo_personal': request.data.get('correo_personal', ''),
            'telefono': request.data.get('telefono', ''),
            'telefono_emergencia': request.data.get('telefono_emergencia', ''),
            'area_id': request.data.get('area_id'),
            'cargo_id': request.data.get('cargo_id'),
            'fecha_nacimiento': request.data.get('fecha_nacimiento'),
            'fecha_ingreso': request.data.get('fecha_ingreso'),
            'direccion': request.data.get('direccion', ''),
            'sexo': request.data.get('sexo', ''),
            'tipo_sangre': request.data.get('tipo_sangre', ''),
            'datos_completados': True,
            'primer_login': False,  # Si tiene todos los datos, no es primer login
        })
    else:
        # Si solo se crea con email/contraseña, usar placeholders
        empleado_data['primer_nombre'] = 'Por'
        empleado_data['primer_apellido'] = 'Completar'

    empleado = DatosEmpleado.objects.create(**empleado_data)

    # Generar código de verificación para primer login
    codigo_verificacion = generar_codigo_verificacion()
    cache_key = f"verificacion_{email}"
    cache.set(cache_key, {
        'codigo': codigo_verificacion,
        'empleado_id': empleado.id_empleado,
        'intentos': 0
    }, timeout=900)  # 15 minutos
    
    # Enviar email con código de verificación
    email_sent, email_result = enviar_email_verificacion(email, codigo_verificacion)
    
    if email_sent:
        logger.info(f"[CREAR USUARIO] Código de verificación enviado a {email}")
    else:
        logger.error(f"[CREAR USUARIO] Error enviando código: {email_result}")

    return Response({
        'message': 'Usuario creado exitosamente',
        'id_empleado': empleado.id_empleado,
        'correo_corporativo': empleado.correo_corporativo,
        'tipo_creacion': 'completo' if empleado.datos_completados else 'minimo',
        'primer_login': empleado.primer_login,
        'email_sent': email_sent,
        'codigo_verificacion': codigo_verificacion,  # Código para mostrar al SuperAdmin
        'nota': 'Comparta este código con el usuario para su primer login'
    }, status=status.HTTP_201_CREATED)


# Endpoint para completar datos en primer login - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
def completar_datos_empleado(request):
    """
    Endpoint para que el empleado complete sus datos en el primer login.
    No requiere contraseña en primer login, solo si edita posteriormente.
    """
    empleado_id = request.data.get('empleado_id')
    password = request.data.get('password')  # Solo requerido si NO es primer login

    if not empleado_id:
        return Response({'error': 'ID de empleado requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        empleado = DatosEmpleado.objects.get(id_empleado=empleado_id)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    # Verificar que sea primer login o tenga permitida la edición
    if not empleado.primer_login and not empleado.permitir_edicion_datos:
        return Response({'error': 'No tienes permiso para editar tus datos'}, status=status.HTTP_403_FORBIDDEN)

    # Verificar contraseña SOLO si NO es primer login (es edición posterior)
    if not empleado.primer_login and empleado.permitir_edicion_datos:
        if not password:
            return Response({'error': 'Contraseña requerida para verificar identidad'}, status=status.HTTP_400_BAD_REQUEST)
        if not empleado.password_hash or not bcrypt.checkpw(password.encode('utf-8'), empleado.password_hash.encode('utf-8')):
            return Response({'error': 'Contraseña incorrecta'}, status=status.HTTP_401_UNAUTHORIZED)

    # Actualizar datos
    campos_permitidos = [
        'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
        'apodo', 'correo_personal', 'telefono', 'telefono_emergencia', 'fecha_nacimiento',
        'direccion', 'sexo', 'tipo_sangre', 'area_id', 'cargo_id'
    ]

    for campo in campos_permitidos:
        if campo in request.data:
            setattr(empleado, campo, request.data[campo])

    # Cambiar contraseña SOLO si es primer login y se proporciona nueva_password
    password_cambiada = False
    logger.info(f"[COMPLETAR DATOS] primer_login={empleado.primer_login}, nueva_password recibida={request.data.get('nueva_password') is not None}")
    
    if empleado.primer_login:
        nueva_password = request.data.get('nueva_password')
        if nueva_password:
            password_hash = bcrypt.hashpw(nueva_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            empleado.password_hash = password_hash
            password_cambiada = True
            logger.info(f"[COMPLETAR DATOS] Contraseña cambiada para empleado {empleado_id}")
        else:
            logger.info(f"[COMPLETAR DATOS] No se proporcionó nueva contraseña")
    else:
        logger.warning(f"[COMPLETAR DATOS] NO es primer login, no se puede cambiar contraseña")

    # Marcar como completado y quitar primer_login
    empleado.datos_completados = True
    empleado.primer_login = False
    
    # Si estaba usando permiso de edición, revocarlo (un solo uso)
    permiso_revocado = False
    if not empleado.primer_login and empleado.permitir_edicion_datos:
        permiso_revocado = True
        logger.info(f"[COMPLETAR DATOS] REVOCANDO PERMISO de edición para empleado {empleado_id}")
    
    empleado.permitir_edicion_datos = False  # Deshabilitar después de usar
    empleado.save()
    logger.info(f"[COMPLETAR DATOS] Empleado {empleado_id} guardado. Password cambiada={password_cambiada}, permiso_revocado={permiso_revocado}")

    # Mensaje especial si se revocó el permiso
    mensaje = 'Datos actualizados exitosamente'
    if permiso_revocado:
        mensaje = 'Datos actualizados exitosamente. ATENCIÓN: El permiso de edición ha sido revocado. Contacta al administrador para futuras actualizaciones.'

    return Response({
        'message': mensaje,
        'datos_completados': True,
        'primer_login': False,
        'password_cambiada': password_cambiada,
        'permiso_revocado': permiso_revocado
    }, status=status.HTTP_200_OK)


# Endpoint para que Admin/SuperAdmin habiliten edición de datos
@api_view(['POST'])
@permission_classes([AllowAny])
def habilitar_edicion_datos(request):
    """
    Admin o SuperAdmin pueden habilitar la edición de datos para un usuario específico o para todos.
    """
    admin_email = request.data.get('admin_email')
    admin_password = request.data.get('admin_password')
    empleado_id = request.data.get('empleado_id')  # Si es null, aplica a todos
    habilitar = request.data.get('habilitar', True)

    if not admin_email or not admin_password:
        return Response({'error': 'Credenciales requeridas'}, status=status.HTTP_400_BAD_REQUEST)

    # Verificar que sea Admin o SuperAdmin
    es_superadmin = False
    es_admin = False

    try:
        admin = SuperAdmin.objects.get(email=admin_email)
        if bcrypt.checkpw(admin_password.encode('utf-8'), admin.password_hash.encode('utf-8')):
            es_superadmin = True
    except SuperAdmin.DoesNotExist:
        pass

    if not es_superadmin:
        try:
            admin_emp = DatosEmpleado.objects.get(correo_corporativo=admin_email, estado='ACTIVA', id_permisos=1)
            if admin_emp.password_hash and bcrypt.checkpw(admin_password.encode('utf-8'), admin_emp.password_hash.encode('utf-8')):
                es_admin = True
        except DatosEmpleado.DoesNotExist:
            pass

    if not es_superadmin and not es_admin:
        return Response({'error': 'No autorizado. Solo Admin o SuperAdmin.'}, status=status.HTTP_403_FORBIDDEN)

    # Aplicar cambios
    if empleado_id:
        # A un usuario específico
        try:
            empleado = DatosEmpleado.objects.get(id_empleado=empleado_id)
            empleado.permitir_edicion_datos = habilitar
            empleado.save()
            return Response({
                'message': f'Edición de datos {"habilitada" if habilitar else "deshabilitada"} para el empleado',
                'empleado_id': empleado_id
            })
        except DatosEmpleado.DoesNotExist:
            return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    else:
        # A todos los usuarios
        DatosEmpleado.objects.filter(estado='ACTIVA').update(permitir_edicion_datos=habilitar)
        return Response({
            'message': f'Edición de datos {"habilitada" if habilitar else "deshabilitada"} para todos los empleados activos'
        })

# Endpoint específico para SuperAdmin habilitar edición masiva - PÚBLICO (se valida dentro)
@api_view(['POST'])
@permission_classes([AllowAny])
def habilitar_edicion_masiva_superadmin(request):
    """
    Solo SuperAdmin puede habilitar la edición de datos para TODOS los empleados de golpe.
    Se requieren credenciales de SuperAdmin.
    """
    admin_email = request.data.get('admin_email')
    admin_password = request.data.get('admin_password')
    habilitar = request.data.get('habilitar', True)  # True = habilitar, False = deshabilitar

    if not admin_email or not admin_password:
        return Response({'error': 'Credenciales de SuperAdmin requeridas'}, status=status.HTTP_400_BAD_REQUEST)

    # Verificar que sea SuperAdmin (solo SuperAdmin, no Admin)
    try:
        admin = SuperAdmin.objects.get(email=admin_email)
        if not bcrypt.checkpw(admin_password.encode('utf-8'), admin.password_hash.encode('utf-8')):
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
    except SuperAdmin.DoesNotExist:
        return Response({'error': 'SuperAdmin no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    # Contar empleados activos antes de actualizar
    empleados_activos = DatosEmpleado.objects.filter(estado='ACTIVA').count()

    # Aplicar a TODOS los empleados activos
    actualizados = DatosEmpleado.objects.filter(estado='ACTIVA').update(permitir_edicion_datos=habilitar)

    mensaje = f'Edición de datos {"habilitada" if habilitar else "deshabilitada"} para {actualizados} empleados activos'
    logger.info(f"[HABILITAR MASIVO] SuperAdmin {admin_email}: {mensaje}")

    return Response({
        'success': True,
        'message': mensaje,
        'total_empleados': empleados_activos,
        'actualizados': actualizados,
        'habilitar': habilitar,
        'superadmin': admin_email
    }, status=status.HTTP_200_OK)


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
    queryset = DatosEmpleado.objects.all().order_by('-estado', 'primer_apellido', 'primer_nombre')
    serializer_class = DatosEmpleadoSerializer

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
        
        print(f"[DEBUG UPDATE] id_empleado: {instance.id_empleado}, request.user.id_empleado: {getattr(request.user, 'id_empleado', None)}")
        print(f"[DEBUG UPDATE] is_own_profile: {is_own_profile}")
        print(f"[DEBUG UPDATE] primer_login: {instance.primer_login}, permitir_edicion_datos: {instance.permitir_edicion_datos}")
        print(f"[DEBUG UPDATE] password en request: {request.data.get('password')}")
        
        # Si NO es primer login y tiene permitir_edicion_datos, y es el propio usuario
        if not instance.primer_login and instance.permitir_edicion_datos and is_own_profile:
            # El frontend envía 'password' (no 'current_password')
            current_password = request.data.get('password')
            if not current_password:
                return Response(
                    {'error': 'Debes proporcionar tu contraseña actual para actualizar los datos'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Validar contraseña
            if not (instance.password_hash and bcrypt.checkpw(current_password.encode('utf-8'), instance.password_hash.encode('utf-8'))):
                return Response(
                    {'error': 'Contraseña actual incorrecta'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        # Preparar datos para el serializer
        data = request.data.copy()
        
        # Si está usando permiso de edición y es el propio usuario, revocar después de actualizar (UN SOLO USO)
        if not instance.primer_login and instance.permitir_edicion_datos and is_own_profile:
            print(f"[DEBUG UPDATE] REVOCANDO PERMISO - Un solo uso")
            data['permitir_edicion_datos'] = False
            data['datos_completados'] = True
        
        serializer = self.get_serializer(instance, data=data, partial=partial)
        
        if not serializer.is_valid():
            print(f"[ERROR VALIDACIÓN] Empleado {instance.id_empleado}: {serializer.errors}")
            return Response(
                {'error': 'Datos inválidos', 'detalles': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.perform_update(serializer)
        
        # Preparar respuesta con mensaje si se revocó el permiso
        response_data = serializer.data.copy()
        if not instance.primer_login and request.data.get('password') and is_own_profile:
            response_data['mensaje'] = 'Datos actualizados exitosamente. El permiso de edición ha sido revocado. Contacta al administrador para futuras actualizaciones.'
        
        return Response(response_data)
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """
        Cambiar estado del empleado (ACTIVA/INACTIVA)
        Espera: {estado: 'ACTIVA' o 'INACTIVA'}
        """
        try:
            empleado = self.get_object()
            nuevo_estado = request.data.get('estado')
            
            if nuevo_estado not in ['ACTIVA', 'INACTIVA']:
                return Response(
                    {'error': 'Estado inválido. Use ACTIVA o INACTIVA'},
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


class TareasCalendarioViewSet(viewsets.ModelViewSet):
    queryset = TareasCalendario.objects.all().order_by('fecha_vencimiento')
    serializer_class = TareasCalendarioSerializer

    def get_queryset(self):
        queryset = TareasCalendario.objects.all().order_by('fecha_vencimiento')

        # Parámetros de filtrado por rol (enviados desde frontend)
        user_role = self.request.query_params.get('user_role')
        user_id = self.request.query_params.get('user_id')
        user_area_id = self.request.query_params.get('user_area_id')
        empleado_id = self.request.query_params.get('empleado_id')

        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[TAREAS DEBUG] user_role={user_role}, user_id={user_id}, user_area_id={user_area_id}, empleado_id={empleado_id}")
        logger.info(f"[TAREAS DEBUG] Total tareas antes de filtrar: {queryset.count()}")

        # Filtros según el rol del usuario
        if user_role == 'usuario' and user_id:
            # Usuario: solo ve tareas personales asignadas a él
            queryset = queryset.filter(empleado_id=user_id)
        elif user_role == 'editor' and user_area_id:
            # Editor: ve tareas de su área + tareas personales asignadas a él
            if user_id:
                queryset = queryset.filter(
                    Q(area_id=user_area_id) | Q(empleado_id=user_id)
                )
            else:
                queryset = queryset.filter(area_id=user_area_id)
        # SuperAdmin y Admin ven todas las tareas (sin filtro adicional)

        # Filtro adicional por empleado específico si se solicita
        if empleado_id:
            queryset = queryset.filter(empleado_id=empleado_id)

        logger.info(f"[TAREAS DEBUG] Total tareas después de filtrar: {queryset.count()}")
        return queryset

    def create(self, request, *args, **kwargs):
        # Validar permisos según el rol para crear tareas
        user_role = request.data.get('user_role')
        user_area_id = request.data.get('user_area_id')
        area_id = request.data.get('area_id')
        empleado_id = request.data.get('empleado_id')

        # DEBUG: Log de lo que recibe el backend
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[CREATE DEBUG] area_id={area_id} (type={type(area_id)}), empleado_id={empleado_id} (type={type(empleado_id)})")
        logger.info(f"[CREATE DEBUG] Full request data: {request.data}")

        # Determinar tipo de asignación
        if not area_id and not empleado_id:
            tipo = 'general'  # Sin área ni empleado = tarea general
        elif area_id and not empleado_id:
            tipo = 'area'     # Solo área = tarea para área
        else:
            tipo = 'personal' # Con empleado = tarea personal

        # Validar permisos
        if user_role == 'editor':
            # Editor solo puede crear tareas para su área o personal de su área
            if tipo == 'general':
                return Response(
                    {'error': 'No tienes permisos para crear tareas generales'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if area_id and str(area_id) != str(user_area_id):
                return Response(
                    {'error': 'Solo puedes crear tareas para tu área asignada'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user_role == 'usuario':
            # Usuario no puede crear tareas
            return Response(
                {'error': 'No tienes permisos para crear tareas'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Permitir la creación
        response = super().create(request, *args, **kwargs)
        
        # DEBUG: Log de lo que se guardó
        if response.status_code == 201:
            tarea_id = response.data.get('id')
            if tarea_id:
                tarea_guardada = TareasCalendario.objects.get(id=tarea_id)
                logger.info(f"[CREATE DEBUG] TAREA GUARDADA: id={tarea_id}, area_id={tarea_guardada.area_id}, empleado_id={tarea_guardada.empleado_id}")
        
        return response

    @action(detail=False, methods=['get'])
    def por_empleado(self, request):
        empleado_id = request.query_params.get('empleado_id')
        if not empleado_id:
            return Response({'error': 'empleado_id requerido'}, status=status.HTTP_400_BAD_REQUEST)

        tareas = TareasCalendario.objects.filter(empleado_id=empleado_id)
        serializer = self.get_serializer(tareas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def por_rol(self, request):
        """
        Endpoint específico para obtener tareas según el rol del usuario.
        Espera: user_role, user_id, user_area_id (opcional)
        """
        user_role = request.query_params.get('user_role')
        user_id = request.query_params.get('user_id')
        user_area_id = request.query_params.get('user_area_id')

        if not user_role or not user_id:
            return Response(
                {'error': 'user_role y user_id son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = TareasCalendario.objects.all().order_by('fecha_vencimiento')

        if user_role == 'usuario':
            # Usuario: solo sus tareas personales
            queryset = queryset.filter(empleado_id=user_id)
        elif user_role == 'editor':
            # Editor: tareas de su área + sus tareas personales
            if user_area_id:
                queryset = queryset.filter(
                    Q(area_id=user_area_id) | Q(empleado_id=user_id)
                )
            else:
                queryset = queryset.filter(empleado_id=user_id)
        # SuperAdmin/Admin: todas las tareas

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'tareas': serializer.data,
            'filtro_aplicado': user_role,
            'total': queryset.count()
        })


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
            data = request.data.copy()
            data['orden'] = max_orden + 1
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


class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all().order_by('orden')
    serializer_class = CursoSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get('orden'):
            max_orden = Curso.objects.aggregate(django_models.Max('orden'))['orden__max'] or 0
            data['orden'] = max_orden + 1
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================================
# VERIFICACIÓN DE EMAIL CON CÓDIGO (2FA)
# ============================================

# Endpoint para enviar código de verificación - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
def enviar_codigo_verificacion(request):
    """
    Envía código de verificación al email del usuario
    Espera: email
    """
    email = request.data.get('email', '').strip().lower()
    
    if not email:
        return Response({'error': 'Email requerido'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verificar que el email existe en la base de datos
    try:
        empleado = DatosEmpleado.objects.get(correo_corporativo=email)
    except DatosEmpleado.DoesNotExist:
        # No revelar si el email existe o no (seguridad)
        return Response({
            'message': 'Si el email existe, se enviará un código de verificación'
        })
    
    # Generar código
    codigo = generar_codigo_verificacion()
    
    # Guardar en cache por 15 minutos
    cache_key = f"verificacion_{email}"
    cache.set(cache_key, {
        'codigo': codigo,
        'empleado_id': empleado.id_empleado,
        'intentos': 0
    }, timeout=900)  # 15 minutos
    
    # Enviar email
    success, result = enviar_email_verificacion(email, codigo)
    
    if success:
        logger.info(f"[VERIFICACION] Código enviado a {email}")
        return Response({
            'message': 'Código de verificación enviado',
            'email_enviado': True
        })
    else:
        logger.error(f"[VERIFICACION] Error enviando a {email}: {result}")
        return Response({
            'error': 'No se pudo enviar el código',
            'detalle': str(result)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Endpoint para verificar código y completar login - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
def verificar_codigo_login(request):
    """
    Verifica código y completa el login
    Espera: email, codigo
    """
    email = request.data.get('email', '').strip().lower()
    codigo_ingresado = request.data.get('codigo', '').strip()
    password = request.data.get('password', '')  # Opcional, para primer login
    
    if not email or not codigo_ingresado:
        return Response({'error': 'Email y código requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Obtener de cache
    cache_key = f"verificacion_{email}"
    datos_cache = cache.get(cache_key)
    
    if not datos_cache:
        return Response({
            'error': 'Código expirado o no solicitado'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verificar intentos
    if datos_cache.get('intentos', 0) >= 3:
        cache.delete(cache_key)
        return Response({
            'error': 'Demasiados intentos. Solicita un nuevo código'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verificar código
    if datos_cache['codigo'] != codigo_ingresado:
        datos_cache['intentos'] += 1
        cache.set(cache_key, datos_cache, timeout=900)
        return Response({
            'error': 'Código incorrecto',
            'intentos_restantes': 3 - datos_cache['intentos']
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Código correcto - obtener empleado
    try:
        empleado = DatosEmpleado.objects.get(id_empleado=datos_cache['empleado_id'])
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    
    # Verificar password si es necesario (primer login)
    if empleado.primer_login and not password:
        return Response({
            'error': 'Contraseña requerida para primer login',
            'primer_login': True
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if empleado.primer_login and password:
        if not bcrypt.checkpw(password.encode('utf-8'), empleado.password_hash.encode('utf-8')):
            return Response({'error': 'Contraseña incorrecta'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Login exitoso - limpiar cache y actualizar actividad
    cache.delete(cache_key)
    
    # Actualizar última actividad
    from django.utils import timezone
    empleado.ultima_actividad = timezone.now()
    empleado.save(update_fields=['ultima_actividad'])
    
    # Determinar si necesita completar datos
    necesita_completar = empleado.primer_login or not empleado.datos_completados
    
    logger.info(f"[VERIFICACION] Login exitoso para {email}")

    tokens = generate_tokens(build_empleado_payload(empleado))

    return Response({
        'message': 'Verificación exitosa',
        'user': {
            'id_empleado': empleado.id_empleado,
            'correo_corporativo': empleado.correo_corporativo,
            'id_permisos': empleado.id_permisos,
            'primer_login': empleado.primer_login,
            'datos_completados': empleado.datos_completados,
        },
        'necesita_completar_datos': necesita_completar,
        **tokens,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def actividad_reciente(request):
    """
    Obtiene usuarios activos recientemente.
    Retorna:
    - activos: usuarios con actividad en últimos 10 minutos (En línea)
    - recientes: usuarios con actividad en últimas 24 horas (Desconectados)
    """
    from django.utils import timezone
    from datetime import timedelta
    
    ahora = timezone.now()
    limite_activo = ahora - timedelta(minutes=10)  # En línea (10 minutos - usuarios concurrentes)
    limite_reciente = ahora - timedelta(hours=24)  # Reciente (24 horas)
    
    # DEBUG: Log de búsqueda
    logger.info(f"[ACTIVIDAD] Buscando actividad desde {limite_reciente} hasta {ahora}")
    
    from django.db.models import Q, F
    
    # Empleados activos (últimos 10 min) - usando ultima_actividad
    # Solo usuarios con actividad real reciente se consideran "en línea"
    activos = DatosEmpleado.objects.filter(
        ultima_actividad__gte=limite_activo,
        estado='ACTIVA'
    ).order_by('-ultima_actividad')
    
    logger.info(f"[ACTIVIDAD] Empleados activos encontrados: {activos.count()}")
    
    # Superadmins activos
    admins_activos = SuperAdmin.objects.filter(
        last_login__gte=limite_activo
    ).order_by('-last_login')
    
    logger.info(f"[ACTIVIDAD] SuperAdmins activos encontrados: {admins_activos.count()}")
    
    # Empleados recientes (últimas 24 horas, pero no en línea actualmente)
    # Incluye: actividad entre 10min y 24h, o sin actividad pero con fecha_ingreso reciente
    recientes = DatosEmpleado.objects.filter(
        Q(ultima_actividad__gte=limite_reciente, ultima_actividad__lt=limite_activo) |
        Q(ultima_actividad__isnull=True, fecha_ingreso__gte=limite_reciente),
        estado='ACTIVA'
    ).exclude(
        id_empleado__in=list(activos.values_list('id_empleado', flat=True))
    ).order_by('-ultima_actividad')
    
    logger.info(f"[ACTIVIDAD] Empleados recientes encontrados: {recientes.count()}")
    
    # Superadmins recientes
    admins_recientes = SuperAdmin.objects.filter(
        last_login__gte=limite_reciente,
        last_login__lt=limite_activo
    ).order_by('-last_login')
    
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
    
    return Response({
        'total_en_linea': len(activos_data),
        'total_recientes': len(recientes_data),
        'activos': activos_data,
        'recientes': recientes_data,
        'timestamp': ahora.isoformat()
    })


# Endpoint para registrar intento de recuperación - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
def registrar_intento_recuperacion(request):
    """
    Registra un intento de recuperación de contraseña en la base de datos
    Espera: email
    Retorna: información completa del usuario si existe
    """
    from .models import Alerta
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
    
    logger.warning(f"[ALERTA] Intento de recuperación de contraseña: {email} - {'EXISTE' if existe_en_sistema else 'NO EXISTE'}")
    
    # Preparar respuesta con información completa
    response_data = {
        'message': 'Intento registrado',
        'alerta': {
            'id': alerta.id,
            'email': email,
            'nombre': nombre_solicitante,
            'rol': rol_solicitante,
            'existe_en_sistema': existe_en_sistema,
            'timestamp': alerta.fecha_creacion.isoformat(),
            'estado': alerta.estado_alerta
        }
    }
    
    # Si existe, agregar información completa del empleado
    if empleado:
        response_data['alerta']['empleado_info'] = {
            'id': empleado.id_empleado,
            'nombre_completo': f"{empleado.primer_nombre} {empleado.segundo_nombre or ''} {empleado.primer_apellido} {empleado.segundo_apellido or ''}".strip(),
            'correo': empleado.correo_corporativo,
            'telefono': empleado.telefono,
            'area': empleado.area.nombre_area if empleado.area else None,
            'cargo': empleado.cargo.nombre_cargo if empleado.cargo else None,
            'fecha_ingreso': empleado.fecha_ingreso.isoformat() if empleado.fecha_ingreso else None,
            'estado': empleado.estado,
            'direccion': empleado.direccion
        }
    elif admin:
        response_data['alerta']['admin_info'] = {
            'id': admin.id,
            'nombre': f"{admin.nombre} {admin.apellido}",
            'email': admin.email,
            'rol': 'SuperAdmin'
        }
    
    return Response(response_data)


# Endpoint para obtener alertas de recuperación - PÚBLICO
@api_view(['GET'])
@permission_classes([AllowAny])
def get_alertas_recuperacion(request):
    """
    Obtiene las alertas de recuperación de contraseña (últimas 24 horas)
    desde la base de datos PostgreSQL
    """
    from .models import Alerta
    from django.utils import timezone
    from datetime import timedelta
    
    limite = timezone.now() - timedelta(hours=24)
    
    # Obtener alertas de las últimas 24 horas
    alertas_query = Alerta.objects.filter(
        tipo='recuperacion_password',
        fecha_creacion__gte=limite
    ).order_by('-fecha_creacion')
    
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
                'telefono': emp.telefono,
                'area': emp.area.nombre_area if emp.area else None,
                'cargo': emp.cargo.nombre_cargo if emp.cargo else None,
                'fecha_ingreso': emp.fecha_ingreso.isoformat() if emp.fecha_ingreso else None,
                'estado': emp.estado,
                'direccion': emp.direccion
            }
        
        alertas_list.append(alerta_data)
    
    return Response({
        'total': len(alertas_list),
        'alertas': alertas_list
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def ping_actividad(request):
    """
    Actualiza la última actividad del usuario (heartbeat).
    Espera: email del usuario logueado
    """
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email requerido'}, status=status.HTTP_400_BAD_REQUEST)
    
    from django.utils import timezone
    
    # Buscar empleado o admin
    empleado = DatosEmpleado.objects.filter(correo_corporativo=email).first()
    admin = SuperAdmin.objects.filter(email=email).first() if not empleado else None
    
    if empleado:
        empleado.ultima_actividad = timezone.now()
        empleado.save(update_fields=['ultima_actividad'])
        return Response({
            'message': 'Actividad actualizada',
            'user': f"{empleado.primer_nombre} {empleado.primer_apellido}",
            'timestamp': timezone.now().isoformat()
        })
    elif admin:
        # Para SuperAdmin usamos last_login
        admin.last_login = timezone.now()
        admin.save(update_fields=['last_login'])
        return Response({
            'message': 'Actividad actualizada',
            'user': f"{admin.nombre} {admin.apellido}",
            'timestamp': timezone.now().isoformat()
        })
    
    return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def atender_alerta(request, alerta_id):
    """
    Marca una alerta como atendida
    """
    from .models import Alerta
    from django.utils import timezone
    
    try:
        alerta = Alerta.objects.get(id=alerta_id)
        alerta.estado_alerta = 'atendida'
        alerta.fecha_actualizacion = timezone.now()
        # Intentar obtener el admin del request si está autenticado
        alerta.save()
        
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
@permission_classes([AllowAny])
def eliminar_alerta(request, alerta_id):
    """
    Elimina una alerta permanentemente
    """
    from .models import Alerta
    
    try:
        alerta = Alerta.objects.get(id=alerta_id)
        alerta.delete()
        
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


@api_view(['POST'])
@permission_classes([AllowAny])
def actualizar_password_empleado(request, empleado_id):
    """
    Actualiza la contraseña de un empleado (solo para SuperAdmin)
    """
    import bcrypt
    
    try:
        empleado = DatosEmpleado.objects.get(id_empleado=empleado_id)
        
        # Obtener la nueva contraseña del body
        nueva_password = request.data.get('nueva_password')
        admin_email = request.data.get('admin_email')
        admin_password = request.data.get('admin_password')
        
        if not nueva_password:
            return Response({
                'success': False,
                'error': 'La nueva contraseña es requerida'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(nueva_password) < 6:
            return Response({
                'success': False,
                'error': 'La contraseña debe tener al menos 6 caracteres'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validación de SuperAdmin (opcional para facilitar pruebas)
        # Si se proporciona admin_email y admin_password, verificar que sea un SuperAdmin válido
        if admin_email:
            try:
                admin = SuperAdmin.objects.get(email=admin_email)
                # Si se proporciona admin_password y el admin tiene password_hash, intentar validar
                if admin_password and admin.password_hash:
                    try:
                        if not bcrypt.checkpw(admin_password.encode('utf-8'), admin.password_hash.encode('utf-8')):
                            # Modo desarrollo: permitir aunque no coincida, pero loggear
                            print(f"[DEBUG] Contraseña de admin no coincide, pero permitiendo en modo desarrollo")
                            print(f"[DEBUG] Email: {admin_email}")
                    except Exception as bcrypt_error:
                        # Si hay error en bcrypt (formato inválido, etc), permitir en modo desarrollo
                        print(f"[DEBUG] Error validando bcrypt: {bcrypt_error}")
                        print(f"[DEBUG] Continuando en modo desarrollo...")
                # Si no hay password_hash o no se proporcionó admin_password, permitir (modo desarrollo)
            except SuperAdmin.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Administrador no encontrado'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Generar hash de la nueva contraseña
        hashed = bcrypt.hashpw(nueva_password.encode('utf-8'), bcrypt.gensalt())
        empleado.password_hash = hashed.decode('utf-8')
        empleado.save(update_fields=['password_hash'])
        
        return Response({
            'success': True,
            'message': 'Contraseña actualizada exitosamente',
            'empleado_id': empleado_id,
            'empleado_nombre': f"{empleado.primer_nombre} {empleado.primer_apellido}"
        })
        
    except DatosEmpleado.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Empleado no encontrado'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── JWT Refresh ────────────────────────────────────────────────────────────────

# Endpoint para renovar access token - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """
    Renueva el access token usando el refresh token.
    Body: { "refreshToken": "<token>" }
    Devuelve: { "accessToken": "...", "refreshToken": "..." }
    """
    refresh_token = request.data.get('refreshToken')
    if not refresh_token:
        return Response({'error': 'refreshToken requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = decode_token(refresh_token)
    except pyjwt.ExpiredSignatureError:
        return Response({'error': 'Refresh token expirado'}, status=status.HTTP_401_UNAUTHORIZED)
    except pyjwt.PyJWTError:
        return Response({'error': 'Refresh token inválido'}, status=status.HTTP_401_UNAUTHORIZED)

    if payload.get('token_type') != 'refresh':
        return Response({'error': 'Token no es de tipo refresh'}, status=status.HTTP_401_UNAUTHORIZED)

    user_type = payload.get('type')
    sub = payload.get('sub')

    try:
        if user_type == 'superadmin':
            admin = SuperAdmin.objects.get(id=sub)
            tokens = generate_tokens(build_superadmin_payload(admin))
        else:
            empleado = DatosEmpleado.objects.get(id_empleado=sub, estado='ACTIVA')
            tokens = generate_tokens(build_empleado_payload(empleado))
    except (SuperAdmin.DoesNotExist, DatosEmpleado.DoesNotExist):
        return Response({'error': 'Usuario no encontrado o inactivo'}, status=status.HTTP_401_UNAUTHORIZED)

    return Response(tokens)
