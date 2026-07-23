import re
from rest_framework import serializers
from .models import Client, EmailLog, ClientFile, ClientNote


class ClientSerializer(serializers.ModelSerializer):
    poc_name = serializers.CharField(source='poc.name', read_only=True)
    rag = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'phone_no', 'name', 'company_name', 'email', 'city',
            'gst_details', 'physical_address',
            'no_of_products', 'planned_selling_price_range', 'how_many_units_per_product',
            'poc', 'poc_name',
            'lead_status', 'lead_sub_status', 'lead_sub_status_changed_at', 'rag',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'lead_sub_status_changed_at']

    def get_rag(self, obj):
        return obj.get_rag_status()

    def validate_phone_no(self, value):
        if not re.fullmatch(r'\d{10}', value):
            raise serializers.ValidationError('Phone number must be of 10 digits.')
        return value

    def validate(self, attrs):
        lead_status = attrs.get('lead_status', getattr(self.instance, 'lead_status', ''))
        lead_sub_status = attrs.get('lead_sub_status', '')
        if lead_sub_status:
            valid = Client.VALID_SUB_STATUSES.get(lead_status, [])
            if lead_sub_status not in valid:
                raise serializers.ValidationError({
                    'lead_sub_status': f'"{lead_sub_status}" is not a valid sub-status for "{lead_status}".'
                })
        return attrs


class ClientFileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = ClientFile
        fields = [
            'id', 'client', 'drive_file_id', 'drive_url',
            'filename', 'file_type', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'drive_file_id', 'drive_url', 'uploaded_by', 'uploaded_at']


class ClientNoteSerializer(serializers.ModelSerializer):
    added_by_name = serializers.CharField(source='added_by.name', read_only=True)

    class Meta:
        model = ClientNote
        fields = ['id', 'client', 'text', 'added_by', 'added_by_name', 'created_at']
        read_only_fields = ['id', 'client', 'added_by', 'created_at']


class EmailLogSerializer(serializers.ModelSerializer):
    project_no = serializers.CharField(source='project.project_no', read_only=True, default=None)

    class Meta:
        model = EmailLog
        fields = [
            'id', 'email_type', 'email_type_label', 'recipient_email',
            'subject', 'sent_by_name', 'sent_at', 'attachments',
            'project', 'project_no',
        ]
