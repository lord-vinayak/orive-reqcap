import uuid
from django.db import models
from django.conf import settings


class Proposal(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('exported', 'Exported'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requirement = models.OneToOneField(
        'requirements_app.Requirement', on_delete=models.CASCADE,
        related_name='proposal',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='proposals_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_exported_at = models.DateTimeField(null=True, blank=True)


class ProposalItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name='items')
    catalog_item = models.ForeignKey('catalog.CatalogItem', on_delete=models.CASCADE)
    sort_order = models.IntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'added_at']
        unique_together = [('proposal', 'catalog_item')]
