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
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(phone_no__icontains=q) |
                Q(poc__name__icontains=q)
            )
        return qs
