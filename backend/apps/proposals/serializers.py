from rest_framework import serializers
from .models import Proposal, ProposalItem
from apps.catalog.serializers import CatalogItemSerializer


CATALOG_FIELDS = [
    'body_part', 'product_type', 'sub_product_type',
    'kb_tag1', 'kb_tag2', 'kb_tag3',
    'specific_ingredients', 'color', 'fragrance', 'size', 'packaging_type',
    'per_kg_rate', 'manufacturing_cost', 'rate_per_unit',
    'tentative_packaging_cost', 'label_cost', 'tentative_monocarton_cost',
    'total_cost', 'potential_mrp', 'rate_category',
]


class ProposalItemSerializer(serializers.ModelSerializer):
    """A costing item.

    `catalog_data` is a *merged* view: catalog values first, snapshot overrides on top.
    The frontend reads from `catalog_data` exclusively, so existing display code keeps
    working whether the row is catalog-linked or freeform.

    To create a freeform item, POST with `{ "snapshot": {...} }`.
    To create a catalog-linked item, POST with `{ "catalog_item": "<uuid>" }`;
    its catalog fields are snapshotted automatically.
    To edit any field, PATCH with `{ "snapshot": { field: value } }` — the
    payload is merged into the existing snapshot.
    """
    catalog_data = serializers.SerializerMethodField()
    snapshot = serializers.JSONField(required=False)

    class Meta:
        model = ProposalItem
        fields = ['id', 'proposal', 'catalog_item', 'catalog_data', 'snapshot',
                  'sort_order', 'added_at']
        read_only_fields = ['id', 'added_at', 'catalog_data']
        extra_kwargs = {'catalog_item': {'required': False, 'allow_null': True}}

    def get_catalog_data(self, obj):
        base = CatalogItemSerializer(obj.catalog_item).data if obj.catalog_item else {}
        # Snapshot wins over catalog defaults.
        merged = {**base}
        for k, v in (obj.snapshot or {}).items():
            if v is not None and v != '':
                merged[k] = v
        return merged

    def create(self, validated_data):
        snapshot = validated_data.pop('snapshot', None) or {}
        catalog_item = validated_data.get('catalog_item')
        # When linking to a catalog item, snapshot its fields so future edits
        # don't touch the master Catalog.
        if catalog_item:
            for f in CATALOG_FIELDS:
                if f not in snapshot:
                    val = getattr(catalog_item, f, None)
                    if val is None or val == '':
                        continue
                    # Decimal isn't JSON-serializable; coerce to str.
                    snapshot[f] = str(val) if hasattr(val, 'as_tuple') else val
        validated_data['snapshot'] = snapshot
        return super().create(validated_data)

    def update(self, instance, validated_data):
        snapshot = validated_data.pop('snapshot', None)
        if snapshot is not None:
            # Merge — partial updates only touch the keys provided.
            merged = dict(instance.snapshot or {})
            merged.update(snapshot)
            instance.snapshot = merged
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class ProposalSerializer(serializers.ModelSerializer):
    items = ProposalItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = Proposal
        fields = [
            'id', 'requirement', 'status', 'created_by', 'created_by_name',
            'items', 'created_at', 'updated_at', 'last_exported_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'last_exported_at']
