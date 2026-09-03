from rest_framework.routers import DefaultRouter
from .views import PackagingClientRecordViewSet

router = DefaultRouter()
router.register(r'', PackagingClientRecordViewSet, basename='packaging-client-record')
urlpatterns = router.urls
