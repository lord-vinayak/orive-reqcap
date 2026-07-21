from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ManufacturerViewSet, VendorViewSet, VendorCategoryViewSet,
    InternalTeamMemberViewSet,
    ManufacturerRatingViewSet, VendorRatingViewSet, VendorProjectPaymentViewSet,
    ServiceBaseRatesView,
)

router = DefaultRouter()
router.register(r'manufacturers', ManufacturerViewSet, basename='manufacturer')
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'vendor-categories', VendorCategoryViewSet, basename='vendor-category')
router.register(r'team-members', InternalTeamMemberViewSet, basename='team-member')
router.register(r'manufacturer-ratings', ManufacturerRatingViewSet, basename='manufacturer-rating')
router.register(r'vendor-ratings', VendorRatingViewSet, basename='vendor-rating')
router.register(r'vendor-payments', VendorProjectPaymentViewSet, basename='vendor-payment')

urlpatterns = router.urls + [
    path('service-rates/', ServiceBaseRatesView.as_view(), name='service-rates'),
]
