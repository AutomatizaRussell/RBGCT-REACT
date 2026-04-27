"""
JWT Authentication for Django REST Framework
"""
import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from .models import SuperAdmin, DatosEmpleado


class JWTAuthentication(authentication.BaseAuthentication):
    """
    Autenticación basada en JWT para DRF.
    Extrae el token del header Authorization: Bearer <token>
    """

    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).split()

        if not auth_header:
            return None

        if len(auth_header) != 2:
            return None

        if auth_header[0].decode().lower() != self.keyword.lower():
            return None

        token = auth_header[1].decode()

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])

            # Solo aceptar access tokens
            if payload.get('token_type') != 'access':
                return None

            # Setear usuario según tipo
            user_type = payload.get('type')
            user_id = payload.get('sub')
            user = None

            if user_type == 'superadmin' and user_id:
                try:
                    user = SuperAdmin.objects.get(id=user_id)
                    user._is_superadmin = True
                except SuperAdmin.DoesNotExist:
                    raise exceptions.AuthenticationFailed('Usuario no encontrado')

            elif user_type == 'empleado' and user_id:
                try:
                    user = DatosEmpleado.objects.get(id_empleado=user_id)
                    user._is_empleado = True
                except DatosEmpleado.DoesNotExist:
                    raise exceptions.AuthenticationFailed('Usuario no encontrado')

            if user:
                return (user, payload)

            return None

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token expirado')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Token inválido')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Error de autenticación: {str(e)}')

    def authenticate_header(self, request):
        return 'Bearer'
