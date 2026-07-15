import io
import os
from datetime import datetime, timezone
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

# Static file bundled into every Client Costing email
_STATIC_FILES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'files')

from .models import Proposal, ProposalItem, SentEmail
from .serializers import ProposalSerializer, ProposalItemSerializer
from .xlsx_export import build_proposal_xlsx
from . import email_templates
from apps.requirements_app.models import Requirement
from apps.files.models import ProposalDocument
from apps.files.drive_service import upload_file as drive_upload_file, download_file as drive_download_file

XLSX_MIMETYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_or_create_proposal_for_requirement(request, requirement_id):
    """Get the most recent Client Costing for a requirement, or create one if none exist."""
    try:
        req = Requirement.objects.get(pk=requirement_id)
    except Requirement.DoesNotExist:
        raise NotFound('Requirement not found')
    try:
        proposal = Proposal.objects.filter(requirement=req).latest('created_at')
    except Proposal.DoesNotExist:
        proposal = Proposal.objects.create(requirement=req, created_by=request.user)
    return Response(ProposalSerializer(proposal).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_proposals_for_requirement(request, requirement_id):
    """List ALL Client Costings for a requirement, newest first."""
    try:
        req = Requirement.objects.get(pk=requirement_id)
    except Requirement.DoesNotExist:
        raise NotFound('Requirement not found')
    proposals = Proposal.objects.filter(requirement=req).prefetch_related(
        'items__catalog_item'
    ).order_by('-created_at')
    return Response(ProposalSerializer(proposals, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_new_proposal(request, requirement_id):
    """Create a fresh blank Client Costing for a requirement (alongside existing ones)."""
    try:
        req = Requirement.objects.get(pk=requirement_id)
    except Requirement.DoesNotExist:
        raise NotFound('Requirement not found')
    proposal = Proposal.objects.create(requirement=req, created_by=request.user)
    return Response(ProposalSerializer(proposal).data, status=status.HTTP_201_CREATED)


class ProposalViewSet(viewsets.ModelViewSet):
    queryset = Proposal.objects.prefetch_related('items__catalog_item').select_related('requirement', 'created_by')
    serializer_class = ProposalSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'], url_path='export')
    def export(self, request, pk=None):
        proposal = self.get_object()
        data = build_proposal_xlsx(proposal)
        proposal.status = 'exported'
        proposal.last_exported_at = datetime.now(timezone.utc)
        proposal.save(update_fields=['status', 'last_exported_at'])

        client_name = proposal.requirement.client.name
        client_name_safe = ''.join(c for c in client_name if c.isalnum() or c in ' _-').strip()
        filename = f'{client_name_safe} Costing.xlsx'

        # Silently archive a copy to Drive — never fail the download if Drive is unavailable
        try:
            drive_upload_file(data, filename, XLSX_MIMETYPE, client_name, subfolder='Client Costings')
        except Exception:
            pass

        response = HttpResponse(data, content_type=XLSX_MIMETYPE)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'], url_path='preview-email')
    def preview_email(self, request, pk=None):
        """Render subject + HTML body without sending anything or logging."""
        proposal = self.get_object()
        client = proposal.requirement.client

        proposal_index = (
            Proposal.objects.filter(requirement=proposal.requirement)
            .order_by('created_at')
            .values_list('id', flat=True)
        )
        proposal_number = list(proposal_index).index(proposal.id) + 1
        ctx = {
            'client_name': client.name,
            'sent_by_name': request.user.name if hasattr(request.user, 'name') else request.user.email,
            'proposal_item_count': proposal.items.count(),
            'proposal_label': f'Client Costing #{proposal_number}',
        }
        return Response({
            'subject': email_templates.SUBJECT,
            'html_body': email_templates.HTML_BODY.format(**ctx),
        })

    @action(detail=True, methods=['post'], url_path='send-email')
    def send_email(self, request, pk=None):
        """Send the Client Costing as an XLSX attachment to the client's email."""
        proposal = self.get_object()
        client = proposal.requirement.client

        to_email = (request.data.get('to_email') or '').strip()
        save_email = bool(request.data.get('save_email', False))

        # Validate recipient email
        if not to_email:
            return Response({'detail': 'to_email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_email(to_email)
        except DjangoValidationError:
            return Response({'detail': 'Invalid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        # Persist email on client record if requested
        if save_email and not client.email:
            client.email = to_email
            client.save(update_fields=['email'])

        # Build template context
        proposal_index = (
            Proposal.objects.filter(requirement=proposal.requirement)
            .order_by('created_at')
            .values_list('id', flat=True)
        )
        proposal_number = list(proposal_index).index(proposal.id) + 1
        ctx = {
            'client_name': client.name,
            'sent_by_name': request.user.name if hasattr(request.user, 'name') else request.user.email,
            'proposal_item_count': proposal.items.count(),
            'proposal_label': f'Client Costing #{proposal_number}',
        }
        subject = email_templates.SUBJECT
        html_body = email_templates.HTML_BODY.format(**ctx)
        text_body = email_templates.TEXT_BODY.format(**ctx)

        # Generate XLSX in memory (reuse existing export logic)
        xlsx_data = build_proposal_xlsx(proposal)
        client_name_clean = ''.join(c for c in client.name if c.isalnum() or c in ' _-').strip()
        attachment_name = f'{client_name_clean} Costing.xlsx'

        # Silently archive XLSX to Drive
        try:
            drive_upload_file(xlsx_data, attachment_name, XLSX_MIMETYPE, client.name, subfolder='Client Costings')
        except Exception:
            pass

        # Build and send email
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            to=[to_email],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.attach(
            attachment_name,
            xlsx_data if isinstance(xlsx_data, bytes) else xlsx_data.getvalue(),
            XLSX_MIMETYPE,
        )

        # Auto-attach the static Fragrance Notes spreadsheet
        _fragrance_path = os.path.join(_STATIC_FILES_DIR, 'Fragrance Notes.xlsx')
        try:
            with open(_fragrance_path, 'rb') as _f:
                msg.attach('Fragrance Notes.xlsx', _f.read(), XLSX_MIMETYPE)
        except Exception:
            pass  # Missing file is non-fatal

        # Attach selected proposal documents
        proposal_doc_ids = request.data.get('proposal_doc_ids') or []
        if isinstance(proposal_doc_ids, str):
            proposal_doc_ids = [proposal_doc_ids]
        for doc_id in proposal_doc_ids:
            try:
                doc = ProposalDocument.objects.get(pk=doc_id)
                doc_bytes = drive_download_file(doc.drive_file_id)
                # Determine MIME type from filename extension
                ext = doc.filename.rsplit('.', 1)[-1].lower() if '.' in doc.filename else ''
                mime_map = {
                    'pdf': 'application/pdf',
                    'doc': 'application/msword',
                    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                }
                doc_mime = mime_map.get(ext, 'application/octet-stream')
                msg.attach(doc.filename, doc_bytes, doc_mime)
            except Exception:
                pass  # skip individual attachment failures silently

        try:
            msg.send()
        except Exception as e:
            return Response(
                {'detail': f'Failed to send email. The mail server could not be reached or rejected the connection: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Record the send in the audit log
        sent = SentEmail.objects.create(
            proposal=proposal,
            sent_to=to_email,
            subject=subject,
            sent_by=request.user,
        )

        return Response({
            'sent_at': sent.sent_at.isoformat(),
            'sent_to': sent.sent_to,
            'subject': sent.subject,
            'sent_by_name': ctx['sent_by_name'],
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='items')
    def add_item(self, request, pk=None):
        """Add a costing item. Either catalog-linked (catalog_item id) or freeform (snapshot dict)."""
        proposal = self.get_object()
        data = dict(request.data)
        # Stamp the proposal FK so the serializer's create() can use it.
        data['proposal'] = str(proposal.id)
        catalog_item_id = data.get('catalog_item')
        snapshot = data.get('snapshot')

        if not catalog_item_id and not snapshot:
            return Response(
                {'detail': 'Provide either catalog_item or snapshot.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data.setdefault('sort_order', proposal.items.count())
        ser = ProposalItemSerializer(data=data)
        ser.is_valid(raise_exception=True)
        item = ser.save()
        return Response(ProposalItemSerializer(item).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def item_detail(request, item_id):
    """PATCH merges fields into the snapshot; DELETE removes the item."""
    try:
        item = ProposalItem.objects.get(pk=item_id)
    except ProposalItem.DoesNotExist:
        raise NotFound('Item not found')

    if request.method == 'PATCH':
        ser = ProposalItemSerializer(item, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    item.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# Back-compat alias for the old import name in urls.py
remove_item = item_detail
