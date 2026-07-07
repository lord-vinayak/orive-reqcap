import uuid
from django.db import models
from django.conf import settings


class BatchRecord(models.Model):
    """Standalone production batch log row — no FK to Requirement/Proposal/CRMProject."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client_name = models.CharField(max_length=200)
    brand_name = models.CharField(max_length=200, blank=True, default='')
    product_type = models.CharField(max_length=150, blank=True, default='')
    product_name = models.CharField(max_length=200)
    packaging_type = models.CharField(max_length=150, blank=True, default='')
    pack_size = models.CharField(max_length=50, blank=True, default='')
    moq = models.PositiveIntegerField(null=True, blank=True, verbose_name='Order Quantity / MOQ (units)')
    batch_number = models.CharField(max_length=100)
    manufacturing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='batch_records_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client_name']),
            models.Index(fields=['batch_number']),
        ]

    def __str__(self):
        return f'{self.client_name} | {self.product_name} | {self.batch_number}'
