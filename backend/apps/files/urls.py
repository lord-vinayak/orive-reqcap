from django.urls import path
from .views import RequirementFilesView, delete_file_view, ProposalDocumentsView

urlpatterns = [
    path('requirements/<uuid:requirement_id>/files/',
         RequirementFilesView.as_view({'get': 'list', 'post': 'create'})),
    path('files/<uuid:pk>/', delete_file_view),
    path('requirements/<uuid:requirement_id>/proposal-documents/', ProposalDocumentsView.as_view()),
]
