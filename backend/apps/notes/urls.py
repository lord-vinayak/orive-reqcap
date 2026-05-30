from django.urls import path
from .views import RequirementNotesView, note_detail

urlpatterns = [
    path('requirements/<uuid:requirement_id>/notes/',
         RequirementNotesView.as_view({'get': 'list', 'post': 'create'})),
    path('notes/<uuid:pk>/', note_detail),
]
