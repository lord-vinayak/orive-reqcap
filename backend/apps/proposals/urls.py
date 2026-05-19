from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ProposalViewSet,
    get_or_create_proposal_for_requirement,
    remove_item,
)

router = DefaultRouter()
router.register(r'proposals', ProposalViewSet, basename='proposal')

urlpatterns = router.urls + [
    path('requirements/<uuid:requirement_id>/proposal/', get_or_create_proposal_for_requirement),
    path('proposal-items/<uuid:item_id>/', remove_item),
]
