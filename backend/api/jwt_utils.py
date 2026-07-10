import uuid
import hashlib
import jwt
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps

from django.conf import settings
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

ACCESS_TOKEN_MINUTES = 15
REFRESH_TOKEN_DAYS = 7

ROLE_MAP = {1: 'admin', 2: 'editor', 3: 'usuario'}


def _secret():
    return settings.SECRET_KEY


def _token_jti(token: str) -> str:
    """Extrae el jti del payload o genera un hash del token."""
    try:
        payload = jwt.decode(token, _secret(), algorithms=['HS256'], options={'verify_exp': False})
        return payload.get('jti') or hashlib.sha256(token.encode()).hexdigest()[:32]
    except jwt.PyJWTError:
        return hashlib.sha256(token.encode()).hexdigest()[:32]


def revoke_token(token: str) -> None:
    """Revoca un token JWT agregándolo a la blacklist de Redis/cache."""
    jti = _token_jti(token)
    # TTL = duración máxima del refresh token para no dejar basura
    ttl = REFRESH_TOKEN_DAYS * 86400
    cache.set(f"jwt:revoked:{jti}", True, timeout=ttl)
    logger.info(f"[JWT] Token revocado: {jti[:8]}...")


def is_token_revoked(token: str) -> bool:
    """Verifica si un token JWT está en la blacklist."""
    jti = _token_jti(token)
    return cache.get(f"jwt:revoked:{jti}") is True


def generate_tokens(payload: dict) -> dict:
    """Genera access token (15 min) y refresh token (7 días) con jti."""
    now = datetime.now(tz=timezone.utc)
    jti = str(uuid.uuid4())

    access_payload = {
        **payload,
        'jti': jti,
        'iat': now,
        'exp': now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        'token_type': 'access',
    }
    refresh_payload = {
        'sub': payload['sub'],
        'type': payload['type'],
        'jti': str(uuid.uuid4()),  # jti independiente para el refresh token
        'iat': now,
        'exp': now + timedelta(days=REFRESH_TOKEN_DAYS),
        'token_type': 'refresh',
    }

    access_token = jwt.encode(access_payload, _secret(), algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, _secret(), algorithm='HS256')

    return {'accessToken': access_token, 'refreshToken': refresh_token}


def decode_token(token: str) -> dict:
    return jwt.decode(token, _secret(), algorithms=['HS256'])


def build_superadmin_payload(admin) -> dict:
    return {
        'sub': str(admin.id),
        'email': admin.email,
        'role': 'superadmin',
        'nombre': admin.nombre,
        'type': 'superadmin',
    }


def build_empleado_payload(empleado) -> dict:
    return {
        'sub': str(empleado.id_empleado),
        'email': empleado.correo_corporativo,
        'role': ROLE_MAP.get(empleado.id_permisos, 'usuario'),
        'nombre': empleado.primer_nombre,
        'type': 'empleado',
    }


def jwt_required(view_func):
    """Decorador que exige un access token válido en Authorization: Bearer <token>."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return Response({'error': 'Token requerido'}, status=status.HTTP_401_UNAUTHORIZED)

        token = auth_header.split(' ', 1)[1]
        try:
            payload = decode_token(token)
            if payload.get('token_type') != 'access':
                raise jwt.InvalidTokenError('No es un access token')
            # Verificar blacklist
            if is_token_revoked(token):
                raise jwt.InvalidTokenError('Token revocado')
            request.jwt_payload = payload
        except jwt.ExpiredSignatureError:
            return Response(
                {'error': 'Token expirado', 'code': 'TOKEN_EXPIRED'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except jwt.InvalidTokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.PyJWTError:
            return Response({'error': 'Token inválido'}, status=status.HTTP_401_UNAUTHORIZED)

        return view_func(request, *args, **kwargs)

    return wrapper
