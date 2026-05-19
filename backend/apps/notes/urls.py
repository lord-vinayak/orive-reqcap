from django.urls import path
from .views import RequirementNotesView, delete_note

urlpatterns = [
    path('requirements/<uuid:requirement_id>/notes/',
         RequirementNotesView.as_view({'get': 'list', 'post': 'create'})),
    path('notes/<uuid:pk>/', delete_note),
]
