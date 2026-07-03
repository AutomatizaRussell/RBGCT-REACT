import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from sistema.models import SuperAdmin, ApiKey
from empleados.models import DatosEmpleado


class JWTAuthentication(authentication.BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).split()
        if not auth_header or len(auth_header) != 2:
            return None
        if auth_header[0].decode().lower() != self.keyword.lower():
            return None

        token = auth_header[1].decode()
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            if payload.get('token_type') != 'access':
                return None

            user_type = payload.get('type')
            user_id   = payload.get('sub')

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
            else:
                return None

            return (user, payload)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed({'error': 'Token expirado', 'code': 'TOKEN_EXPIRED'})
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed({'error': 'Token inválido', 'code': 'TOKEN_INVALID'})
        except Exception as e:
            raise exceptions.AuthenticationFailed({'error': f'Error de autenticación: {str(e)}'})

    def authenticate_header(self, request):
        return 'Bearer'


class ApiKeyAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        api_key = request.META.get('HTTP_X_API_KEY')
        if not api_key:
            return None
        try:
            key_obj = ApiKey.objects.get(key=api_key, is_active=True)
        except ApiKey.DoesNotExist:
            raise exceptions.AuthenticationFailed('API Key inválida o inactiva')

        key_obj.mark_used()
        user = key_obj.creado_por
        if user is None:
            raise exceptions.AuthenticationFailed('API Key sin usuario asociado')
        return (user, key_obj)

    def authenticate_header(self, request):
        return 'X-API-Key'
