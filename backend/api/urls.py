from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.empleados import (
    admin_academicos_empleado,
    admin_academicos_detalle,
    DatosAreaViewSet,
    DatosCargoViewSet,
    SuperAdminViewSet,
    DatosEmpleadoViewSet,
    ping_actividad,
    actualizar_mi_contacto,
    actualizar_mi_persona,
    mi_organigrama,
    mis_academicos,
    mis_academicos_detalle,
)
from .views.tareas import TareasCalendarioViewSet
from .views.admin import (
    SolicitudesPasswordViewSet,
    ReglamentoItemViewSet,
    N8nLogViewSet,
    ApiKeyViewSet,
    get_alertas_recuperacion,
    registrar_intento_recuperacion,
    atender_alerta,
    eliminar_alerta,
    actividad_reciente,
    health_check,
)
from .views.cursos import (
    CursoViewSet,
    CursoContenidoViewSet,
    CursoHistorialViewSet,
    NotificacionCursoViewSet,
    toggle_encargado_cursos,
)
from .views.contratos import (
    EntidadEPSViewSet,
    EntidadAFPViewSet,
    EntidadARLViewSet,
    CajaCompensacionViewSet,
    ContratoViewSet,
    AfiliacionSeguridadSocialViewSet,
    ContratoRenovacionViewSet,
)
from .views.auth import (
    login_view,
    crear_usuario_superadmin,
    completar_datos_empleado,
    habilitar_edicion_datos,
    habilitar_edicion_masiva_superadmin,
    enviar_codigo_verificacion,
    verificar_codigo_login,
    refresh_token_view,
    actualizar_password_empleado,
)
from .views.recuperacion import (
    solicitar_recuperacion_password,
    verificar_codigo_recuperacion,
    restablecer_password,
)
from .views.ia import gemini_chat, n8n_proxy
from .views.herramientas import convertir_markdown, convertir_archivo, gestor_pdf, descargar_archivo_intranet
from .views.certificados import (
    enviar_certificado_empleo,
    listar_solicitudes_cert,
    crear_solicitud_cert,
    atender_solicitud_cert,
    get_cert_permisos,
    set_cert_permiso,
)
from .views.sugerencias import (
    crear_sugerencia,
    mis_sugerencias,
    listar_sugerencias,
    recibir_sugerencia,
    confirmar_sugerencia_vista,
)

router = DefaultRouter()
router.register(r'areas', DatosAreaViewSet)
router.register(r'cargos', DatosCargoViewSet)
router.register(r'superadmins', SuperAdminViewSet)
router.register(r'empleados', DatosEmpleadoViewSet)
router.register(r'tareas', TareasCalendarioViewSet)
router.register(r'solicitudes-password', SolicitudesPasswordViewSet)
router.register(r'reglamento', ReglamentoItemViewSet)
router.register(r'cursos', CursoViewSet)
router.register(r'curso-contenido', CursoContenidoViewSet)
router.register(r'curso-historial', CursoHistorialViewSet)
router.register(r'notificaciones-cursos', NotificacionCursoViewSet, basename='notificaciones-cursos')
router.register(r'n8n-logs', N8nLogViewSet)
router.register(r'api-keys', ApiKeyViewSet)
router.register(r'entidades-eps',          EntidadEPSViewSet)
router.register(r'entidades-afp',          EntidadAFPViewSet)
router.register(r'entidades-arl',          EntidadARLViewSet)
router.register(r'cajas-compensacion',     CajaCompensacionViewSet)
router.register(r'contratos',              ContratoViewSet)
router.register(r'afiliaciones-ss',        AfiliacionSeguridadSocialViewSet)
router.register(r'contratos-renovaciones', ContratoRenovacionViewSet)

urlpatterns = [
    # Actualizar contraseña de empleado - ANTES del router para prioridad
    path('empleados/<int:empleado_id>/actualizar-password/', actualizar_password_empleado, name='actualizar_password'),
    # Alertas de recuperación de contraseña - ANTES del router
    path('alertas-recuperacion/', get_alertas_recuperacion, name='alertas_recuperacion'),
    path('registrar-intento-recuperacion/', registrar_intento_recuperacion, name='registrar_intento_recuperacion'),
    path('alertas-recuperacion/<int:alerta_id>/atender/', atender_alerta, name='atender_alerta'),
    path('alertas-recuperacion/<int:alerta_id>/eliminar/', eliminar_alerta, name='eliminar_alerta'),
    # Router URLs
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
    path('crear-usuario/', crear_usuario_superadmin, name='crear_usuario'),
    path('completar-datos/', completar_datos_empleado, name='completar_datos'),
    path('habilitar-edicion/', habilitar_edicion_datos, name='habilitar_edicion'),
    path('toggle-encargado-cursos/', toggle_encargado_cursos, name='toggle_encargado_cursos'),
    path('habilitar-edicion-masiva/', habilitar_edicion_masiva_superadmin, name='habilitar_edicion_masiva'),
    # Verificación de email con código
    path('enviar-codigo/', enviar_codigo_verificacion, name='enviar_codigo'),
    path('verificar-codigo/', verificar_codigo_login, name='verificar_codigo'),
    # Recuperación de contraseña (olvide contraseña)
    path('recuperar-password/', solicitar_recuperacion_password, name='solicitar_recuperacion'),
    path('verificar-codigo-recuperacion/', verificar_codigo_recuperacion, name='verificar_codigo_recuperacion'),
    path('restablecer-password/', restablecer_password, name='restablecer_password'),
    # Actividad reciente de usuarios
    path('actividad-reciente/', actividad_reciente, name='actividad_reciente'),
    # Mantener sesión activa (heartbeat)
    path('ping/', ping_actividad, name='ping_actividad'),
    path('mi-contacto/', actualizar_mi_contacto, name='actualizar_mi_contacto'),
    path('mi-persona/', actualizar_mi_persona, name='actualizar_mi_persona'),
    path('mi-organigrama/', mi_organigrama, name='mi_organigrama'),
    path('mis-academicos/', mis_academicos, name='mis_academicos'),
    path('mis-academicos/<int:pk>/', mis_academicos_detalle, name='mis_academicos_detalle'),
    # Admin: académicos de cualquier empleado
    path('empleados/<int:empleado_id>/academicos/', admin_academicos_empleado, name='admin_academicos_empleado'),
    path('empleados/<int:empleado_id>/academicos/<int:pk>/', admin_academicos_detalle, name='admin_academicos_detalle'),
    # Health check para watchdog e infraestructura (público, sin auth)
    path('health/', health_check, name='health_check'),
    # Sugerencias de empleados
    path('sugerencias/', crear_sugerencia, name='crear_sugerencia'),
    path('sugerencias/mias/', mis_sugerencias, name='mis_sugerencias'),
    path('sugerencias/listado/', listar_sugerencias, name='listar_sugerencias'),
    path('sugerencias/<int:sugerencia_id>/recibir/', recibir_sugerencia, name='recibir_sugerencia'),
    path('sugerencias/<int:sugerencia_id>/vista/', confirmar_sugerencia_vista, name='confirmar_sugerencia_vista'),
    # JWT
    path('token/refresh/', refresh_token_view, name='token_refresh'),
    # Proxy n8n (server-side, sin CORS)
    path('n8n-proxy/', n8n_proxy, name='n8n_proxy'),
    # MarkItDown - Convertir archivos a Markdown
    path('convertir-markdown/', convertir_markdown, name='convertir_markdown'),
    # Convertidor de archivos (PDF, Excel, Word, etc.)
    path('convertir-archivo/', convertir_archivo, name='convertir_archivo'),
    # Gestor de PDFs (fusionar, dividir, rotar, etc.)
    path('gestor-pdf/', gestor_pdf, name='gestor_pdf'),
    # Descargar archivos de SharePoint vía n8n (proxy autenticado)
    path('descargar-archivo/', descargar_archivo_intranet, name='descargar_archivo_intranet'),
    # Certificado de empleo — envío por correo vía n8n
    path('enviar-certificado/', enviar_certificado_empleo, name='enviar_certificado'),
    # Solicitudes de certificado (JSON temporal, sin modelo)
    path('solicitudes-cert/',                            listar_solicitudes_cert, name='listar_solicitudes_cert'),
    path('solicitudes-cert/crear/',                      crear_solicitud_cert,    name='crear_solicitud_cert'),
    path('solicitudes-cert/<str:solicitud_id>/atender/', atender_solicitud_cert,  name='atender_solicitud_cert'),
    # Permisos de certificado (JSON temporal, sin modelo)
    path('cert-permisos/',      get_cert_permisos, name='get_cert_permisos'),
    path('cert-permisos/set/',  set_cert_permiso,  name='set_cert_permiso'),
    # Asistente IA — proxy seguro a Gemini
    path('gemini-chat/', gemini_chat, name='gemini_chat'),
]
