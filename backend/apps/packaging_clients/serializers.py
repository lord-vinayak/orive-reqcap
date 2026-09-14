from rest_framework import serializers
from .models import PackagingClientRecord, PackagingClientFile


class PackagingClientRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagingClientRecord
        fields = [
            'id', 'client_name', 'packaging_name', 'size', 'glass_pet', 'client_moq', 'vendor_moq',
            'cost_to_ss', 'cost_to_client', 'vendor_name', 'poc', 'contact_details',
            'poc2', 'cd2', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PackagingClientFileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = PackagingClientFile
        fields = [
            'id', 'packaging_client', 'drive_file_id', 'drive_url',
            'filename', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'drive_file_id', 'drive_url', 'uploaded_by', 'uploaded_at']
