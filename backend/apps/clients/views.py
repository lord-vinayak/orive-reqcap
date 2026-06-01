import io
import re

import openpyxl
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Client
from .serializers import ClientSerializer

# ---------------------------------------------------------------------------
# Shared status helpers
# ---------------------------------------------------------------------------

# Map Excel-friendly display labels → DB keys (case-insensitive lookup)
_STATUS_LABEL_TO_KEY = {label.lower(): key for key, label in Client.STATUS_CHOICES}

TEMPLATE_COLUMNS = [
    'full_name',
    'phone_number',
    'email',
    'company_name',
    'city',
    'status',
]

STATUS_HINT = (
    'Allowed values: Call Back | Catalogue Shared | Costing Shared | Interested | '
    'Language Barrier | Not Interested | Not Responding after Multiple Attempts | Unanswered'
)

PHONE_RE = re.compile(r'\d{10}$')


def _parse_phone(raw) -> str | None:
    """Extract trailing 10-digit Indian mobile from any common format."""
    if raw is None:
        return None
    cleaned = re.sub(r'[^\d]', '', str(raw))
    if len(cleaned) >= 10:
        return cleaned[-10:]
    return None


def _parse_status(raw) -> str:
    """Convert a display label (or key) to a DB key; fall back to 'unanswered'."""
    if not raw:
        return 'unanswered'
    raw_lower = str(raw).strip().lower()
    # Try direct key match first
    if raw_lower in dict(Client.STATUS_CHOICES):
        return raw_lower
    # Try display-label match
    return _STATUS_LABEL_TO_KEY.get(raw_lower, 'unanswered')


# ---------------------------------------------------------------------------
# ViewSet
# ---------------------------------------------------------------------------

class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'phone_no'

    def get_queryset(self):
        qs = Client.objects.select_related('poc').all()
        params = self.request.query_params

        q = params.get('q')
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(phone_no__icontains=q))

        poc_id = params.get('poc')
        if poc_id:
            qs = qs.filter(poc__id=poc_id)

        return qs

    # ------------------------------------------------------------------
    # GET /api/clients/upload-template/
    # ------------------------------------------------------------------
    @action(detail=False, methods=['get'], url_path='upload-template')
    def download_template(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Client Upload'

        header_font = openpyxl.styles.Font(bold=True)
        header_fill = openpyxl.styles.PatternFill('solid', fgColor='FFF3CD')

        # Header row
        for col_idx, col_name in enumerate(TEMPLATE_COLUMNS, start=1):
            cell = ws.cell(row=1, column=col_idx, value=col_name)
            cell.font = header_font
            cell.fill = header_fill

        # Column widths
        widths = [25, 20, 30, 25, 15, 45]
        for col_idx, width in enumerate(widths, start=1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = width

        # Status hint in row 2 of the status column
        ws.cell(row=2, column=6, value=STATUS_HINT)
        ws.cell(row=2, column=6).font = openpyxl.styles.Font(italic=True, color='888888')

        # One example row
        ws.cell(row=3, column=1, value='John Doe')
        ws.cell(row=3, column=2, value='p:+919876543210')
        ws.cell(row=3, column=3, value='john@example.com')
        ws.cell(row=3, column=4, value='Acme Corp')
        ws.cell(row=3, column=5, value='Mumbai')
        ws.cell(row=3, column=6, value='Unanswered')

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        response = HttpResponse(
            buf.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="client_upload_template.xlsx"'
        return response

    # ------------------------------------------------------------------
    # POST /api/clients/bulk-upload/
    # ------------------------------------------------------------------
    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file provided. Send an Excel file as "file".'}, status=400)

        # Load workbook
        try:
            wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
        except Exception:
            return Response({'detail': 'Could not read the file. Please upload a valid .xlsx file.'}, status=400)

        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return Response({'detail': 'The file is empty.'}, status=400)

        # Detect header row — find column indices
        header_row = [str(c).strip().lower() if c is not None else '' for c in rows[0]]

        def col(name):
            try:
                return header_row.index(name)
            except ValueError:
                return None

        idx_name    = col('full_name')
        idx_phone   = col('phone_number')
        idx_email   = col('email')
        idx_company = col('company_name')
        idx_city    = col('city')
        idx_status  = col('status')

        if idx_name is None or idx_phone is None:
            return Response(
                {'detail': 'Required columns "full_name" and "phone_number" not found in the header row.'},
                status=400,
            )

        def cell(row_data, idx):
            if idx is None or idx >= len(row_data):
                return None
            v = row_data[idx]
            return str(v).strip() if v is not None else None

        created = []
        skipped = []

        for row_num, row_data in enumerate(rows[1:], start=2):
            # Skip fully blank rows
            if all(v is None or str(v).strip() == '' for v in row_data):
                continue

            name  = cell(row_data, idx_name)
            phone_raw = cell(row_data, idx_phone)

            # Validate name
            if not name:
                skipped.append({'row': row_num, 'name': '—', 'phone': phone_raw or '—',
                                 'reason': 'Missing full_name'})
                continue

            # Parse phone
            phone = _parse_phone(phone_raw)
            if not phone:
                skipped.append({'row': row_num, 'name': name, 'phone': phone_raw or '—',
                                 'reason': 'Could not extract a 10-digit phone number'})
                continue

            # Check duplicate
            if Client.objects.filter(phone_no=phone).exists():
                skipped.append({'row': row_num, 'name': name, 'phone': phone,
                                 'reason': 'Phone number already exists in the system'})
                continue

            # Validate email (basic check — store anyway but flag)
            email = cell(row_data, idx_email) or ''
            email_warning = None
            if email and not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', email):
                email_warning = f'Invalid email "{email}" stored as-is'
                # We store it but note the warning

            Client.objects.create(
                phone_no=phone,
                name=name,
                email=email,
                company_name=cell(row_data, idx_company) or '',
                city=cell(row_data, idx_city) or '',
                status=_parse_status(cell(row_data, idx_status)),
                poc=request.user,
            )

            entry = {'row': row_num, 'name': name, 'phone': phone}
            if email_warning:
                entry['warning'] = email_warning
            created.append(entry)

        wb.close()
        return Response({'created': created, 'skipped': skipped}, status=200)
