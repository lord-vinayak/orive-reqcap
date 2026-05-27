import re
from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    poc_name = serializers.CharField(source='poc.name', read_only=True)

    class Meta:
        model = Client
        fields = [
            'phone_no', 'name', 'company_name', 'email', 'city',
            'gst_details', 'physical_address', 'poc', 'poc_name',
            'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_phone_no(self, value):
        if not re.fullmatch(r'\d{10}', value):
            raise serializers.ValidationError('Phone number must be of 10 digits.')
        return value
