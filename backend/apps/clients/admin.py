from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('phone_no', 'name', 'company_name', 'city', 'lead_status', 'lead_sub_status', 'updated_at')
    list_filter = ('lead_status',)
    search_fields = ('phone_no', 'name', 'company_name')
