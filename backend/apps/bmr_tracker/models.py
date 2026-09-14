import uuid

from django.db import models
from django.conf import settings


class BMRTrackerRecord(models.Model):
    """Standalone Batch Manufacturing Record log row — no FK to Requirement/Proposal/CRMProject. No field is mandatory."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(null=True, blank=True)
    client_name = models.TextField(blank=True, default='')
    product = models.TextField(blank=True, default='')
    batch_no = models.TextField(blank=True, default='', verbose_name='Batch No')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='bmr_tracker_records_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client_name']),
            models.Index(fields=['batch_no']),
        ]

    def __str__(self):
        return f'{self.client_name} | {self.batch_no}'


class BMRTrackerFile(models.Model):
    """A BMR attachment for a batch record row (stored on Google Drive)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bmr_tracker_record = models.ForeignKey(
        BMRTrackerRecord, on_delete=models.CASCADE, related_name='files',
    )
    drive_file_id = models.CharField(max_length=255)
    drive_url = models.URLField()
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='bmr_tracker_files_uploaded',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.filename
