from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health(_request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/auth/', include('apps.users.urls_auth')),
    path('api/users/', include('apps.users.urls')),
    path('api/clients/', include('apps.clients.urls')),
    path('api/', include('apps.requirements_app.urls')),
    path('api/', include('apps.notes.urls')),
    path('api/', include('apps.files.urls')),
    path('api/catalog/', include('apps.catalog.urls')),
    path('api/', include('apps.proposals.urls')),
    path('api/audio/', include('apps.audio.urls')),
    path('api/crm/', include('apps.crm_projects.urls')),
    path('api/crm/', include('apps.crm_master_data.urls')),
]
