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
    no_of_products = models.IntegerField(null=True, blank=True)
    planned_selling_price_range = models.CharField(max_length=100, blank=True, default='')
    how_many_units_per_product = models.IntegerField(null=True, blank=True)
    poc = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='clients_as_poc',
    )

    LEAD_STATUS_CHOICES = [
        ('initial_conversation',           'Initial Conversation'),
        ('proposal',                       'Proposal'),
        ('costing',                        'Costing'),
        ('sample',                         'Sample'),
        ('order',                          'Order'),
        ('production',                     'Production'),
        ('testing',                        'Testing'),
        ('filling',                        'Filling'),
        ('order_dispatch',                 'Order Dispatch'),
        ('order_closed',                   'Order Closed'),
        ('lead_closed',                    'Lead Closed'),
    ]

    LEAD_SUB_STATUS_CHOICES = [
        # Initial Conversation
        ('initial_conversation__product_requirement_captured', 'Product Requirement Captured'),
        # Proposal
        ('proposal__requested',            'Requested'),
        ('proposal__send',                 'Send'),
        ('proposal__approved',             'Approved'),
        # Costing
        ('costing__requested',             'Requested'),
        ('costing__send',                  'Send'),
        ('costing__approved',              'Approved'),
        # Sample
        ('sample__invoice_shared',         'Invoice Shared'),
        ('sample__sample_booked',          'Sample Booked'),
        ('sample__approval_email_sent',    'Sample Approval Email Sent'),
        ('sample__formula_created',        'Formula Created'),
        ('sample__formula_approved',       'Formula Approved'),
        ('sample__in_pipeline',            'Sample in Pipeline'),
        ('sample__sample_made',            'Sample Made'),
        ('sample__in_transit',             'In Transit'),
        ('sample__user_testing',           'User Testing'),
        ('sample__approved',               'Approved'),
        ('sample__not_approved',           'Not Approved'),
        ('sample__resample',               'Resample'),
        # Order
        ('order__invoice_shared',          'Invoice Shared'),
        ('order__order_booked',            'Order Booked'),
        # Production
        ('production__packaging',          'Packaging'),
        ('production__content',            'Content'),
        ('production__design',             'Design'),
        ('production__printing',           'Printing'),
        # Testing
        ('testing__batch',                 'Batch'),
        ('testing__derma',                 'Derma'),
        # Filling
        ('filling__filling',               'Filling'),
        ('filling__logistics_acquired',    'Logistics Details Acquired'),
        # Order Dispatch
        ('order_dispatch__invoice_shared', 'Final Invoice Shared'),
        ('order_dispatch__payment_made',   'Final Payment Made'),
        ('order_dispatch__eway_bill',      'EWAY Bill Created'),
        ('order_dispatch__shipment_booked','Shipment Booked'),
        ('order_dispatch__in_transit',     'Shipment in Transit'),
        ('order_dispatch__delivered',      'Shipment Delivered'),
        # Order Closed
        ('order_closed__feedback_captured','Feedback Captured'),
        # Lead Closed
        ('lead_closed__not_responding',    'Not Responding'),
        ('lead_closed__language_issue',    'Language Issue'),
        ('lead_closed__not_reachable',     'Not Reachable'),
        ('lead_closed__costing_high',      'Costing High'),
        ('lead_closed__others',            'Others'),
        ('lead_closed__on_hold',           'On Hold'),
    ]

    # Valid sub-statuses per main status — used for validation
    VALID_SUB_STATUSES: dict = {
        'initial_conversation': ['initial_conversation__product_requirement_captured'],
        'proposal':      ['proposal__requested', 'proposal__send', 'proposal__approved'],
        'costing':       ['costing__requested', 'costing__send', 'costing__approved'],
        'sample':        ['sample__invoice_shared', 'sample__sample_booked', 'sample__approval_email_sent',
                          'sample__formula_created', 'sample__formula_approved', 'sample__in_pipeline',
                          'sample__sample_made', 'sample__in_transit', 'sample__user_testing',
                          'sample__approved', 'sample__not_approved', 'sample__resample'],
        'order':         ['order__invoice_shared', 'order__order_booked'],
        'production':    ['production__packaging', 'production__content', 'production__design', 'production__printing'],
        'testing':       ['testing__batch', 'testing__derma'],
        'filling':       ['filling__filling', 'filling__logistics_acquired'],
        'order_dispatch':['order_dispatch__invoice_shared', 'order_dispatch__payment_made',
                          'order_dispatch__eway_bill', 'order_dispatch__shipment_booked',
                          'order_dispatch__in_transit', 'order_dispatch__delivered'],
        'order_closed':  ['order_closed__feedback_captured'],
        'lead_closed':   ['lead_closed__not_responding', 'lead_closed__language_issue',
                          'lead_closed__not_reachable', 'lead_closed__costing_high',
                          'lead_closed__others', 'lead_closed__on_hold'],
    }

    lead_status = models.CharField(
        max_length=40, choices=LEAD_STATUS_CHOICES,
        default='initial_conversation', blank=True,
    )
    lead_sub_status = models.CharField(max_length=50, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f'{self.name} ({self.phone_no})'
