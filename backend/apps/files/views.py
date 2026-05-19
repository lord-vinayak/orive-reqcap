from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound

from .models import FileRecord
from .serializers import FileSerializer
from .drive_service import upload_file, delete_file
from apps.requirements_app.models import Requirement


def _classify(mimetype):
    if not mimetype:
        return 'document'
    if mimetype.startswith('image/'):
        return 'image'
    if mimetype.startswith('video/'):
        return 'video'
    return 'document'


class RequirementFilesView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def list(self, request, requirement_id=None):
        files = FileRecord.objects.filter(requirement_id=requirement_id).select_related('uploaded_by')
        return Response(FileSerializer(files, many=True).data)

    def create(self, request, requirement_id=None):
        try:
            req = Requirement.objects.select_related('client').get(pk=requirement_id)
        except Requirement.DoesNotExist:
            raise NotFound('Requirement not found')

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

        product_id = request.data.get('product_id') or None

        try:
            result = upload_file(
                file_bytes=file_obj.read(),
                filename=file_obj.name,
                mimetype=file_obj.content_type or 'application/octet-stream',
                client_name=req.client.name,
            )
        except Exception as e:
            return Response({'detail': f'Drive upload failed: {e}'}, status=status.HTTP_502_BAD_GATEWAY)

        record = FileRecord.objects.create(
            requirement=req,
            product_id=product_id,
            drive_file_id=result['drive_file_id'],
            drive_url=result['drive_url'],
            filename=file_obj.name,
            file_type=_classify(file_obj.content_type),
            uploaded_by=request.user,
        )
        return Response(FileSerializer(record).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_file_view(request, pk):
    if request.user.role != 'admin':
        raise PermissionDenied('Only admins can delete files.')
    try:
        record = FileRecord.objects.get(pk=pk)
    except FileRecord.DoesNotExist:
        raise NotFound()
    delete_file(record.drive_file_id)
    record.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
