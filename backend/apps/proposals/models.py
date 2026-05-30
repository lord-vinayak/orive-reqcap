import uuid
from django.db import models
from django.conf import settings


class Proposal(models.Model):
    """A Client Costing (formerly 'Proposal') — a versioned set of costed items for a Requirement."""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('exported', 'Exported'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requirement = models.ForeignKey(
        'requirements_app.Requirement', on_delete=models.CASCADE,
        related_name='proposals',
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
    """A single row inside a Client Costing.

    Two creation modes:
      1. Catalog-linked: created with a CatalogItem ref; on save its fields are
         snapshot-copied into `snapshot` so edits don't touch the master Catalog.
      2. Freeform: created directly from a Requirement product row (or by hand);
         `catalog_item` is NULL and all data lives in `snapshot`.

    Either way, the user can edit any snapshot field freely. The Catalog master
    is never mutated by costing edits.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name='items')
    catalog_item = models.ForeignKey(
        'catalog.CatalogItem', on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    # Per-item editable copy of all catalog fields plus any freeform additions.
    # Keys mirror CatalogItem field names (body_part, product_type, sub_product_type,
    # kb_tag1/2/3, size, packaging_type, rate_category, per_kg_rate, ..., potential_mrp,
    # specific_ingredients, color, fragrance, notes).
    snapshot = models.JSONField(default=dict, blank=True)
    sort_order = models.IntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'added_at']
        # Removed unique_together — a user may now add the same catalog item
        # multiple times if they want different variations.
