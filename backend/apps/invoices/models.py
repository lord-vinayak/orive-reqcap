import uuid
from datetime import date
from django.db import models
from django.conf import settings


class Invoice(models.Model):
    TYPES = [
        ('service',        'Service Invoice'),
        ('product_batch',  'Advance Invoice'),
        ('product_simple', 'Sample Invoice'),
        ('printing',       'Packaging or Printing Invoice'),
        ('final',          'Final Invoice'),
    ]

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project          = models.ForeignKey(
        'crm_projects.CRMProject', on_delete=models.CASCADE, related_name='invoices'
    )
    invoice_type     = models.CharField(max_length=20, choices=TYPES)
    invoice_number   = models.CharField(max_length=50)
    date             = models.DateField(default=date.today)

    # Bill-to (auto-filled from project/client, user-editable before generate)
    client_name      = models.CharField(max_length=255)
    company_name     = models.CharField(max_length=255, blank=True)
    client_gstin     = models.CharField(max_length=30, blank=True, default='0')
    billing_address  = models.TextField(blank=True, default='0')
    shipping_address = models.TextField(blank=True, default='0')
    eway_bill_no     = models.CharField(max_length=50, blank=True, default='XX')

    # GST rates (stored as %, e.g. 9.00 for 9%)
    sgst_rate        = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cgst_rate        = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    igst_rate        = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Type-specific extras
    shipping_cost     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    advance_rate      = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    dispatch_address  = models.TextField(blank=True, default='')
    advance_received  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Advance invoice only — per-unit charge, multiplied by total qty across Product Details rows
    processing_charge_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Line items as JSON — never queried individually
    items            = models.JSONField(default=list)

    # Google Drive
    drive_file_id    = models.CharField(max_length=255, blank=True)
    drive_url        = models.URLField(blank=True)

    created_by       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='invoices_created'
    )
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['project'])]

    def __str__(self):
        return f'{self.invoice_number} ({self.get_invoice_type_display()})'


class BillingInfo(models.Model):
    """One-time-per-project billing profile — client details, services taken, and
    products to be billed. Generating an invoice pre-fills from this instead of
    asking the user to retype everything each time."""
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project      = models.OneToOneField(
        'crm_projects.CRMProject', on_delete=models.CASCADE, related_name='billing_info'
    )

    client_name      = models.CharField(max_length=255)
    company_name     = models.CharField(max_length=255, blank=True, default='')
    client_gstin     = models.CharField(max_length=30, blank=True, default='')
    billing_address  = models.TextField(blank=True, default='')
    phone_no         = models.CharField(max_length=20, blank=True, default='')
    email            = models.EmailField(blank=True, default='')
    shipping_address = models.TextField(blank=True, default='')

    # [{key, label, price}] — key matches a ServiceBaseRates field name
    services = models.JSONField(default=list, blank=True)
    # [{proposal_item_id, item_name, per_unit_cost}]
    products = models.JSONField(default=list, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='billing_infos_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Billing Info — {self.client_name} ({self.project.project_no})'
