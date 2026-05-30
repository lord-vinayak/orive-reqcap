"""Add snapshot JSONField to ProposalItem, make catalog_item nullable,
drop the (proposal, catalog_item) unique constraint, and backfill snapshot
from the linked catalog item for all existing rows.

This unlocks two features:
  - Direct-add from the Product Requirements table (catalog_item is NULL).
  - Free per-cell editing of costing items without mutating the master Catalog.
"""
from django.db import migrations, models


CATALOG_FIELDS = [
    'body_part', 'product_type', 'sub_product_type',
    'kb_tag1', 'kb_tag2', 'kb_tag3',
    'specific_ingredients', 'color', 'fragrance', 'size', 'packaging_type',
    'per_kg_rate', 'manufacturing_cost', 'rate_per_unit',
    'tentative_packaging_cost', 'label_cost', 'tentative_monocarton_cost',
    'total_cost', 'potential_mrp', 'rate_category',
]


def _to_jsonable(val):
    """Decimal isn't JSON-serializable as-is — coerce to string for storage."""
    if val is None or val == '':
        return None
    if hasattr(val, 'as_tuple'):  # Decimal
        return str(val)
    return val


def backfill_snapshot(apps, schema_editor):
    ProposalItem = apps.get_model('proposals', 'ProposalItem')
    for item in ProposalItem.objects.select_related('catalog_item').iterator():
        if item.snapshot:
            continue
        c = item.catalog_item
        if not c:
            continue
        item.snapshot = {f: _to_jsonable(getattr(c, f, None)) for f in CATALOG_FIELDS}
        item.save(update_fields=['snapshot'])


def reverse_noop(apps, schema_editor):
    # Schema reversal handles the field/constraint removal; snapshot data is lost.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('proposals', '0003_proposal_onetomany'),
        ('catalog', '0003_catalogitem_uploaded_at'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='proposalitem',
            unique_together=set(),
        ),
        migrations.AlterField(
            model_name='proposalitem',
            name='catalog_item',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=models.deletion.SET_NULL,
                to='catalog.catalogitem',
            ),
        ),
        migrations.AddField(
            model_name='proposalitem',
            name='snapshot',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(backfill_snapshot, reverse_noop),
    ]
