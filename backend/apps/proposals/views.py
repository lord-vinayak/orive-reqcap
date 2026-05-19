from datetime import datetime, timezone
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from .models import Proposal, ProposalItem
from .serializers import ProposalSerializer, ProposalItemSerializer
from .xlsx_export import build_proposal_xlsx
from apps.requirements_app.models import Requirement


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_or_create_proposal_for_requirement(request, requirement_id):
    try:
        req = Requirement.objects.get(pk=requirement_id)
    except Requirement.DoesNotExist:
        raise NotFound('Requirement not found')
    proposal, _ = Proposal.objects.get_or_create(
        requirement=req,
        defaults={'created_by': request.user},
    )
    return Response(ProposalSerializer(proposal).data)


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

        filename = f'Proposal_{proposal.requirement.client.name}_{datetime.now().date().isoformat()}.xlsx'
        response = HttpResponse(
            data,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'], url_path='items')
    def add_item(self, request, pk=None):
        proposal = self.get_object()
        catalog_item_id = request.data.get('catalog_item')
        if not catalog_item_id:
            return Response({'detail': 'catalog_item required'}, status=status.HTTP_400_BAD_REQUEST)
        item, created = ProposalItem.objects.get_or_create(
            proposal=proposal,
            catalog_item_id=catalog_item_id,
            defaults={'sort_order': proposal.items.count()},
        )
        return Response(ProposalItemSerializer(item).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_item(request, item_id):
    ProposalItem.objects.filter(pk=item_id).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
