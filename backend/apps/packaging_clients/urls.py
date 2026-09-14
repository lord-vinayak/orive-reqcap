from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PackagingClientRecordViewSet, PackagingClientFilesViewSet

router = DefaultRouter()
router.register(r'', PackagingClientRecordViewSet, basename='packaging-client-record')

urlpatterns = [
    path('<uuid:packaging_client_id>/files/',
         PackagingClientFilesViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<uuid:packaging_client_id>/files/<uuid:pk>/',
         PackagingClientFilesViewSet.as_view({'delete': 'destroy'})),
] + router.urls
