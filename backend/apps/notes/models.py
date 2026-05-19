import uuid
from django.db import models
from django.conf import settings


class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requirement = models.ForeignKey(
        'requirements_app.Requirement',
        on_delete=models.CASCADE,
        related_name='notes',
    )
    text = models.TextField()
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='notes_added',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']  # oldest first (append-only)

    def __str__(self):
        return f'Note by {self.added_by_id} at {self.created_at}'
