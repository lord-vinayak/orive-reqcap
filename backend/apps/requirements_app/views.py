from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Requirement, RequirementProduct
from .serializers import (
    RequirementListSerializer,
    RequirementDetailSerializer,
    RequirementProductSerializer,
)
from apps.clients.models import Client


class RequirementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Requirement.objects.select_related('client', 'created_by').prefetch_related('products')

    def get_serializer_class(self):
        if self.action == 'list':
            return RequirementListSerializer
        return RequirementDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        phone = self.request.query_params.get('client_phone')
        if phone:
            qs = qs.filter(client_id=phone)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get', 'post'], url_path='products')
    def products(self, request, pk=None):
        req = self.get_object()
        if request.method == 'GET':
            ser = RequirementProductSerializer(req.products.all(), many=True)
            return Response(ser.data)

        # POST: add a new row
        with transaction.atomic():
            next_row = (req.products.aggregate(m=Max('row_number'))['m'] or 0) + 1
            ser = RequirementProductSerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            product = ser.save(requirement=req, row_number=next_row)
        return Response(RequirementProductSerializer(product).data, status=status.HTTP_201_CREATED)


class RequirementProductViewSet(viewsets.ModelViewSet):
    """Update or delete an individual product row."""
    permission_classes = [IsAuthenticated]
    serializer_class = RequirementProductSerializer
    queryset = RequirementProduct.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        req_id = self.kwargs.get('requirement_id')
        if req_id:
            qs = qs.filter(requirement_id=req_id)
        return qs
