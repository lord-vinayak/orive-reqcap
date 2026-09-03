import uuid

from django.db import models
from django.conf import settings


class PackagingClientRecord(models.Model):
    """Standalone packaging client log row — no FK to Requirement/Proposal/CRMProject. No field is mandatory."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client_name = models.TextField(blank=True, default='')
    packaging_name = models.TextField(blank=True, default='')
    size = models.TextField(blank=True, default='')
    glass_pet = models.TextField(blank=True, default='', verbose_name='Glass/Pet')
    moq = models.TextField(blank=True, default='', verbose_name='MOQ')
    cost_to_ss = models.TextField(blank=True, default='', verbose_name='Cost To SS')
    cost_to_client = models.TextField(blank=True, default='')
    vendor_name = models.TextField(blank=True, default='')
    poc = models.TextField(blank=True, default='', verbose_name='POC')
    contact_details = models.TextField(blank=True, default='')
    poc2 = models.TextField(blank=True, default='', verbose_name='POC2')
    cd2 = models.TextField(blank=True, default='', verbose_name='CD2')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='packaging_client_records_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client_name']),
            models.Index(fields=['vendor_name']),
        ]

    def __str__(self):
        return f'{self.client_name} | {self.packaging_name}'
