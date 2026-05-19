from rest_framework import serializers
from .models import FileRecord


class FileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = FileRecord
        fields = [
            'id', 'requirement', 'product', 'drive_file_id', 'drive_url',
            'filename', 'file_type', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'drive_file_id', 'drive_url', 'uploaded_by', 'uploaded_at']
