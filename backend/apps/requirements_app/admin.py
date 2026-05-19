from django.contrib import admin
from .models import Requirement, RequirementProduct


class RequirementProductInline(admin.TabularInline):
    model = RequirementProduct
    extra = 0


@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    list_display = ('title', 'client', 'status', 'updated_at')
    list_filter = ('status',)
    search_fields = ('title', 'client__name', 'client__phone_no')
    inlines = [RequirementProductInline]
