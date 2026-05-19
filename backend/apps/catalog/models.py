import uuid
from django.db import models


class CatalogItem(models.Model):
    """A historical product specification used to build proposals.

    Imported from Skinovation Sciences product catalog spreadsheet.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Historical reference
    date = models.CharField(max_length=50, blank=True, default='')
    poc = models.CharField(max_length=100, blank=True, default='')
    client_name = models.CharField(max_length=200, blank=True, default='')

    # Product classification (searchable)
    body_part = models.CharField(max_length=50, blank=True, default='')
    product_type = models.CharField(max_length=50, blank=True, default='')
    sub_product_type = models.CharField(max_length=50, blank=True, default='')

    # Key benefit tags (up to 3)
    kb_tag1 = models.CharField(max_length=100, blank=True, default='')
    kb_tag2 = models.CharField(max_length=100, blank=True, default='')
    kb_tag3 = models.CharField(max_length=100, blank=True, default='')

    specific_ingredients = models.TextField(blank=True, default='')
    color = models.CharField(max_length=20, blank=True, default='')
    fragrance = models.CharField(max_length=20, blank=True, default='')
    size = models.CharField(max_length=20, blank=True, default='')
    packaging_type = models.CharField(max_length=50, blank=True, default='')

    # Costing
    per_kg_rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    manufacturing_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rate_per_unit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tentative_packaging_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    label_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tentative_monocarton_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    potential_mrp = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['body_part', 'product_type', 'sub_product_type']
        indexes = [
            models.Index(fields=['body_part']),
            models.Index(fields=['product_type']),
            models.Index(fields=['sub_product_type']),
        ]

    def __str__(self):
        return f'{self.body_part} - {self.product_type} - {self.sub_product_type}'
