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

SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'django-insecure-change-this-in-production'
)

DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = os.getenv(
    'ALLOWED_HOSTS',
    'localhost,127.0.0.1'
).split(',')

# Permitir hosts internos de infraestructura (reverse proxy / health checks).
for _infra_host in ('127.0.0.1', 'localhost', 'backend', 'django', 'nginx'):
    if _infra_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_infra_host)
    
CSRF_TRUSTED_ORIGINS = os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:5173'
).split(',')

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

    # Local apps
    'api',
    'clientes',
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
    'api.middleware.JWTMiddleware',
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

# =============================================================================
# DEFAULTS
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'api.SuperAdmin'

# =============================================================================
# APPWRITE
# =============================================================================

APPWRITE_ENDPOINT = os.getenv(
    'APPWRITE_ENDPOINT',
    'https://nyc.cloud.appwrite.io/v1'
)

APPWRITE_PROJECT_ID = os.getenv('APPWRITE_PROJECT_ID', '')

APPWRITE_BUCKET_ID = os.getenv('APPWRITE_BUCKET_ID', '')

APPWRITE_API_KEY = os.getenv('APPWRITE_API_KEY', '')

# =============================================================================
# EMAIL
# =============================================================================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_HOST = 'smtp.gmail.com'

EMAIL_PORT = 587

EMAIL_USE_TLS = True

EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')

EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')

DEFAULT_FROM_EMAIL = os.getenv(
    'DEFAULT_FROM_EMAIL',
    'RBG CT <no-reply@rbgct.com>'
)

# =============================================================================
# FRONTEND
# =============================================================================

FRONTEND_URL = os.getenv(
    'FRONTEND_URL',
    'http://localhost:5173'
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

# Si no hay orígenes explícitos en .env → permite todos
# (la seguridad la proveen las API Keys y JWT)
CORS_ALLOW_ALL_ORIGINS = not bool(CORS_ALLOWED_ORIGINS)

# Permite el header X-API-Key en peticiones cross-origin
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + ['x-api-key']

# =============================================================================
# DJANGO REST FRAMEWORK
# =============================================================================

default_authentication_classes = [
    'api.authentication.JWTAuthentication',
    'api.authentication.ApiKeyAuthentication',
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

N8N_WEBHOOK_URL = os.getenv('N8N_WEBHOOK_URL', '')

N8N_WEBHOOK_API_KEY = os.getenv('N8N_WEBHOOK_API_KEY', '')

_n8n_parsed = urlparse(N8N_WEBHOOK_URL)

N8N_BASE_URL = os.getenv(
    'N8N_BASE_URL',
    f"{_n8n_parsed.scheme}://{_n8n_parsed.netloc}"
    if _n8n_parsed.netloc else ''
)
