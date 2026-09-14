from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import BMRTrackerRecordViewSet, BMRTrackerFilesViewSet

router = DefaultRouter()
router.register(r'', BMRTrackerRecordViewSet, basename='bmr-tracker-record')

urlpatterns = [
    path('<uuid:bmr_tracker_id>/files/',
         BMRTrackerFilesViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<uuid:bmr_tracker_id>/files/<uuid:pk>/',
         BMRTrackerFilesViewSet.as_view({'delete': 'destroy'})),
] + router.urls
