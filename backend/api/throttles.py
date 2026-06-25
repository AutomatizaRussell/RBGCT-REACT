from rest_framework.throttling import SimpleRateThrottle


class _IPThrottle(SimpleRateThrottle):
    """Base: throttle by client IP regardless of authentication status."""

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class LoginThrottle(_IPThrottle):
    """10 attempts/min per IP — prevents password brute force."""
    scope = 'login'


class EnviarCodigoThrottle(_IPThrottle):
    """5 requests/hour per IP — prevents 2FA email spam."""
    scope = 'enviar_codigo'


class VerificarCodigoThrottle(_IPThrottle):
    """20 attempts/hour per IP — prevents rapid new-code+guess cycles."""
    scope = 'verificar_codigo'


class RecuperacionPasswordThrottle(_IPThrottle):
    """3 requests/hour per IP — prevents user enumeration via recovery flow."""
    scope = 'recuperacion_password'
