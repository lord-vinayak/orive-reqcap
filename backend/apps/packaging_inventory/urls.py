from rest_framework.routers import DefaultRouter
from .views import PackagingRecordViewSet

router = DefaultRouter()
router.register(r'', PackagingRecordViewSet, basename='packaging-record')
urlpatterns = router.urls
