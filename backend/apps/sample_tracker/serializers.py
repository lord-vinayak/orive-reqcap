from rest_framework import serializers
from .models import SampleTrackerRecord, SampleTrackerFile


class SampleTrackerRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleTrackerRecord
        fields = [
            'id', 'date', 'client_name', 'product_type', 'product_details',
            'sample_attempt_count', 'sample_no', 'sample_approved', 'feedback',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SampleTrackerFileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = SampleTrackerFile
        fields = [
            'id', 'sample_tracker_record', 'drive_file_id', 'drive_url',
            'filename', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'drive_file_id', 'drive_url', 'uploaded_by', 'uploaded_at']
