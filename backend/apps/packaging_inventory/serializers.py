from rest_framework import serializers
from .models import PackagingRecord


class PackagingRecordSerializer(serializers.ModelSerializer):
    quantity_remained = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = PackagingRecord
        fields = [
            'id', 'date', 'category', 'client_name', 'vendor_name', 'product_name', 'product_type',
            'no_of_ordered_by_client', 'quantity_sent', 'used_in_batch', 'quantity_remained',
            'price_per_unit', 'damaged_missing', 'comment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
