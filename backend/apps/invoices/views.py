from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from .models import Invoice
from .serializers import InvoiceSerializer
from .pdf_export import build_invoice_pdf


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invoice = serializer.save(created_by=request.user)

        # Generate PDF
        try:
            pdf_bytes = build_invoice_pdf(invoice)
        except Exception as exc:
            invoice.delete()
            return Response({'detail': f'PDF generation failed: {exc}'}, status=500)

        # Upload to Google Drive
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

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
