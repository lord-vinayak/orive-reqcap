from rest_framework import serializers
from .models import Requirement, RequirementProduct
from apps.clients.serializers import ClientSerializer


class RequirementProductSerializer(serializers.ModelSerializer):
    row_number = serializers.IntegerField(required=False)

    class Meta:
        model = RequirementProduct
        fields = [
            'id', 'requirement', 'row_number', 'body_part', 'category', 'sub_category',
            'key_benefits', 'size', 'packaging_type', 'packaging_notes', 'planned_mrp',
            'specific_ingredient', 'benchmark_product', 'has_color', 'color_details',
            'has_fragrance', 'fragrance_details', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'requirement', 'created_at', 'updated_at']


class RequirementListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    client_data = ClientSerializer(source='client', read_only=True)

    class Meta:
        model = Requirement
        fields = [
            'id', 'client', 'client_data', 'title', 'status', 'no_of_products',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]


class RequirementDetailSerializer(serializers.ModelSerializer):
    products = RequirementProductSerializer(many=True, read_only=True)
    client_data = ClientSerializer(source='client', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = Requirement
        fields = [
            'id', 'client', 'client_data', 'title', 'target_audience_age',
            'no_of_products', 'status', 'created_by', 'created_by_name',
            'products', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
