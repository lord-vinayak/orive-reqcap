import uuid
from django.db import models
from django.conf import settings


class ProposalDocument(models.Model):
    """A PDF or Word document uploaded by salespeople against a requirement.

    Distinct from FileRecord (general attachments) and from the Client Costing XLSX.
    Multiple versions are allowed — uploads always append, never replace.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requirement = models.ForeignKey(
        'requirements_app.Requirement',
        on_delete=models.CASCADE, related_name='proposal_documents',
    )
    drive_file_id = models.CharField(max_length=255)
    drive_url = models.URLField()
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='proposal_docs_uploaded',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.filename


class FileRecord(models.Model):
    FILE_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('document', 'Document'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requirement = models.ForeignKey(
        'requirements_app.Requirement',
        on_delete=models.CASCADE, related_name='files',
    )
    product = models.ForeignKey(
        'requirements_app.RequirementProduct',
        on_delete=models.CASCADE, related_name='files',
        null=True, blank=True,
    )
    drive_file_id = models.CharField(max_length=255)
    drive_url = models.URLField()
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES, default='document')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='files_uploaded',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.filename
