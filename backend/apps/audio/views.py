from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .extractor import extract_fields


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_view(request):
    transcript = (request.data or {}).get('transcript', '')
    fields = extract_fields(transcript)
    return Response({'fields': fields})
