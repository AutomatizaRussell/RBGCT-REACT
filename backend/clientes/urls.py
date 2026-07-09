from rest_framework.routers import DefaultRouter
from .views import (
    EmpresaClienteViewSet, ContactoClienteViewSet,
    ServicioContratadoViewSet, AsignacionEquipoViewSet,
    BitacoraClienteViewSet, SolicitudFacturacionViewSet,
)

router = DefaultRouter()
router.register(r'empresas',    EmpresaClienteViewSet,      basename='empresa-cliente')
router.register(r'contactos',   ContactoClienteViewSet,     basename='contacto-cliente')
router.register(r'servicios',   ServicioContratadoViewSet,  basename='servicio-contratado')
router.register(r'asignaciones', AsignacionEquipoViewSet,   basename='asignacion-equipo')
router.register(r'bitacora',    BitacoraClienteViewSet,     basename='bitacora-cliente')
router.register(r'facturacion', SolicitudFacturacionViewSet, basename='solicitud-facturacion')

urlpatterns = router.urls
