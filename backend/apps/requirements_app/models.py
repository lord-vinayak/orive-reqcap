import uuid
from django.db import models
from django.conf import settings
from apps.clients.models import Client


class Requirement(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('saved', 'Saved'),
        ('proposal_ready', 'Proposal Ready'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE,
        related_name='requirements', to_field='phone_no',
        db_column='client_phone',
    )
    title = models.CharField(max_length=255, blank=True, default='')
    target_audience_age = models.CharField(max_length=50, blank=True, default='')
    no_of_products = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='requirements_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title or f'Requirement {self.id}'

    def save(self, *args, **kwargs):
        if not self.title and self.client_id:
            from datetime import date
            self.title = f'Req - {self.client.name} - {date.today().isoformat()}'
        super().save(*args, **kwargs)


class RequirementProduct(models.Model):
    BODY_PARTS = ['Face', 'Body', 'Hair', 'Lip', 'Eye']
    CATEGORIES = ['Wash', 'Moisturizer', 'Serum', 'Toner', 'Mask',
                  'Sunscreen', 'Scrub', 'Oil', 'Shampoo', 'Conditioner', 'Spray', 'Balm']
    PACKAGING = ['Jar', 'Bottle', 'Tube', 'Stick']

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requirement = models.ForeignKey(
        Requirement, on_delete=models.CASCADE, related_name='products',
    )
    row_number = models.IntegerField()
    body_part = models.CharField(max_length=50, blank=True, default='')
    category = models.CharField(max_length=50, blank=True, default='')
    sub_category = models.CharField(max_length=50, blank=True, default='')
    key_benefits = models.JSONField(default=list, blank=True)
    size = models.CharField(max_length=20, blank=True, default='')
    packaging_type = models.CharField(max_length=20, blank=True, default='')
    packaging_notes = models.TextField(blank=True, default='')
    planned_mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    specific_ingredient = models.TextField(blank=True, default='')
    benchmark_product = models.CharField(max_length=255, blank=True, default='')
    has_color = models.BooleanField(null=True, blank=True)
    color_details = models.TextField(blank=True, default='')
    has_fragrance = models.BooleanField(null=True, blank=True)
    fragrance_details = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['row_number']
        unique_together = [('requirement', 'row_number')]

    def __str__(self):
        return f'{self.requirement_id} row {self.row_number}'
