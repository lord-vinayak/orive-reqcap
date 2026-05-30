from rest_framework import serializers
from .models import (
    Manufacturer, Vendor, InternalTeamMember,
    ManufacturerRating, VendorRating, VendorProjectPayment,
)


class ManufacturerSerializer(serializers.ModelSerializer):
    average_rating = serializers.FloatField(read_only=True)

    class Meta:
        model = Manufacturer
        fields = [
            'id', 'company_name', 'poc_name', 'phone_no', 'email', 'city',
            'state', 'address',
            'us_fda', 'cosmetic_fda', 'ayush', 'iso', 'gst_certified', 'gmp', 'stability_chamber',
            'bank_account_no', 'bank_ifsc', 'bank_name', 'pan_no', 'gst_no',
            'notes', 'average_rating', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'average_rating', 'created_at', 'updated_at']


class VendorSerializer(serializers.ModelSerializer):
    average_rating = serializers.FloatField(read_only=True)

    class Meta:
        model = Vendor
        fields = [
            'id', 'vendor_type', 'company_name', 'poc_name', 'phone_no', 'email', 'city',
            'bank_account_no', 'bank_ifsc', 'bank_name', 'pan_no', 'gst_no',
            'notes', 'average_rating', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'average_rating', 'created_at', 'updated_at']


class InternalTeamMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = InternalTeamMember
        fields = ['id', 'team', 'name', 'email', 'phone_no', 'user', 'user_email', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user_email', 'created_at', 'updated_at']


class ManufacturerRatingSerializer(serializers.ModelSerializer):
    rated_by_name = serializers.CharField(source='rated_by.name', read_only=True)

    class Meta:
        model = ManufacturerRating
        fields = ['id', 'manufacturer', 'project', 'rating', 'comment', 'rated_by', 'rated_by_name', 'created_at']
        read_only_fields = ['id', 'rated_by', 'rated_by_name', 'created_at']


class VendorRatingSerializer(serializers.ModelSerializer):
    rated_by_name = serializers.CharField(source='rated_by.name', read_only=True)

    class Meta:
        model = VendorRating
        fields = ['id', 'vendor', 'project', 'rating', 'comment', 'rated_by', 'rated_by_name', 'created_at']
        read_only_fields = ['id', 'rated_by', 'rated_by_name', 'created_at']


class VendorProjectPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProjectPayment
        fields = [
            'id', 'project', 'manufacturer', 'vendor',
            'invoice_amount', 'paid_amount', 'payment_date',
            'payment_status', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        if not data.get('manufacturer') and not data.get('vendor'):
            raise serializers.ValidationError('Either manufacturer or vendor must be specified.')
        if data.get('manufacturer') and data.get('vendor'):
            raise serializers.ValidationError('Specify either manufacturer or vendor, not both.')
        return data
