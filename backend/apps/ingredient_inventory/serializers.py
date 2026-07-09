from rest_framework import serializers
from .models import IngredientRecord


class IngredientRecordSerializer(serializers.ModelSerializer):
    quantity_remained = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = IngredientRecord
        fields = [
            'id', 'date', 'category', 'client_name', 'vendor_name', 'product_name',
            'ingredient_use', 'quantity_sent', 'used_in_batch', 'quantity_remained',
            'comment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        client_name = attrs.get('client_name', getattr(self.instance, 'client_name', '')).strip()
        vendor_name = attrs.get('vendor_name', getattr(self.instance, 'vendor_name', '')).strip()
        product_name = attrs.get('product_name', getattr(self.instance, 'product_name', '')).strip()
        if not client_name:
            raise serializers.ValidationError({'client_name': 'Client name is required.'})
        if not vendor_name:
            raise serializers.ValidationError({'vendor_name': 'Vendor name is required.'})
        if not product_name:
            raise serializers.ValidationError({'product_name': 'Product name is required.'})
        return attrs
