from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import IsAdmin
from .models import (
    Manufacturer, Vendor, InternalTeamMember,
    ManufacturerRating, VendorRating, VendorProjectPayment,
)
from .serializers import (
    ManufacturerSerializer, VendorSerializer, InternalTeamMemberSerializer,
    ManufacturerRatingSerializer, VendorRatingSerializer, VendorProjectPaymentSerializer,
)


class CRMMasterDataPermission(permissions.BasePermission):
    """All authenticated users can read and create; only admin can edit/delete."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in (*permissions.SAFE_METHODS, 'POST'):
            return True
        return request.user.role == 'admin'


class ManufacturerViewSet(viewsets.ModelViewSet):
    serializer_class = ManufacturerSerializer
    permission_classes = [CRMMasterDataPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'poc_name', 'city', 'state']
    ordering_fields = ['company_name', 'city', 'created_at']

    def get_queryset(self):
        return Manufacturer.objects.prefetch_related('ratings').all()

    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        qs = Manufacturer.objects.values('id', 'vendor_id', 'company_name', 'city').order_by('company_name')
        return Response(list(qs))

    @action(detail=False, methods=['get'], url_path='all-for-payment')
    def all_for_payment(self, request):
        """Combined list of all manufacturers + all vendors for payment vendor search."""
        manufacturers = list(
            Manufacturer.objects.values('id', 'vendor_id', 'company_name', 'city')
            .order_by('company_name')
        )
        vendors = list(
            Vendor.objects.values('id', 'vendor_id', 'company_name', 'city', 'vendor_type')
            .order_by('company_name')
        )
        result = [
            {'id': str(m['id']), 'vendor_id': m['vendor_id'], 'company_name': m['company_name'],
             'city': m['city'] or '', 'kind': 'manufacturer'}
            for m in manufacturers
        ] + [
            {'id': str(v['id']), 'vendor_id': v['vendor_id'], 'company_name': v['company_name'],
             'city': v['city'] or '', 'kind': 'vendor', 'vendor_type': v['vendor_type']}
            for v in vendors
        ]
        result.sort(key=lambda x: x['company_name'].lower())
        return Response(result)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admin can delete.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class VendorViewSet(viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    permission_classes = [CRMMasterDataPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'poc_name', 'city']
    ordering_fields = ['company_name', 'city', 'created_at']

    def get_queryset(self):
        qs = Vendor.objects.prefetch_related('ratings').all()
        vendor_type = self.request.query_params.get('vendor_type')
        if vendor_type:
            qs = qs.filter(vendor_type=vendor_type)
        return qs

    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        vendor_type = request.query_params.get('vendor_type', '')
        qs = Vendor.objects.filter(vendor_type=vendor_type).values(
            'id', 'vendor_id', 'company_name', 'city'
        ).order_by('company_name')
        return Response(list(qs))

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admin can delete.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class InternalTeamMemberViewSet(viewsets.ModelViewSet):
    serializer_class = InternalTeamMemberSerializer
    permission_classes = [CRMMasterDataPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'email']

    def get_queryset(self):
        qs = InternalTeamMember.objects.select_related('user').all()
        team = self.request.query_params.get('team')
        if team:
            qs = qs.filter(team=team)
        return qs

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admin can delete.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class ManufacturerRatingViewSet(viewsets.ModelViewSet):
    serializer_class = ManufacturerRatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return ManufacturerRating.objects.select_related('rated_by').all()

    def perform_create(self, serializer):
        serializer.save(rated_by=self.request.user)


class VendorRatingViewSet(viewsets.ModelViewSet):
    serializer_class = VendorRatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return VendorRating.objects.select_related('rated_by').all()

    def perform_create(self, serializer):
        serializer.save(rated_by=self.request.user)


class VendorProjectPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = VendorProjectPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = VendorProjectPayment.objects.select_related('manufacturer', 'vendor', 'project')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admin can delete.'}, status=403)
        return super().destroy(request, *args, **kwargs)
