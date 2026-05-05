from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'areas', views.DatosAreaViewSet)
router.register(r'cargos', views.DatosCargoViewSet)
router.register(r'superadmins', views.SuperAdminViewSet)
router.register(r'empleados', views.DatosEmpleadoViewSet)
router.register(r'tareas', views.TareasCalendarioViewSet)
router.register(r'solicitudes-password', views.SolicitudesPasswordViewSet)
router.register(r'reglamento', views.ReglamentoItemViewSet)
router.register(r'cursos', views.CursoViewSet)
router.register(r'curso-contenido', views.CursoContenidoViewSet)
router.register(r'curso-historial', views.CursoHistorialViewSet)
router.register(r'n8n-logs', views.N8nLogViewSet)
router.register(r'api-keys', views.ApiKeyViewSet)

urlpatterns = [
    # Actualizar contraseña de empleado - ANTES del router para prioridad
    path('empleados/<int:empleado_id>/actualizar-password/', views.actualizar_password_empleado, name='actualizar_password'),
    # Alertas de recuperación de contraseña - ANTES del router
    path('alertas-recuperacion/', views.get_alertas_recuperacion, name='alertas_recuperacion'),
    path('registrar-intento-recuperacion/', views.registrar_intento_recuperacion, name='registrar_intento_recuperacion'),
    path('alertas-recuperacion/<int:alerta_id>/atender/', views.atender_alerta, name='atender_alerta'),
    path('alertas-recuperacion/<int:alerta_id>/eliminar/', views.eliminar_alerta, name='eliminar_alerta'),
    # Router URLs
    path('', include(router.urls)),
    path('login/', views.login_view, name='login'),
    path('crear-usuario/', views.crear_usuario_superadmin, name='crear_usuario'),
    path('completar-datos/', views.completar_datos_empleado, name='completar_datos'),
    path('habilitar-edicion/', views.habilitar_edicion_datos, name='habilitar_edicion'),
    path('habilitar-edicion-masiva/', views.habilitar_edicion_masiva_superadmin, name='habilitar_edicion_masiva'),
    # Verificación de email con código
    path('enviar-codigo/', views.enviar_codigo_verificacion, name='enviar_codigo'),
    path('verificar-codigo/', views.verificar_codigo_login, name='verificar_codigo'),
    # Recuperación de contraseña (olvide contraseña)
    path('recuperar-password/', views.solicitar_recuperacion_password, name='solicitar_recuperacion'),
    path('verificar-codigo-recuperacion/', views.verificar_codigo_recuperacion, name='verificar_codigo_recuperacion'),
    path('restablecer-password/', views.restablecer_password, name='restablecer_password'),
    # Actividad reciente de usuarios
    path('actividad-reciente/', views.actividad_reciente, name='actividad_reciente'),
    # Mantener sesión activa (heartbeat)
    path('ping/', views.ping_actividad, name='ping_actividad'),
    # JWT
    path('token/refresh/', views.refresh_token_view, name='token_refresh'),
    # Proxy n8n (server-side, sin CORS)
    path('n8n-proxy/', views.n8n_proxy, name='n8n_proxy'),
    # MarkItDown - Convertir archivos a Markdown
    path('convertir-markdown/', views.convertir_markdown, name='convertir_markdown'),
    # Convertidor de archivos (PDF, Excel, Word, etc.)
    path('convertir-archivo/', views.convertir_archivo, name='convertir_archivo'),
    # Gestor de PDFs (fusionar, dividir, rotar, etc.)
    path('gestor-pdf/', views.gestor_pdf, name='gestor_pdf'),
]
