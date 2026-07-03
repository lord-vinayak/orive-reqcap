"""
Django settings for Requirement Capturing Tool.
"""
import os
from pathlib import Path
from datetime import timedelta
import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]

# Application definition
INSTALLED_APPS = [
    'daphne',
    'channels',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',

    'apps.users',
    'apps.clients',
    'apps.requirements_app',
    'apps.notes',
    'apps.files',
    'apps.catalog',
    'apps.proposals',
    'apps.audio',

    'apps.crm_master_data',
    'apps.crm_projects',
    'apps.invoices',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

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

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

# Database
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///' + str(BASE_DIR / 'db.sqlite3'))
DATABASES = {
    'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600, conn_health_checks=True),
}

# Custom user model
AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# DRF + JWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.FlexPageNumberPagination',
    'PAGE_SIZE': 50,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=12),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'SIGNING_KEY': os.getenv('JWT_SIGNING_KEY', SECRET_KEY),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',') if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')

# Google Drive
GOOGLE_DRIVE_CREDENTIALS_JSON = os.getenv('GOOGLE_DRIVE_CREDENTIALS_JSON', '')
GOOGLE_DRIVE_CREDENTIALS_FILE = os.getenv('GOOGLE_DRIVE_CREDENTIALS_FILE', '')
GOOGLE_DRIVE_REFRESH_TOKEN = os.getenv('GOOGLE_DRIVE_REFRESH_TOKEN', '')
GOOGLE_DRIVE_ROOT_FOLDER_ID = os.getenv('GOOGLE_DRIVE_ROOT_FOLDER_ID', '')

# Groq
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')

# Defaults
DEFAULT_NEW_USER_PASSWORD = os.getenv('DEFAULT_NEW_USER_PASSWORD', 'ChangeMe123!')
INITIAL_ADMIN_EMAIL = os.getenv('INITIAL_ADMIN_EMAIL', '')
INITIAL_ADMIN_PASSWORD = os.getenv('INITIAL_ADMIN_PASSWORD', '')
INITIAL_ADMIN_NAME = os.getenv('INITIAL_ADMIN_NAME', 'Admin')

# File upload
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024

# CSRF
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# Email (Gmail SMTP)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 465
EMAIL_USE_TLS = False
EMAIL_USE_SSL = True
EMAIL_TIMEOUT = 10  # Prevent connection hangs from crashing the worker
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = f'Skinovation Sciences <{os.getenv("EMAIL_HOST_USER", "")}>'
