from rest_framework.permissions import BasePermission

from .models import DatosEmpleado, SuperAdmin


class IsSuperAdminUser(BasePermission):
    message = 'Solo SuperAdmin puede realizar esta acción.'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        return isinstance(user, SuperAdmin) or getattr(user, '_is_superadmin', False)


class IsAdminOrSuperAdmin(BasePermission):
    message = 'Se requieren permisos de administrador.'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False

        if isinstance(user, SuperAdmin) or getattr(user, '_is_superadmin', False):
            return True

        is_empleado = isinstance(user, DatosEmpleado) or getattr(user, '_is_empleado', False)
        if not is_empleado:
            return False

        return getattr(user, 'estado', None) == 'ACTIVA' and int(getattr(user, 'id_permisos', 0) or 0) == 1
