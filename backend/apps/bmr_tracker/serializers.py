from rest_framework import serializers
from .models import BMRTrackerRecord, BMRTrackerFile


class BMRTrackerRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BMRTrackerRecord
        fields = [
            'id', 'date', 'client_name', 'product', 'batch_no',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BMRTrackerFileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = BMRTrackerFile
        fields = [
            'id', 'bmr_tracker_record', 'drive_file_id', 'drive_url',
            'filename', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'drive_file_id', 'drive_url', 'uploaded_by', 'uploaded_at']
