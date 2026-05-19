from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import Note
from .serializers import NoteSerializer


class RequirementNotesView(viewsets.ViewSet):
    """GET (list) and POST (add) notes for a specific requirement."""
    permission_classes = [IsAuthenticated]

    def list(self, request, requirement_id=None):
        notes = Note.objects.filter(requirement_id=requirement_id).select_related('added_by')
        return Response(NoteSerializer(notes, many=True).data)

    def create(self, request, requirement_id=None):
        ser = NoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        note = ser.save(requirement_id=requirement_id, added_by=request.user)
        return Response(NoteSerializer(note).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_note(request, pk):
    """Admin only: delete a single note."""
    if request.user.role != 'admin':
        raise PermissionDenied('Only admins can delete notes.')
    Note.objects.filter(pk=pk).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
