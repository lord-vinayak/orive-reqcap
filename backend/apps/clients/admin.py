from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('phone_no', 'name', 'company_name', 'city', 'updated_at')
    search_fields = ('phone_no', 'name', 'company_name')
