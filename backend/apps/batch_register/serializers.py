from rest_framework import serializers
from .models import BatchRecord


class BatchRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BatchRecord
        fields = [
            'id', 'client_name', 'brand_name', 'product_type', 'product_name',
            'packaging_type', 'pack_size', 'moq', 'batch_number',
            'manufacturing_date', 'expiry_date', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        client_name = attrs.get('client_name', getattr(self.instance, 'client_name', '')).strip()
        product_name = attrs.get('product_name', getattr(self.instance, 'product_name', '')).strip()
        batch_number = attrs.get('batch_number', getattr(self.instance, 'batch_number', '')).strip()
        if not client_name:
            raise serializers.ValidationError({'client_name': 'Client name is required.'})
        if not product_name:
            raise serializers.ValidationError({'product_name': 'Product name is required.'})
        if not batch_number:
            raise serializers.ValidationError({'batch_number': 'Batch number is required.'})
        return attrs
