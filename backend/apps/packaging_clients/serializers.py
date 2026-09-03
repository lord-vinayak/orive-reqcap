from rest_framework import serializers
from .models import PackagingClientRecord


class PackagingClientRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagingClientRecord
        fields = [
            'id', 'client_name', 'packaging_name', 'size', 'glass_pet', 'moq',
            'cost_to_ss', 'cost_to_client', 'vendor_name', 'poc', 'contact_details',
            'poc2', 'cd2', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
