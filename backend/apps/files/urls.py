from django.urls import path
from .views import RequirementFilesView, delete_file_view

urlpatterns = [
    path('requirements/<uuid:requirement_id>/files/',
         RequirementFilesView.as_view({'get': 'list', 'post': 'create'})),
    path('files/<uuid:pk>/', delete_file_view),
]
