from rest_framework.routers import DefaultRouter
from .views import BatchRecordViewSet

router = DefaultRouter()
router.register(r'', BatchRecordViewSet, basename='batch-record')
urlpatterns = router.urls
