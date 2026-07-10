import uuid
from decimal import Decimal, InvalidOperation

from django.db import models
from django.conf import settings


class PackagingRecord(models.Model):
    """Standalone packaging material log row — no FK to Requirement/Proposal/CRMProject. No field is mandatory."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(null=True, blank=True)
    category = models.CharField(max_length=150, blank=True, default='')
    client_name = models.CharField(max_length=200, blank=True, default='')
    vendor_name = models.CharField(max_length=200, blank=True, default='')
    product_name = models.CharField(max_length=200, blank=True, default='')
    product_type = models.CharField(max_length=150, blank=True, default='')
    no_of_ordered_by_client = models.CharField(max_length=100, blank=True, default='', verbose_name='No. Of Ordered by Client')
    quantity_sent = models.CharField(max_length=100, blank=True, default='')
    used_in_batch = models.CharField(max_length=100, blank=True, default='')
    price_per_unit = models.CharField(max_length=100, blank=True, default='')
    damaged_missing = models.CharField(max_length=100, blank=True, default='', verbose_name='Damaged / Missing')
    comment = models.CharField(max_length=500, blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='packaging_records_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client_name']),
            models.Index(fields=['vendor_name']),
        ]

    @property
    def quantity_remained(self):
        # ponytail: quantity_sent/used_in_batch are free text now — only compute when both parse as numbers
        if not self.quantity_sent:
            return None
        try:
            sent = Decimal(self.quantity_sent)
            used = Decimal(self.used_in_batch) if self.used_in_batch else Decimal(0)
        except InvalidOperation:
            return None
        return sent - used

    def __str__(self):
        return f'{self.client_name} | {self.vendor_name} | {self.product_name}'
