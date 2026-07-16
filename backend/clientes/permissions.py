"""
Permisos del módulo de clientes.

Se basa en los roles existentes del sistema:
  - SuperAdmin (sistema.SuperAdmin o atributo _is_superadmin).
  - Empleado Administrador/Editor (id_permisos = 1 o 2).
  - Empleado Usuario (id_permisos = 3): solo lectura de clientes asignados.
"""
from rest_framework import permissions
from sistema.models import SuperAdmin


def _es_superadmin(user):
    return isinstance(user, SuperAdmin) or getattr(user, '_is_superadmin', False)


def _es_empleado(user):
    return hasattr(user, 'id_empleado') or getattr(user, '_is_empleado', False)


def _es_admin_editor(user):
    """Admin/Editor del sistema: puede gestionar clientes y equipos."""
    if _es_superadmin(user):
        return True
    if not _es_empleado(user):
        return False
    return getattr(user, 'estado', None) == 'ACTIVA' and int(getattr(user, 'id_permisos', 0) or 0) in (1, 2)


def _es_gerente(user):
    """Devuelve True si el empleado tiene un cargo de nivel Gerente."""
    if not _es_empleado(user):
        return False
    cargo = getattr(user, 'cargo', None)
    if not cargo:
        return False
    nivel = (cargo.nivel or '').lower()
    nombre = (cargo.nombre_cargo or '').lower()
    return 'gerente' in nivel or 'gerente' in nombre


def _es_gerente_area(user, area_id=None):
    """Devuelve True si el empleado es gerente y, opcionalmente, del área indicada."""
    if not _es_gerente(user):
        return False
    if area_id is None:
        return True
    return getattr(user, 'area_id', None) == area_id


def _es_usuario_lectura(user):
    """Empleado con permiso de solo lectura de sus clientes asignados."""
    if _es_superadmin(user) or _es_admin_editor(user):
        return True
    if not _es_empleado(user):
        return False
    return getattr(user, 'estado', None) == 'ACTIVA' and int(getattr(user, 'id_permisos', 0) or 0) == 3


class EsAdminOEditor(permissions.BasePermission):
    """Permite acceso a SuperAdmin, Admin y Editor."""
    def has_permission(self, request, view):
        return _es_admin_editor(request.user)


class EsAdminOGerenteArea(permissions.BasePermission):
    """Permite acceso a SuperAdmin, Admin o gerente de área."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if _es_superadmin(request.user):
            return True
        if not _es_empleado(request.user):
            return False
        if getattr(request.user, 'estado', None) != 'ACTIVA':
            return False
        # Admin del sistema (id_permisos=1)
        if int(getattr(request.user, 'id_permisos', 0) or 0) == 1:
            return True
        # Gerente de área
        return _es_gerente(request.user)


class EsAdminEditorOPropioCliente(permissions.BasePermission):
    """
    Permite lectura a Admin/Editor o a empleados que tengan el cliente asignado.
    Para escritura solo Admin/Editor.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if _es_admin_editor(request.user):
            return True
        return request.method in permissions.SAFE_METHODS and _es_usuario_lectura(request.user)


class EsAdminEditorOSoloLecturaAsignada(permissions.BasePermission):
    """
    Permite a usuarios de solo lectura acceder a la lista de sus clientes asignados.
    Admin/Editor tienen acceso total.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if _es_admin_editor(request.user):
            return True
        return request.method in permissions.SAFE_METHODS and _es_usuario_lectura(request.user)


class EsAdminEditorOContactoPropio(permissions.BasePermission):
    """Escritura de contactos solo para Admin/Editor."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if _es_admin_editor(request.user):
            return True
        return request.method in permissions.SAFE_METHODS


class PuedeEnviarFromSQF(permissions.BasePermission):
    """
    Permite a SuperAdmin/Admin/Editor o a empleados con permisos de FormulariosSQF
    enviar datos a los endpoints /from_sqf/.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if _es_admin_editor(request.user):
            return True
        if not _es_empleado(request.user):
            return False
        # Cualquier permiso de FormulariosSQF habilita el envío de intake.
        return any([
            getattr(request.user, 'acceso_sqf_clientes', False),
            getattr(request.user, 'acceso_sqf_contratos', False),
            getattr(request.user, 'acceso_sqf_facturacion', False),
            getattr(request.user, 'acceso_sqf_auditoria', False),
        ])
