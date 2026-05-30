from django.contrib import admin
from .models import (
    Manufacturer, Vendor, InternalTeamMember,
    ManufacturerRating, VendorRating, VendorProjectPayment,
)


@admin.register(Manufacturer)
class ManufacturerAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'city', 'state', 'us_fda', 'gmp', 'average_rating', 'updated_at')
    list_filter = ('us_fda', 'cosmetic_fda', 'ayush', 'iso', 'gmp', 'stability_chamber')
    search_fields = ('company_name', 'poc_name', 'city', 'state')


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'vendor_type', 'city', 'average_rating', 'updated_at')
    list_filter = ('vendor_type',)
    search_fields = ('company_name', 'poc_name', 'city')


@admin.register(InternalTeamMember)
class InternalTeamMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'team', 'email', 'phone_no')
    list_filter = ('team',)
    search_fields = ('name', 'email')


@admin.register(ManufacturerRating)
class ManufacturerRatingAdmin(admin.ModelAdmin):
    list_display = ('manufacturer', 'project', 'rating', 'rated_by', 'created_at')
    list_filter = ('rating',)


@admin.register(VendorRating)
class VendorRatingAdmin(admin.ModelAdmin):
    list_display = ('vendor', 'project', 'rating', 'rated_by', 'created_at')
    list_filter = ('rating',)


@admin.register(VendorProjectPayment)
class VendorProjectPaymentAdmin(admin.ModelAdmin):
    list_display = ('project', 'manufacturer', 'vendor', 'invoice_amount', 'payment_status', 'created_at')
    list_filter = ('payment_status',)
