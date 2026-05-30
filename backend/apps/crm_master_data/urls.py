from rest_framework.routers import DefaultRouter
from .views import (
    ManufacturerViewSet, VendorViewSet, InternalTeamMemberViewSet,
    ManufacturerRatingViewSet, VendorRatingViewSet, VendorProjectPaymentViewSet,
)

router = DefaultRouter()
router.register(r'manufacturers', ManufacturerViewSet, basename='manufacturer')
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'team-members', InternalTeamMemberViewSet, basename='team-member')
router.register(r'manufacturer-ratings', ManufacturerRatingViewSet, basename='manufacturer-rating')
router.register(r'vendor-ratings', VendorRatingViewSet, basename='vendor-rating')
router.register(r'vendor-payments', VendorProjectPaymentViewSet, basename='vendor-payment')

urlpatterns = router.urls
