from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CatalogViewSet, catalog_facets

router = DefaultRouter()
router.register(r'', CatalogViewSet, basename='catalog')

urlpatterns = [
    path('facets/', catalog_facets),
] + router.urls
