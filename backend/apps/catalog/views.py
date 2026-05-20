from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CatalogItem
from .serializers import CatalogItemSerializer
from apps.users.permissions import IsAdminOrReadOnly


class CatalogViewSet(viewsets.ModelViewSet):
    serializer_class = CatalogItemSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = CatalogItem.objects.filter(is_active=True)
        params = self.request.query_params

        body_part = params.get('body_part')
        product_type = params.get('product_type')
        sub_product_type = params.get('sub_product_type')
        # key_benefit may be sent multiple times: ?key_benefit=Acne&key_benefit=Glow
        key_benefits = params.getlist('key_benefit')
        rate_category = params.get('rate_category')
        q = params.get('q')

        if body_part:
            qs = qs.filter(body_part__iexact=body_part)
        if product_type:
            qs = qs.filter(product_type__iexact=product_type)
        if sub_product_type:
            qs = qs.filter(sub_product_type__iexact=sub_product_type)
        if key_benefits:
            kb_filter = Q()
            for kb in key_benefits:
                kb_filter |= (
                    Q(kb_tag1__iexact=kb) |
                    Q(kb_tag2__iexact=kb) |
                    Q(kb_tag3__iexact=kb)
                )
            qs = qs.filter(kb_filter)
        if rate_category:
            qs = qs.filter(rate_category__iexact=rate_category)
        if q:
            qs = qs.filter(
                Q(body_part__icontains=q) |
                Q(product_type__icontains=q) |
                Q(sub_product_type__icontains=q) |
                Q(kb_tag1__icontains=q) |
                Q(kb_tag2__icontains=q) |
                Q(kb_tag3__icontains=q) |
                Q(specific_ingredients__icontains=q) |
                Q(client_name__icontains=q)
            )
        return qs

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def import_xlsx(self, request):
        """Admin only: upload .xlsx file to bulk-import catalog rows."""
        if request.user.role != 'admin':
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

        from openpyxl import load_workbook
        wb = load_workbook(file_obj, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 2:
            return Response({'detail': 'Sheet is empty'}, status=status.HTTP_400_BAD_REQUEST)

        # Skip first row (group headers like "Key Benefits") if it has fewer values
        # Real header expected at row 2 based on the Skinovation template.
        header_row_idx = 1 if rows[0][0] is None else 0
        header = [str(h).strip() if h is not None else '' for h in rows[header_row_idx]]
        data_rows = rows[header_row_idx + 1:]

        # Replace mode: delete ALL existing catalog rows before importing
        deleted_count, _ = CatalogItem.objects.all().delete()

        # Map header → field name
        column_map = {
            'date': 'date', 'poc': 'poc', 'client name': 'client_name',
            'body part': 'body_part', 'product type': 'product_type',
            'sub product type': 'sub_product_type',
            'kb tag1': 'kb_tag1', 'kb tag2': 'kb_tag2', 'kb tag3': 'kb_tag3',
            'specific ingredients': 'specific_ingredients',
            'color': 'color', 'fragrance': 'fragrance',
            'size': 'size', 'packaging type': 'packaging_type',
            'rate category': 'rate_category',
            'per kg rate': 'per_kg_rate', 'manufacturing cost': 'manufacturing_cost',
            'rate per unit': 'rate_per_unit',
            'tentative packaging cost': 'tentative_packaging_cost',
            'label cost': 'label_cost',
            'tentative monocarton cost': 'tentative_monocarton_cost',
            'total cost': 'total_cost', 'potential mrp': 'potential_mrp',
        }
        decimal_fields = {
            'per_kg_rate', 'manufacturing_cost', 'rate_per_unit',
            'tentative_packaging_cost', 'label_cost',
            'tentative_monocarton_cost', 'total_cost', 'potential_mrp',
        }

        created = 0
        for raw in data_rows:
            if not raw or all(v is None for v in raw):
                continue
            obj = {}
            for i, value in enumerate(raw):
                if i >= len(header):
                    break
                col = header[i].lower().strip()
                field = column_map.get(col)
                if not field:
                    continue
                if value is None:
                    continue
                if field in decimal_fields:
                    try:
                        obj[field] = float(value)
                    except (ValueError, TypeError):
                        continue
                else:
                    obj[field] = str(value).strip()
            if obj:
                CatalogItem.objects.create(**obj)
                created += 1

        return Response({'created': created, 'deleted': deleted_count})


# Lookup endpoint: return list of distinct values for cascading filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated as _IsAuth


@api_view(['GET'])
@permission_classes([_IsAuth])
def catalog_facets(request):
    """Return distinct values per dimension for client-side filtering UI."""
    qs = CatalogItem.objects.filter(is_active=True)
    body_part = request.query_params.get('body_part')
    product_type = request.query_params.get('product_type')

    bp_q = qs
    pt_q = qs.filter(body_part__iexact=body_part) if body_part else qs
    sp_q = pt_q.filter(product_type__iexact=product_type) if product_type else pt_q

    def _distinct(qs, field):
        return sorted({v for v in qs.values_list(field, flat=True) if v})

    return Response({
        'body_parts': _distinct(bp_q, 'body_part'),
        'product_types': _distinct(pt_q, 'product_type'),
        'sub_product_types': _distinct(sp_q, 'sub_product_type'),
        'key_benefits': sorted({
            v for v in (
                list(qs.values_list('kb_tag1', flat=True)) +
                list(qs.values_list('kb_tag2', flat=True)) +
                list(qs.values_list('kb_tag3', flat=True))
            ) if v
        }),
        'rate_categories': _distinct(qs, 'rate_category'),
    })
