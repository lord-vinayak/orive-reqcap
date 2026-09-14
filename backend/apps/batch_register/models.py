import uuid
from django.db import models
from django.conf import settings


class BatchRecord(models.Model):
    """Standalone production batch log row — no FK to Requirement/Proposal/CRMProject."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client_name = models.CharField(max_length=200)
    brand_name = models.CharField(max_length=200, blank=True, default='')
    product_type = models.CharField(max_length=150, blank=True, default='')
    product_name = models.CharField(max_length=200)
    packaging_type = models.CharField(max_length=150, blank=True, default='')
    pack_size = models.CharField(max_length=50, blank=True, default='')
    moq = models.PositiveIntegerField(null=True, blank=True, verbose_name='Order Quantity / MOQ (units)')
    batch_number = models.CharField(max_length=100)
    document_no = models.CharField(max_length=100, blank=True, default='', verbose_name='Document No')
    ctri_no = models.CharField(max_length=100, blank=True, default='', verbose_name='CTRI No')
    manufacturing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='batch_records_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client_name']),
            models.Index(fields=['batch_number']),
        ]

    def __str__(self):
        return f'{self.client_name} | {self.product_name} | {self.batch_number}'


class BatchRecordFile(models.Model):
    """An image or document attached to a batch record (stored on Google Drive)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch_record = models.ForeignKey(
        BatchRecord, on_delete=models.CASCADE, related_name='files',
    )
    drive_file_id = models.CharField(max_length=255)
    drive_url = models.URLField()
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='batch_record_files_uploaded',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.filename
