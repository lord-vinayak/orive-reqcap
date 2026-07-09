import uuid
from django.db import models
from django.conf import settings


class IngredientRecord(models.Model):
    """Standalone ingredient sample/usage log row — no FK to Requirement/Proposal/CRMProject."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(null=True, blank=True)
    category = models.CharField(max_length=150, blank=True, default='')
    client_name = models.CharField(max_length=200)
    vendor_name = models.CharField(max_length=200)
    product_name = models.CharField(max_length=200)
    ingredient_use = models.CharField(max_length=255, blank=True, default='', verbose_name='Ingredient use / purpose')
    quantity_sent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Quantity Sent (gm)')
    used_in_batch = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    comment = models.CharField(max_length=500, blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='ingredient_records_created',
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
        if self.quantity_sent is None:
            return None
        return self.quantity_sent - (self.used_in_batch or 0)

    def __str__(self):
        return f'{self.client_name} | {self.vendor_name} | {self.product_name}'
