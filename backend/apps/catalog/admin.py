from django.contrib import admin
from .models import CatalogItem


@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ('body_part', 'product_type', 'sub_product_type', 'client_name', 'is_active')
    list_filter = ('body_part', 'product_type', 'is_active')
    search_fields = ('body_part', 'product_type', 'sub_product_type', 'kb_tag1', 'kb_tag2', 'kb_tag3', 'client_name')
