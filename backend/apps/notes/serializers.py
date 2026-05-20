from rest_framework import serializers
from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    added_by_name = serializers.CharField(source='added_by.name', read_only=True)

    class Meta:
        model = Note
        fields = ['id', 'requirement', 'text', 'added_by', 'added_by_name', 'created_at']
        read_only_fields = ['id', 'requirement', 'added_by', 'created_at']
