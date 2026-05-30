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

        filename = f'ClientCosting_{proposal.requirement.client.name}_{datetime.now().date().isoformat()}.xlsx'
        response = HttpResponse(
            data,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

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
