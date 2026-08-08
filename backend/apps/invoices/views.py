from datetime import date as date_cls

from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status

from .models import Invoice, BillingInfo
from .serializers import InvoiceSerializer, BillingInfoSerializer
from .pdf_export import build_invoice_pdf

# Type prefix for invoice numbers — see next_number().
TYPE_PREFIXES = {
    'product_batch':  'ADV',
    'product_simple': 'SAM',
    'printing':       'PP',
    'final':          'FIN',
}


def _fy_number(invoice_type, for_date):
    """'{PREFIX}/{FY_START_YEAR}/{seq:04d}' — FY runs Apr 1 to Mar 31, sequence
    is a count of existing invoices of that type in the same FY (+1)."""
    fy_year = for_date.year if for_date.month >= 4 else for_date.year - 1
    fy_start = date_cls(fy_year, 4, 1)
    fy_end = date_cls(fy_year + 1, 3, 31)
    count = Invoice.objects.filter(invoice_type=invoice_type, date__gte=fy_start, date__lte=fy_end).count()
    return f'{TYPE_PREFIXES[invoice_type]}/{fy_year}/{count + 1:04d}'


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    @action(detail=False, methods=['get'], url_path='next-number')
    def next_number(self, request):
        """Suggests the next FY-sequential invoice number for a type/date. Just a
        suggestion — invoice_number stays a free-text, user-editable field."""
        invoice_type = request.query_params.get('invoice_type')
        if invoice_type not in TYPE_PREFIXES:
            return Response({'detail': 'invalid invoice_type'}, status=400)
        try:
            for_date = date_cls.fromisoformat(request.query_params.get('date', '')) if request.query_params.get('date') else date_cls.today()
        except ValueError:
            return Response({'detail': 'invalid date'}, status=400)
        return Response({'invoice_number': _fy_number(invoice_type, for_date)})

    @action(detail=False, methods=['post'])
    def preview(self, request):
        """Render the PDF without saving anything (no DB row, no Drive upload)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = Invoice(**serializer.validated_data)

        try:
            pdf_bytes = build_invoice_pdf(invoice)
        except Exception as exc:
            return Response({'detail': f'PDF generation failed: {exc}'}, status=500)

        return HttpResponse(pdf_bytes, content_type='application/pdf')

    def get_queryset(self):
        qs = Invoice.objects.select_related('project', 'created_by')
        project = self.request.query_params.get('project')
        client_phone = self.request.query_params.get('client_phone')
        if project:
            qs = qs.filter(project_id=project)
        if client_phone:
            qs = qs.filter(project__client_id=client_phone)
        return qs

    def _generate_and_upload(self, invoice):
        """Build the PDF and upload it to Drive. Returns an error detail string, or None on success."""
        try:
            pdf_bytes = build_invoice_pdf(invoice)
        except Exception as exc:
            return f'PDF generation failed: {exc}'

        try:
            from apps.files.drive_service import upload_file
            client_name = invoice.project.client.name
            filename = f'{invoice.invoice_number}.pdf'
            result = upload_file(pdf_bytes, filename, 'application/pdf', client_name, subfolder='Invoices')
            invoice.drive_file_id = result['drive_file_id']
            invoice.drive_url = result['drive_url']
            invoice.save(update_fields=['drive_file_id', 'drive_url'])
        except Exception:
            pass  # ponytail: non-fatal, same pattern as xlsx_export
        return None

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invoice = serializer.save(created_by=request.user)

        if invoice.status == 'draft':
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

        error = self._generate_and_upload(invoice)
        if error:
            invoice.delete()
            return Response({'detail': error}, status=500)

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        invoice = self.get_object()
        if invoice.status != 'draft':
            raise PermissionDenied('Only draft invoices can be edited.')

        serializer = self.get_serializer(invoice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()

        if invoice.status == 'final':
            error = self._generate_and_upload(invoice)
            if error:
                invoice.status = 'draft'
                invoice.save(update_fields=['status'])
                return Response({'detail': error}, status=500)

        return Response(InvoiceSerializer(invoice).data)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            raise PermissionDenied('Only admins can delete invoices.')
        return super().destroy(request, *args, **kwargs)


class BillingInfoViewSet(viewsets.ModelViewSet):
    serializer_class = BillingInfoSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = BillingInfo.objects.select_related('project')
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
