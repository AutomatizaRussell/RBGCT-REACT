"""
JWT Middleware - Procesa tokens en cada request y setea request.user
"""
import jwt
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from .models import SuperAdmin, DatosEmpleado


class JWTMiddleware(MiddlewareMixin):
    """
    Middleware que extrae y valida JWT de cada request.
    Setea request.user con el usuario autenticado o AnonymousUser.
    """

    def process_request(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        request.user = AnonymousUser()
        request.jwt_payload = None

        if not auth_header.startswith('Bearer '):
            return

        try:
            token = auth_header.split(' ', 1)[1]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])

            # Solo procesar access tokens
            if payload.get('token_type') != 'access':
                return

            request.jwt_payload = payload

            # Setear usuario según tipo
            user_type = payload.get('type')
            user_id = payload.get('sub')

            if user_type == 'superadmin' and user_id:
                try:
                    request.user = SuperAdmin.objects.get(id=user_id)
                    request.user._is_superadmin = True
                except SuperAdmin.DoesNotExist:
                    pass

            elif user_type == 'empleado' and user_id:
                try:
                    request.user = DatosEmpleado.objects.get(id_empleado=user_id)
                    request.user._is_empleado = True
                except DatosEmpleado.DoesNotExist:
                    pass

        except jwt.ExpiredSignatureError:
            # Token expirado - dejar como AnonymousUser
            pass
        except jwt.PyJWTError:
            # Token inválido - dejar como AnonymousUser
            pass
        except Exception:
            # Cualquier otro error - dejar como AnonymousUser
            pass

    def process_response(self, request, response):
        # No modificar respuesta
        return response
