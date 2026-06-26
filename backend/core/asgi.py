import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from core.ws_jwt_middleware import JWTAuthMiddleware
import apps.crm_projects.routing

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': JWTAuthMiddleware(
        URLRouter(apps.crm_projects.routing.websocket_urlpatterns)
    ),
})
