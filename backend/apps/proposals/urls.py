from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ProposalViewSet,
    get_or_create_proposal_for_requirement,
    list_proposals_for_requirement,
    create_new_proposal,
    remove_item,
)

router = DefaultRouter()
router.register(r'proposals', ProposalViewSet, basename='proposal')

urlpatterns = router.urls + [
    # Single proposal for a requirement (get latest or create)
    path('requirements/<uuid:requirement_id>/proposal/', get_or_create_proposal_for_requirement),
    # All proposals for a requirement
    path('requirements/<uuid:requirement_id>/proposals/', list_proposals_for_requirement),
    # Create a new blank proposal alongside existing ones
    path('requirements/<uuid:requirement_id>/proposals/new/', create_new_proposal),
    # Remove a single proposal item
    path('proposal-items/<uuid:item_id>/', remove_item),
]
