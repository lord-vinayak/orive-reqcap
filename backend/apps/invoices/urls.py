from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, BillingInfoViewSet

router = DefaultRouter()
router.register('billing-info', BillingInfoViewSet, basename='billing-info')
router.register('', InvoiceViewSet, basename='invoice')

urlpatterns = router.urls
