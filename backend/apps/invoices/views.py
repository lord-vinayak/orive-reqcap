from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status

from .models import Invoice, BillingInfo
from .serializers import InvoiceSerializer, BillingInfoSerializer
from .pdf_export import build_invoice_pdf


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

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
