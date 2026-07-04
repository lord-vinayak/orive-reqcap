import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


def _next_vendor_id(model_class, prefix):
    """Generate the next sequential human-readable ID for a vendor/manufacturer."""
    existing = model_class.objects.filter(
        vendor_id__startswith=f'{prefix}-'
    ).values_list('vendor_id', flat=True)
    max_num = 0
    for vid in existing:
        try:
            num = int(vid.split('-')[1])
            if num > max_num:
                max_num = num
        except (IndexError, ValueError):
            pass
    return f'{prefix}-{max_num + 1:03d}'


class AbstractVendor(models.Model):
    """Common fields shared by all external vendor types."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_id = models.CharField(max_length=20, unique=True, blank=True, db_index=True)
    company_name = models.CharField(max_length=255, db_index=True)
    poc_name = models.CharField(max_length=200, blank=True, default='')
    phone_no = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')

    # Static accounting / bank details
    bank_account_no = models.CharField(max_length=50, blank=True, default='')
    bank_ifsc = models.CharField(max_length=20, blank=True, default='')
    bank_name = models.CharField(max_length=200, blank=True, default='')
    pan_no = models.CharField(max_length=20, blank=True, default='')
    gst_no = models.CharField(max_length=20, blank=True, default='')

    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['company_name']

    def __str__(self):
        return self.company_name

    @property
    def average_rating(self):
        ratings = self.ratings.all()
        if not ratings.exists():
            return None
        return round(sum(r.rating for r in ratings) / ratings.count(), 1)


class Manufacturer(AbstractVendor):
    """Manufacturer with compliance certifications."""
    state = models.CharField(max_length=100, blank=True, default='')
    address = models.TextField(blank=True, default='')
    us_fda = models.BooleanField(default=False)
    cosmetic_fda = models.BooleanField(default=False)
    ayush = models.BooleanField(default=False)
    iso = models.BooleanField(default=False)
    gst_certified = models.BooleanField(default=False)
    gmp = models.BooleanField(default=False)
    stability_chamber = models.BooleanField(default=False)

    class Meta(AbstractVendor.Meta):
        verbose_name = 'Manufacturer'
        verbose_name_plural = 'Manufacturers'

    def save(self, *args, **kwargs):
        if not self.vendor_id:
            self.vendor_id = _next_vendor_id(Manufacturer, 'MFR')
        super().save(*args, **kwargs)


class VendorCategory(models.Model):
    """Dynamic vendor categories (replaces hardcoded VENDOR_TYPES on Vendor)."""
    name   = models.CharField(max_length=100, unique=True)  # "Packaging"
    slug   = models.SlugField(max_length=50, unique=True)   # "packaging"
    prefix = models.CharField(max_length=10)                 # "PKG"

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Vendor(AbstractVendor):
    """All non-manufacturer external vendors."""
    vendor_type = models.CharField(max_length=50, db_index=True)

    class Meta(AbstractVendor.Meta):
        verbose_name = 'Vendor'
        verbose_name_plural = 'Vendors'

    def save(self, *args, **kwargs):
        if not self.vendor_id:
            cat = VendorCategory.objects.filter(slug=self.vendor_type).first()
            prefix = cat.prefix if cat else (self.vendor_type[:3].upper() if self.vendor_type else 'VND')
            self.vendor_id = _next_vendor_id(Vendor, prefix)
        super().save(*args, **kwargs)


class InternalTeamMember(models.Model):
    """Formulation and Sales team members."""
    TEAM_CHOICES = [
        ('formulation', 'Formulation Team'),
        ('sales', 'Sales Team'),
        ('ops', 'Ops Team'),
        ('admin', 'Admin'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.CharField(max_length=20, choices=TEAM_CHOICES, db_index=True)
    name = models.CharField(max_length=200, db_index=True)
    email = models.EmailField(blank=True, default='')
    phone_no = models.CharField(max_length=20, blank=True, default='')
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='team_member_profile',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['team', 'name']
        verbose_name = 'Internal Team Member'
        verbose_name_plural = 'Internal Team Members'

    def __str__(self):
        return f'{self.name} ({self.get_team_display()})'


class ManufacturerRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    manufacturer = models.ForeignKey(
        Manufacturer, on_delete=models.CASCADE, related_name='ratings'
    )
    project = models.ForeignKey(
        'crm_projects.CRMProject', on_delete=models.CASCADE,
        related_name='manufacturer_ratings',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True, default='')
    rated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('manufacturer', 'project')]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.manufacturer} — {self.rating}★'


class VendorRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(
        Vendor, on_delete=models.CASCADE, related_name='ratings'
    )
    project = models.ForeignKey(
        'crm_projects.CRMProject', on_delete=models.CASCADE,
        related_name='vendor_ratings',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True, default='')
    rated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('vendor', 'project')]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.vendor} — {self.rating}★'


class VendorProjectPayment(models.Model):
    """Per-project payment record for any vendor type."""
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'crm_projects.CRMProject', on_delete=models.CASCADE,
        related_name='vendor_payments',
    )
    manufacturer = models.ForeignKey(
        Manufacturer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='project_payments',
    )
    vendor = models.ForeignKey(
        Vendor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='project_payments',
    )
    invoice_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateField(null=True, blank=True)
    payment_status = models.CharField(
        max_length=10, choices=PAYMENT_STATUS, default='pending'
    )
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
