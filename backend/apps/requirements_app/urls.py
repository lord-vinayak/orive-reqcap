from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import RequirementViewSet, RequirementProductViewSet

router = DefaultRouter()
router.register(r'requirements', RequirementViewSet, basename='requirement')

urlpatterns = router.urls + [
    path('requirements/<uuid:requirement_id>/products/<uuid:pk>/',
         RequirementProductViewSet.as_view({'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
]
