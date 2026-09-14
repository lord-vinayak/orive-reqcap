import uuid

from django.db import models
from django.conf import settings


class SampleTrackerRecord(models.Model):
    """Standalone sample tracking log row — no FK to Requirement/Proposal/CRMProject. No field is mandatory."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(null=True, blank=True)
    client_name = models.TextField(blank=True, default='')
    product_type = models.TextField(blank=True, default='')
    product_details = models.TextField(blank=True, default='')
    sample_attempt_count = models.PositiveIntegerField(null=True, blank=True, verbose_name='Sample Attempt Count')
    sample_no = models.TextField(blank=True, default='', verbose_name='Sample No')
    sample_approved = models.TextField(blank=True, default='', verbose_name='Sample Approved')
    feedback = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='sample_tracker_records_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client_name']),
            models.Index(fields=['sample_no']),
        ]

    def __str__(self):
        return f'{self.client_name} | {self.sample_no}'


class SampleTrackerFile(models.Model):
    """A sample image or formula document attached to a sample tracker row (stored on Google Drive)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sample_tracker_record = models.ForeignKey(
        SampleTrackerRecord, on_delete=models.CASCADE, related_name='files',
    )
    drive_file_id = models.CharField(max_length=255)
    drive_url = models.URLField()
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='sample_tracker_files_uploaded',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.filename
