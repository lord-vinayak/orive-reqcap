from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'phone_no'

    def get_queryset(self):
        qs = Client.objects.select_related('poc').all()
        params = self.request.query_params

        # Free-text search by name or phone
        q = params.get('q')
        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(phone_no__icontains=q)
            )

        # Filter by POC user ID
        poc_id = params.get('poc')
        if poc_id:
            qs = qs.filter(poc__id=poc_id)

        return qs
