import io

import openpyxl
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PackagingClientRecord
from .serializers import PackagingClientRecordSerializer

TEMPLATE_COLUMNS = [
    'client_name', 'packaging_name', 'size', 'glass_pet', 'moq', 'cost_to_ss',
    'cost_to_client', 'vendor_name', 'poc', 'contact_details', 'poc2', 'cd2',
]


class PackagingClientRecordViewSet(viewsets.ModelViewSet):
    serializer_class = PackagingClientRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PackagingClientRecord.objects.all()
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(
                Q(client_name__icontains=q) | Q(packaging_name__icontains=q) |
                Q(vendor_name__icontains=q) | Q(poc__icontains=q)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admin can delete.'}, status=403)
        return super().destroy(request, *args, **kwargs)

    # ------------------------------------------------------------------
    # GET /api/packaging-clients/upload-template/
    # ------------------------------------------------------------------
    @action(detail=False, methods=['get'], url_path='upload-template')
    def download_template(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Packaging Clients'

        header_font = openpyxl.styles.Font(bold=True)
        header_fill = openpyxl.styles.PatternFill('solid', fgColor='FFF3CD')

        for col_idx, col_name in enumerate(TEMPLATE_COLUMNS, start=1):
            cell = ws.cell(row=1, column=col_idx, value=col_name)
            cell.font = header_font
            cell.fill = header_fill

        widths = [18, 22, 12, 12, 10, 14, 14, 22, 16, 18, 16, 18]
        for col_idx, width in enumerate(widths, start=1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = width

        sample = {
            'client_name': 'Vedanshi',
            'packaging_name': 'PP Airless Bottle',
            'size': '50ml',
            'glass_pet': 'Pet',
            'moq': '1100',
            'cost_to_ss': '29rs',
            'cost_to_client': '35rs',
            'vendor_name': 'Indian Harness',
            'poc': 'Anjali',
            'contact_details': '99109 16449',
            'poc2': 'Radhika',
            'cd2': '88268 70902',
        }
        for col_idx, col_name in enumerate(TEMPLATE_COLUMNS, start=1):
            ws.cell(row=2, column=col_idx, value=sample[col_name])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        response = HttpResponse(
            buf.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="packaging_clients_template.xlsx"'
        return response

    # ------------------------------------------------------------------
    # POST /api/packaging-clients/bulk-upload/
    # ------------------------------------------------------------------
    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file provided. Send an Excel file as "file".'}, status=400)

        try:
            wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
        except Exception:
            return Response({'detail': 'Could not read the file. Please upload a valid .xlsx file.'}, status=400)

        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return Response({'detail': 'The file is empty.'}, status=400)

        header_row = [str(c).strip().lower() if c is not None else '' for c in rows[0]]

        def col(name):
            try:
                return header_row.index(name)
            except ValueError:
                return None

        idx = {name: col(name) for name in TEMPLATE_COLUMNS}

        def cell(row_data, name):
            i = idx[name]
            if i is None or i >= len(row_data):
                return None
            v = row_data[i]
            return str(v).strip() if v is not None else None

        created = []
        to_create = []

        for row_num, row_data in enumerate(rows[1:], start=2):
            if all(v is None or str(v).strip() == '' for v in row_data):
                continue

            to_create.append(PackagingClientRecord(
                client_name=cell(row_data, 'client_name') or '',
                packaging_name=cell(row_data, 'packaging_name') or '',
                size=cell(row_data, 'size') or '',
                glass_pet=cell(row_data, 'glass_pet') or '',
                moq=cell(row_data, 'moq') or '',
                cost_to_ss=cell(row_data, 'cost_to_ss') or '',
                cost_to_client=cell(row_data, 'cost_to_client') or '',
                vendor_name=cell(row_data, 'vendor_name') or '',
                poc=cell(row_data, 'poc') or '',
                contact_details=cell(row_data, 'contact_details') or '',
                poc2=cell(row_data, 'poc2') or '',
                cd2=cell(row_data, 'cd2') or '',
                created_by=request.user,
            ))
            created.append({'row': row_num, 'client_name': cell(row_data, 'client_name') or '—'})

        PackagingClientRecord.objects.bulk_create(to_create)
        wb.close()
        return Response({'created': created, 'skipped': []}, status=200)
