from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import BatchRecordViewSet, BatchRecordFilesViewSet

router = DefaultRouter()
router.register(r'', BatchRecordViewSet, basename='batch-record')

urlpatterns = [
    path('<uuid:batch_record_id>/files/',
         BatchRecordFilesViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<uuid:batch_record_id>/files/<uuid:pk>/',
         BatchRecordFilesViewSet.as_view({'delete': 'destroy'})),
] + router.urls
