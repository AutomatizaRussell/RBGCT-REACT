import jwt
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from sistema.models import SuperAdmin
from empleados.models import DatosEmpleado


class JWTMiddleware(MiddlewareMixin):
    def process_request(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        request.user = AnonymousUser()
        request.jwt_payload = None

        # DRF ya autentica con JWTAuthentication para /api/ — evitar doble decode
        if request.path.startswith('/api/'):
            return

        if not auth_header.startswith('Bearer '):
            return

        try:
            token = auth_header.split(' ', 1)[1]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            if payload.get('token_type') != 'access':
                return

            request.jwt_payload = payload
            user_type = payload.get('type')
            user_id   = payload.get('sub')

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

        except (jwt.ExpiredSignatureError, jwt.PyJWTError, Exception):
            pass

    def process_response(self, request, response):
        return response
