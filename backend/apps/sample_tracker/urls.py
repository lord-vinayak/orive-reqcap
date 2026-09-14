from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import SampleTrackerRecordViewSet, SampleTrackerFilesViewSet

router = DefaultRouter()
router.register(r'', SampleTrackerRecordViewSet, basename='sample-tracker-record')

urlpatterns = [
    path('<uuid:sample_tracker_id>/files/',
         SampleTrackerFilesViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<uuid:sample_tracker_id>/files/<uuid:pk>/',
         SampleTrackerFilesViewSet.as_view({'delete': 'destroy'})),
] + router.urls
