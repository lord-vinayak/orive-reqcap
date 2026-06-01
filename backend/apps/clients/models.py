from django.db import models
from django.conf import settings


class Client(models.Model):
    """Client identified by phone number (the cross-system primary key)."""
    phone_no = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    gst_details = models.CharField(max_length=50, blank=True, default='')
    physical_address = models.TextField(blank=True, default='')
    poc = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='clients_as_poc',
    )

    STATUS_CHOICES = [
        ('call_back', 'Call Back'),
        ('catalogue_shared', 'Catalogue Shared'),
        ('costing_shared', 'Costing Shared'),
        ('interested', 'Interested'),
        ('language_barrier', 'Language Barrier'),
        ('not_interested', 'Not Interested'),
        ('not_responding', 'Not Responding after Multiple Attempts'),
        ('unanswered', 'Unanswered'),
    ]
    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default='unanswered', blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f'{self.name} ({self.phone_no})'
