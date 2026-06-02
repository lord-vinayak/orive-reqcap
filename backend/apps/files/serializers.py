from rest_framework import serializers
from .models import FileRecord, ProposalDocument


class FileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = FileRecord
        fields = [
            'id', 'requirement', 'product', 'drive_file_id', 'drive_url',
            'filename', 'file_type', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'drive_file_id', 'drive_url', 'uploaded_by', 'uploaded_at']


class ProposalDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = ProposalDocument
        fields = [
            'id', 'requirement', 'drive_file_id', 'drive_url',
            'filename', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'drive_file_id', 'drive_url', 'uploaded_by', 'uploaded_at']
