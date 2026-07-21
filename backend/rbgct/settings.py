import os
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

# =============================================================================
# SECURITY
# =============================================================================

from django.core.exceptions import ImproperlyConfigured

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY debe estar configurado en las variables de entorno. "
        "Ejecuta: export DJANGO_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(50))')"
    )

DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = os.getenv(
    'ALLOWED_HOSTS',
    'localhost,127.0.0.1'
).split(',')

# Permitir hosts internos de infraestructura (reverse proxy / health checks)
# y el dominio de producción, aunque el env de Coolify no los incluya.
for _infra_host in ('127.0.0.1', 'localhost', 'backend', 'django', 'nginx',
                    'conecta-gct.rbgct.cloud'):
    if _infra_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_infra_host)

CSRF_TRUSTED_ORIGINS = os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:5173'
).split(',')

if 'https://conecta-gct.rbgct.cloud' not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append('https://conecta-gct.rbgct.cloud')

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# =============================================================================
# APPS
# =============================================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'corsheaders',

    # Local apps — modelos en sus propios schemas
    'core',
    'sistema',
    'empleados',
    'contratos',
    'formacion',
    'tareas',
    # 'clientes',  # Pausado temporalmente
    # Views / serializers / URLs (sin modelos propios)
    'api',
]

# =============================================================================
# MIDDLEWARE
# =============================================================================

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    # Custom
    'sistema.middleware.JWTMiddleware',
]

# =============================================================================
# URLS / WSGI
# =============================================================================

ROOT_URLCONF = 'rbgct.urls'

WSGI_APPLICATION = 'rbgct.wsgi.application'

# =============================================================================
# TEMPLATES
# =============================================================================

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# =============================================================================
# DATABASE
# =============================================================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'rbgct'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        # Reutiliza conexiones entre requests para reducir latencia.
        'CONN_MAX_AGE': _env_int('DB_CONN_MAX_AGE', 120),
        'CONN_HEALTH_CHECKS': os.getenv('DB_CONN_HEALTH_CHECKS', 'true').lower() == 'true',
        'OPTIONS': {
            'connect_timeout': _env_int('DB_CONNECT_TIMEOUT', 5),
        },
    }
}

# =============================================================================
# PASSWORD VALIDATORS
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'
    },
]

# =============================================================================
# INTERNATIONALIZATION
# =============================================================================

LANGUAGE_CODE = 'es-es'

TIME_ZONE = 'America/Bogota'

USE_I18N = True

USE_TZ = True

# =============================================================================
# STATIC / MEDIA
# =============================================================================

STATIC_URL = '/static/'

STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'

MEDIA_ROOT = BASE_DIR / 'media'

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB

# =============================================================================
# DEFAULTS
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'sistema.SuperAdmin'

# =============================================================================
# SHAREPOINT (via n8n)
# =============================================================================

N8N_SHAREPOINT_WEBHOOK = os.getenv(
    'N8N_SHAREPOINT_WEBHOOK',
    'https://n8n.rbgct.cloud/webhook/subir-archivo-intranet'
)

N8N_SHAREPOINT_DOWNLOAD_WEBHOOK = os.getenv(
    'N8N_SHAREPOINT_DOWNLOAD_WEBHOOK',
    'https://n8n.rbgct.cloud/webhook/obtener-archivo-intranet'
)

SHAREPOINT_BASE_URL = os.getenv('SHAREPOINT_BASE_URL', 'https://dsasas.sharepoint.com')

# =============================================================================
# EMAIL
# =============================================================================

# El backend de email se puede configurar por variable de entorno.
# Ejemplos:
#   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend  # desarrollo
#   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend     # SMTP
#   EMAIL_BACKEND=anymail.backends.resend.EmailBackend            # Resend
EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend'
)

EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')

EMAIL_PORT = _env_int('EMAIL_PORT', 587)

EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'

EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')

EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')

# Sin timeout, una conexión SMTP lenta puede colgar un worker de gunicorn
# por minutos y degradar la latencia de toda la API.
EMAIL_TIMEOUT = _env_int('EMAIL_TIMEOUT', 10)

DEFAULT_FROM_EMAIL = os.getenv(
    'DEFAULT_FROM_EMAIL',
    'RBG CT <no-reply@rbgct.com>'
)

# =============================================================================
# FRONTEND
# =============================================================================

FRONTEND_URL = os.getenv(
    'FRONTEND_URL',
    'https://conecta-gct.rbgct.cloud'
)

# =============================================================================
# RESEND
# =============================================================================

RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')

# =============================================================================
# CORS
# =============================================================================

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    o for o in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if o
]

# Sin orígenes explícitos en el env: permitir solo el frontend conocido.
# (Nunca allow-all con credenciales habilitadas.)
if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = [
        'https://conecta-gct.rbgct.cloud',
        'http://localhost:5173',
        'http://localhost',
    ]

# Blindaje: el dominio de producción siempre permitido aunque el env apunte
# al dominio viejo (mismo criterio que ALLOWED_HOSTS).
if 'https://conecta-gct.rbgct.cloud' not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append('https://conecta-gct.rbgct.cloud')

# En producción: eliminar cualquier origen localhost para evitar
# que un atacante local abuse de CORS con credenciales.
if not DEBUG:
    CORS_ALLOWED_ORIGINS = [
        o for o in CORS_ALLOWED_ORIGINS
        if 'localhost' not in o and '127.0.0.1' not in o
    ]
    if not CORS_ALLOWED_ORIGINS:
        raise ImproperlyConfigured(
            "CORS_ALLOWED_ORIGINS no puede estar vacío en producción. "
            "Configura al menos el dominio de producción en la variable de entorno."
        )

CORS_ALLOW_ALL_ORIGINS = False

# Permite el header X-API-Key en peticiones cross-origin
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + ['x-api-key']

# =============================================================================
# DJANGO REST FRAMEWORK
# =============================================================================

default_authentication_classes = [
    'sistema.authentication.JWTAuthentication',
    'sistema.authentication.ApiKeyAuthentication',
]

# SessionAuthentication agrega validaciones y consultas extra; útil en desarrollo.
if DEBUG:
    default_authentication_classes.append('rest_framework.authentication.SessionAuthentication')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        *default_authentication_classes,
    ],

    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],

    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],

    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv('DRF_THROTTLE_ANON', '30/min'),
        'user': os.getenv('DRF_THROTTLE_USER', '300/min'),
        'login': os.getenv('DRF_THROTTLE_LOGIN', '10/min'),
        'enviar_codigo': os.getenv('DRF_THROTTLE_ENVIAR_CODIGO', '5/hour'),
        'verificar_codigo': os.getenv('DRF_THROTTLE_VERIFICAR_CODIGO', '20/hour'),
        'recuperacion_password': os.getenv('DRF_THROTTLE_RECUPERACION', '3/hour'),
    },

    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# =============================================================================
# JWT
# =============================================================================

JWT_ACCESS_TOKEN_MINUTES = 15

JWT_REFRESH_TOKEN_DAYS = 7

# =============================================================================
# LOGGING
# =============================================================================

LOGGING = {
    'version': 1,

    'disable_existing_loggers': False,

    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },

    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# =============================================================================
# CACHE
# =============================================================================

# Importante: la recuperación de contraseña y verificación de código dependen de cache.
# LocMemCache no es compartida entre workers de Gunicorn, por eso en producción
# usamos FileBasedCache (o Redis si se configura explícitamente).
CACHE_BACKEND = os.getenv('CACHE_BACKEND', 'file')
CACHE_DIR = os.getenv('CACHE_DIR', '/tmp/django_cache')
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/1')

# Si piden 'file' pero hay un Redis alcanzable, preferir Redis: el cache de
# archivos vive dentro del contenedor (los códigos 2FA se pierden en cada
# redeploy) y su locking degrada bajo carga. Esto cubre el env desactualizado
# de Coolify sin requerir cambiar variables.
if CACHE_BACKEND == 'file' and REDIS_URL:
    try:
        import socket
        _r = urlparse(REDIS_URL)
        with socket.create_connection((_r.hostname or 'redis', _r.port or 6379), timeout=1):
            CACHE_BACKEND = 'redis'
    except OSError:
        pass  # Redis no disponible: seguir con file cache

if CACHE_BACKEND == 'redis':
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
            'TIMEOUT': 300,
        }
    }
elif CACHE_BACKEND == 'locmem':
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'rbgct-locmem',
            'TIMEOUT': 300,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
            'LOCATION': CACHE_DIR,
            'TIMEOUT': 300,
            'OPTIONS': {
                'MAX_ENTRIES': 10000,
            },
        }
    }

# =============================================================================
# N8N
# =============================================================================

# ── Microsoft Azure AD OAuth ──────────────────────────────────────────────────
AZURE_TENANT_ID     = os.getenv('AZURE_TENANT_ID', '')
AZURE_CLIENT_ID     = os.getenv('AZURE_CLIENT_ID', '')
AZURE_CLIENT_SECRET = os.getenv('AZURE_CLIENT_SECRET', '')

N8N_WEBHOOK_URL = os.getenv('N8N_WEBHOOK_URL', '')

N8N_WEBHOOK_API_KEY = os.getenv('N8N_WEBHOOK_API_KEY', '')

_n8n_parsed = urlparse(N8N_WEBHOOK_URL)

N8N_BASE_URL = os.getenv(
    'N8N_BASE_URL',
    f"{_n8n_parsed.scheme}://{_n8n_parsed.netloc}"
    if _n8n_parsed.netloc else ''
)

# =============================================================================
# PRODUCTION SECURITY HARDENING
# =============================================================================

# These settings are only enabled in production (DEBUG=False) because they
# assume the site is served over HTTPS by a reverse proxy such as Nginx or
# Traefik. The SECURE_PROXY_SSL_HEADER setting above lets Django trust the
# X-Forwarded-Proto header from the proxy.
if not DEBUG:
    # SSL redirect is usually handled by the reverse proxy (Nginx/Traefik/Coolify).
    # Only enable it in Django if the proxy does NOT perform the redirect, to
    # avoid redirect loops. Set SECURE_SSL_REDIRECT=True explicitly when needed.
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() == 'true'

    SECURE_HSTS_SECONDS = _env_int('SECURE_HSTS_SECONDS', 31536000)  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv(
        'SECURE_HSTS_INCLUDE_SUBDOMAINS', 'True'
    ).lower() == 'true'
    SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'True').lower() == 'true'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    X_FRAME_OPTIONS = "DENY"
