from decimal import Decimal, InvalidOperation

from rest_framework import serializers
from .models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    invoice_type_label = serializers.CharField(source='get_invoice_type_display', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'project', 'invoice_type', 'invoice_type_label',
            'invoice_number', 'date',
            'client_name', 'company_name', 'client_gstin',
            'billing_address', 'shipping_address', 'dispatch_address', 'eway_bill_no',
            'sgst_rate', 'cgst_rate', 'igst_rate',
            'shipping_cost', 'advance_rate', 'advance_received',
            'items',
            'drive_file_id', 'drive_url',
            'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'drive_file_id', 'drive_url', 'created_by_name', 'created_at']

    def get_created_by_name(self, obj):
        return getattr(obj.created_by, 'name', None) or getattr(obj.created_by, 'email', None)

    def validate_items(self, value):
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError('items must be a non-empty list.')
        for idx, item in enumerate(value, start=1):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f'Item {idx} must be an object.')
            for field in ('rate_per_item', 'qty'):
                raw = item.get(field)
                if raw is None or raw == '':
                    continue
                try:
                    Decimal(str(raw))
                except (InvalidOperation, ValueError, TypeError):
                    raise serializers.ValidationError(f"Item {idx}: '{field}' must be a number, got {raw!r}.")
        return value
