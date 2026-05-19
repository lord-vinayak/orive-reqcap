from rest_framework import serializers
from .models import Proposal, ProposalItem
from apps.catalog.serializers import CatalogItemSerializer


class ProposalItemSerializer(serializers.ModelSerializer):
    catalog_data = CatalogItemSerializer(source='catalog_item', read_only=True)

    class Meta:
        model = ProposalItem
        fields = ['id', 'proposal', 'catalog_item', 'catalog_data', 'sort_order', 'added_at']
        read_only_fields = ['id', 'added_at']


class ProposalSerializer(serializers.ModelSerializer):
    items = ProposalItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = Proposal
        fields = [
            'id', 'requirement', 'status', 'created_by', 'created_by_name',
            'items', 'created_at', 'updated_at', 'last_exported_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'last_exported_at']
