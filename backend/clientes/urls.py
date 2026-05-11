from rest_framework.routers import DefaultRouter
from .views import (
    EmpresaClienteViewSet, ContactoClienteViewSet,
    ServicioContratadoViewSet, AsignacionEquipoViewSet,
    DocumentoClienteViewSet, BitacoraClienteViewSet,
)

router = DefaultRouter()
router.register(r'empresas', EmpresaClienteViewSet, basename='empresa-cliente')
router.register(r'contactos', ContactoClienteViewSet, basename='contacto-cliente')
router.register(r'servicios', ServicioContratadoViewSet, basename='servicio-contratado')
router.register(r'asignaciones', AsignacionEquipoViewSet, basename='asignacion-equipo')
router.register(r'documentos', DocumentoClienteViewSet, basename='documento-cliente')
router.register(r'bitacora', BitacoraClienteViewSet, basename='bitacora-cliente')

urlpatterns = router.urls
