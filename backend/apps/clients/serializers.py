import re
from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    poc_name = serializers.CharField(source='poc.name', read_only=True)

    class Meta:
        model = Client
        fields = [
            'phone_no', 'name', 'company_name', 'email', 'city',
            'gst_details', 'physical_address',
            'no_of_products', 'planned_selling_price_range', 'how_many_units_per_product',
            'poc', 'poc_name',
            'lead_status', 'lead_sub_status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

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
