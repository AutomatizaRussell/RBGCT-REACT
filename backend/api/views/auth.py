"""
Autenticación y gestión de sesión:
login, crear usuario, completar datos, habilitar edición, verificación 2FA, refresh token.
"""
import jwt as pyjwt
import logging

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
import bcrypt

from ..models import SuperAdmin, DatosEmpleado, Persona, DatosContacto
from ..jwt_utils import generate_tokens, decode_token, build_superadmin_payload, build_empleado_payload
from ..permissions import IsSuperAdminUser, IsAdminOrSuperAdmin
from ..throttles import LoginThrottle, EnviarCodigoThrottle, VerificarCodigoThrottle

from ._utils import (
    generar_codigo_verificacion,
    _es_superadmin,
    _es_empleado,
)
from ..n8n_gateway import enviar_bienvenida, enviar_codigo_login

logger = logging.getLogger(__name__)


# Endpoint de Login - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login_view(request):
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''

    if not email or not password:
        return Response({'error': 'Email y password requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    # 1. Verificar si es SuperAdmin
    from django.contrib.auth import authenticate as django_authenticate
    from django.utils import timezone as tz
    admin = django_authenticate(request, username=email, password=password)
    if admin is not None:
        admin.last_login = tz.now()
        admin.save(update_fields=['last_login'])
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

    # 2. Verificar si es Empleado
    try:
        empleado = DatosEmpleado.objects.select_related('persona').only(
            'id_empleado', 'correo_corporativo', 'id_permisos', 'estado',
            'area_id', 'cargo_id', 'primer_login', 'datos_completados',
            'permitir_edicion_datos', 'acceso_formularios_sqf',
            'acceso_sqf_clientes', 'acceso_sqf_contratos',
            'acceso_sqf_facturacion', 'acceso_sqf_auditoria', 'password_hash', 'persona',
            'persona__primer_nombre', 'persona__segundo_nombre',
            'persona__primer_apellido', 'persona__segundo_apellido',
        ).get(correo_corporativo=email, estado='ACTIVA')
        if empleado.password_hash and bcrypt.checkpw(password.encode('utf-8'), empleado.password_hash.encode('utf-8')):

            from django.utils import timezone
            empleado.ultima_actividad = timezone.now()
            empleado.save(update_fields=['ultima_actividad'])

            # Primer login: requiere verificación por código
            if empleado.primer_login:
                # Marcar en cache que la contraseña ya fue validada en este paso.
                # Así evitamos recalcular bcrypt en la verificación del código.
                cache_key = f"verificacion_{email}"
                datos_cache = cache.get(cache_key)
                if isinstance(datos_cache, dict) and str(datos_cache.get('empleado_id')) == str(empleado.id_empleado):
                    datos_cache['password_verificada'] = True
                    cache.set(cache_key, datos_cache, timeout=900)
                else:
                    # No hay código vigente (el generado al crear el usuario dura
                    # solo 15 min): generar y enviar uno nuevo para que el primer
                    # login no dependa de ese email inicial.
                    codigo = generar_codigo_verificacion()
                    cache.set(cache_key, {
                        'codigo': codigo,
                        'empleado_id': empleado.id_empleado,
                        'intentos': 0,
                        'password_verificada': True,
                    }, timeout=900)
                    enviar_codigo_login(email, codigo)

                return Response({
                    'type': 'empleado',
                    'user': {
                        'id_empleado': empleado.id_empleado,
                        'correo_corporativo': empleado.correo_corporativo,
                        'id_permisos': empleado.id_permisos,
                        'primer_login': True,
                        'datos_completados': empleado.datos_completados,
                        'acceso_formularios_sqf': empleado.acceso_formularios_sqf,
                        'acceso_sqf_clientes': empleado.acceso_sqf_clientes,
                        'acceso_sqf_contratos': empleado.acceso_sqf_contratos,
                        'acceso_sqf_facturacion': empleado.acceso_sqf_facturacion,
                        'acceso_sqf_auditoria': empleado.acceso_sqf_auditoria,
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
                    'acceso_formularios_sqf': empleado.acceso_formularios_sqf,
                    'acceso_sqf_clientes': empleado.acceso_sqf_clientes,
                    'acceso_sqf_contratos': empleado.acceso_sqf_contratos,
                    'acceso_sqf_facturacion': empleado.acceso_sqf_facturacion,
                    'acceso_sqf_auditoria': empleado.acceso_sqf_auditoria,
                },
                **tokens,
            })
        else:
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)


# Endpoint para crear usuarios (solo SuperAdmin)
@api_view(['POST'])
@permission_classes([IsSuperAdminUser])
def crear_usuario_superadmin(request):
    """
    Solo SuperAdmin puede crear usuarios.
    Puede crear con datos completos o solo correo+contraseña.
    """
    request_keys = sorted(list(request.data.keys()))
    logger.info(f"[CREAR USUARIO] Request recibido con campos: {request_keys}")

    # Verificar que sea SuperAdmin (enviar credenciales en el request)
    admin_email = request.data.get('admin_email', '').strip()
    admin_password = request.data.get('admin_password', '').strip()

    if not admin_email or not admin_password:
        logger.error(f"[CREAR USUARIO] Faltan credenciales: admin_email={admin_email}, admin_password={'*****' if admin_password else None}")
        return Response({'error': 'Credenciales de administrador requeridas'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        admin = SuperAdmin.objects.get(email=admin_email)
        password_valid = admin.check_password(admin_password)
        logger.info(f"[CREAR USUARIO] Admin encontrado: {admin_email}, password_valid: {password_valid}")
        if not password_valid:
            return Response({'error': 'Credenciales de administrador inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
    except SuperAdmin.DoesNotExist:
        logger.error(f"[CREAR USUARIO] Admin no existe: {admin_email}")
        return Response({'error': 'No autorizado. Solo SuperAdmin puede crear usuarios.'}, status=status.HTTP_403_FORBIDDEN)

    # Datos del nuevo usuario (email en minúsculas: login y cache 2FA lo normalizan así)
    email = request.data.get('correo_corporativo', '').strip().lower()
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

    # Separar datos en capas: Persona / Contacto / Vínculo laboral
    tiene_datos_completos = bool(request.data.get('primer_nombre'))

    persona_data = {
        'primer_nombre': request.data.get('primer_nombre') or 'Por',
        'segundo_nombre': request.data.get('segundo_nombre') or '',
        'primer_apellido': request.data.get('primer_apellido') or 'Completar',
        'segundo_apellido': request.data.get('segundo_apellido') or '',
        'apodo': request.data.get('apodo') or '',
        'fecha_nacimiento': request.data.get('fecha_nacimiento') or None,
        'sexo': request.data.get('sexo') or None,
        'tipo_sangre': request.data.get('tipo_sangre') or None,
        'lugar_expedicion': request.data.get('lugar_expedicion') or None,
        'fecha_expedicion': request.data.get('fecha_expedicion') or None,
    }
    contacto_data = {
        'correo_personal':             request.data.get('correo_personal') or None,
        'telefono':                    request.data.get('telefono') or None,
        'telefono_emergencia':         request.data.get('telefono_emergencia') or None,
        'nombre_contacto_emergencia':  request.data.get('nombre_contacto_emergencia') or None,
        'parentesco_emergencia':       request.data.get('parentesco_emergencia') or None,
        'direccion':                   request.data.get('direccion') or None,
    }
    persona = Persona.objects.create(**persona_data)
    DatosContacto.objects.create(persona=persona, **contacto_data)

    empleado = DatosEmpleado.objects.create(
        persona=persona,
        correo_corporativo=email,
        password_hash=password_hash,
        id_permisos=id_permisos,
        area_id=request.data.get('area_id'),
        cargo_id=request.data.get('cargo_id'),
        fecha_ingreso=request.data.get('fecha_ingreso') or None,
        estado='ACTIVA',
        primer_login=not tiene_datos_completos,
        datos_completados=tiene_datos_completos,
        permitir_edicion_datos=False,
    )

    # Generar código de verificación para primer login
    codigo_verificacion = generar_codigo_verificacion()
    cache_key = f"verificacion_{email}"
    cache.set(cache_key, {
        'codigo': codigo_verificacion,
        'empleado_id': empleado.id_empleado,
        'intentos': 0
    }, timeout=900)  # 15 minutos

    nombre_usuario = empleado.primer_nombre if empleado.primer_nombre != 'Por' else None
    email_sent, email_result = enviar_bienvenida(
        email=email,
        codigo=codigo_verificacion,
        password=password,
        nombre=nombre_usuario,
    )
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
    }, status=status.HTTP_201_CREATED)


# Endpoint para completar datos en primer login.
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def completar_datos_empleado(request):
    """
    Endpoint para que el empleado complete sus datos en el primer login.
    No requiere contraseña en primer login, solo si edita posteriormente.
    """
    empleado_id = request.data.get('empleado_id')
    password = request.data.get('password')  # Solo requerido si NO es primer login

    if not empleado_id:
        return Response({'error': 'ID de empleado requerido'}, status=status.HTTP_400_BAD_REQUEST)

    if not _es_superadmin(request.user):
        if not _es_empleado(request.user) or str(request.user.id_empleado) != str(empleado_id):
            return Response({'error': 'Solo puedes completar tus propios datos'},
                            status=status.HTTP_403_FORBIDDEN)

    try:
        empleado = DatosEmpleado.objects.get(id_empleado=empleado_id)
    except DatosEmpleado.DoesNotExist:
        return Response({'error': 'Empleado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    # Verificar que sea primer login o tenga permitida la edición
    if not empleado.primer_login and not empleado.permitir_edicion_datos:
        return Response({'error': 'No tienes permiso para editar tus datos'}, status=status.HTTP_403_FORBIDDEN)

    # Validar la nueva contraseña antes de tocar la base de datos
    nueva_password_solicitada = request.data.get('nueva_password')
    if empleado.primer_login and nueva_password_solicitada and len(nueva_password_solicitada) < 6:
        return Response({'error': 'La contraseña debe tener al menos 6 caracteres'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Resolver conflicto de número de documento ANTES de guardar
    numero_documento = request.data.get('numero_documento')
    if numero_documento:
        conflicto = Persona.objects.filter(
            numero_documento=numero_documento
        ).exclude(pk=empleado.persona_id).first()
        if conflicto:
            if not DatosEmpleado.objects.filter(persona=conflicto).exists():
                logger.warning(
                    f"[COMPLETAR DATOS] Eliminando persona residual {conflicto.pk} "
                    f"que retenía el documento {numero_documento}"
                )
                conflicto.delete()
            else:
                return Response({
                    'error': 'El número de documento ya está registrado por otro empleado. '
                             'Verifica el dato o contacta al administrador.'
                }, status=status.HTTP_409_CONFLICT)

    from django.db import transaction, IntegrityError

    try:
        with transaction.atomic():
            # Actualizar Persona (datos de identidad)
            campos_persona = ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
                              'apodo', 'tipo_documento', 'numero_documento',
                              'lugar_expedicion', 'fecha_expedicion',
                              'fecha_nacimiento', 'sexo', 'tipo_sangre']
            persona_actualizada = False
            for campo in campos_persona:
                if campo in request.data:
                    setattr(empleado.persona, campo, request.data[campo])
                    persona_actualizada = True
            if persona_actualizada:
                empleado.persona.save()

            # Actualizar DatosContacto
            campos_contacto = ['correo_personal', 'telefono', 'telefono_emergencia',
                               'nombre_contacto_emergencia', 'parentesco_emergencia', 'direccion']
            contacto_data = {c: request.data[c] for c in campos_contacto if c in request.data}
            if contacto_data:
                contacto, _ = DatosContacto.objects.get_or_create(persona=empleado.persona)
                for campo, valor in contacto_data.items():
                    setattr(contacto, campo, valor)
                contacto.save()

            # Actualizar campos laborales en DatosEmpleado
            for campo in ['area_id', 'cargo_id', 'fecha_ingreso']:
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

            # Capturar el estado ANTES de mutar, para la lógica posterior
            era_primer_login = empleado.primer_login

            # Marcar como completado y quitar primer_login
            empleado.datos_completados = True
            empleado.primer_login = False

            # Si estaba usando permiso de edición (no es primer login), revocarlo (un solo uso)
            permiso_revocado = False
            if not era_primer_login and empleado.permitir_edicion_datos:
                permiso_revocado = True
                logger.info(f"[COMPLETAR DATOS] REVOCANDO PERMISO de edición para empleado {empleado_id}")

            empleado.permitir_edicion_datos = False  # Deshabilitar después de usar
            empleado.save()
    except IntegrityError as e:
        logger.error(f"[COMPLETAR DATOS] IntegrityError para empleado {empleado_id}: {e}")
        return Response({
            'error': 'Alguno de los datos ya está registrado (documento duplicado). '
                     'Verifica la información o contacta al administrador.'
        }, status=status.HTTP_409_CONFLICT)

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


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
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
        if admin.check_password(admin_password):
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


@api_view(['POST'])
@permission_classes([IsSuperAdminUser])
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
        if not admin.check_password(admin_password):
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


# Endpoint para enviar código de verificación - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([EnviarCodigoThrottle])
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

    # Guardar en cache por 15 minutos, preservando la validación de contraseña
    cache_key = f"verificacion_{email}"
    datos_prev = cache.get(cache_key)
    password_verificada = bool(
        isinstance(datos_prev, dict)
        and datos_prev.get('password_verificada')
        and str(datos_prev.get('empleado_id')) == str(empleado.id_empleado)
    )
    cache.set(cache_key, {
        'codigo': codigo,
        'empleado_id': empleado.id_empleado,
        'intentos': 0,
        'password_verificada': password_verificada,
    }, timeout=900)  # 15 minutos

    enviar_codigo_login(email, codigo)
    logger.info(f"[VERIFICACION] Código despachado a {email}")
    return Response({
        'message': 'Código de verificación enviado',
        'email_enviado': True
    })


# Endpoint para verificar código y completar login - PÚBLICO
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([VerificarCodigoThrottle])
def verificar_codigo_login(request):
    """
    Verifica código y completa el login
    Espera: email, codigo
    """
    email = request.data.get('email', '').strip().lower()
    codigo_ingresado = request.data.get('codigo', '').strip()
    password = request.data.get('password', '')  # Compatibilidad con clientes antiguos

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

    # Optimización: si el login inicial ya validó contraseña, evitar recalcular bcrypt aquí.
    password_ya_verificada = (
        bool(datos_cache.get('password_verificada'))
        and str(datos_cache.get('empleado_id')) == str(empleado.id_empleado)
    )

    # Fallback para clientes antiguos que llegan directo a este endpoint.
    if empleado.primer_login and not password_ya_verificada:
        if not password:
            return Response({
                'error': 'Contraseña requerida para primer login',
                'primer_login': True
            }, status=status.HTTP_400_BAD_REQUEST)

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
            'acceso_formularios_sqf': empleado.acceso_formularios_sqf,
            'acceso_sqf_clientes': empleado.acceso_sqf_clientes,
            'acceso_sqf_contratos': empleado.acceso_sqf_contratos,
            'acceso_sqf_facturacion': empleado.acceso_sqf_facturacion,
            'acceso_sqf_auditoria': empleado.acceso_sqf_auditoria,
        },
        'necesita_completar_datos': necesita_completar,
        **tokens,
    })


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


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def actualizar_password_empleado(request, empleado_id):
    """
    Actualiza la contraseña de un empleado.
    Requiere usuario autenticado con rol administrador y verificación de su contraseña actual.
    """
    from ._utils import _es_admin_empleado
    try:
        empleado = DatosEmpleado.objects.get(id_empleado=empleado_id)
        nueva_password = request.data.get('nueva_password')
        admin_password = request.data.get('admin_password')
        admin_email = (request.data.get('admin_email') or '').strip().lower()

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

        if not admin_password:
            return Response({
                'success': False,
                'error': 'La contraseña del administrador es requerida'
            }, status=status.HTTP_400_BAD_REQUEST)

        actor = request.user
        if _es_superadmin(actor):
            if admin_email and admin_email != actor.email.lower():
                return Response({
                    'success': False,
                    'error': 'El correo administrador no coincide con la sesión activa'
                }, status=status.HTTP_403_FORBIDDEN)
            if not actor.check_password(admin_password):
                return Response({
                    'success': False,
                    'error': 'Credenciales de administrador inválidas'
                }, status=status.HTTP_401_UNAUTHORIZED)
        elif _es_admin_empleado(actor):
            actor_email = (actor.correo_corporativo or '').lower()
            if admin_email and admin_email != actor_email:
                return Response({
                    'success': False,
                    'error': 'El correo administrador no coincide con la sesión activa'
                }, status=status.HTTP_403_FORBIDDEN)
            if not actor.password_hash or not bcrypt.checkpw(admin_password.encode('utf-8'), actor.password_hash.encode('utf-8')):
                return Response({
                    'success': False,
                    'error': 'Credenciales de administrador inválidas'
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({
                'success': False,
                'error': 'No autorizado'
            }, status=status.HTTP_403_FORBIDDEN)

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
