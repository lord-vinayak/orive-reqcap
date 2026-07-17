import uuid
from datetime import date, timedelta
from django.db import models, transaction, IntegrityError
from django.conf import settings
from django.core.validators import MinValueValidator

from django.utils import timezone

from .stage_definitions import (
    SAMPLE_PRE_LOOP, RESAMPLE_LOOP_BASE, SAMPLE_POST_APPROVAL,
    ORDER_PHASE_SECTIONS, SAMPLE_TOTAL_STAGES, ORDER_TOTAL_STAGES,
    RAG_RULES, RAG_UNIT, get_loop_key,
)


def _add_weekdays(start: date, days: int) -> date:
    """Add `days` weekdays (Mon–Fri) to start date."""
    current = start
    added = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:
            added += 1
    return current


def compute_stage_rag(base_key: str, cycle: int, completion_map: dict):
    """Live RAG status ('red'/'amber'/'green'/None) for one stage, from its predecessor's
    completion time. Single source of truth — used both per-stage (detail view) and to
    build the project-level aggregate below."""
    rule = RAG_RULES.get(base_key)
    if not rule:
        return None
    actual_key = get_loop_key(base_key, cycle)
    pred_key = get_loop_key(rule['predecessor'], cycle)
    sc = completion_map.get(actual_key)
    if sc and sc.is_complete:
        return None  # completed — no badge
    pred = completion_map.get(pred_key)
    if not pred or not pred.is_complete or not pred.completed_at:
        return None  # predecessor not done — stage not yet active
    if RAG_UNIT == 'minutes':
        elapsed = (timezone.now() - pred.completed_at).total_seconds() / 60
    else:
        elapsed = (timezone.localdate() - timezone.localtime(pred.completed_at).date()).days
    if elapsed >= rule['red']:
        return 'red'
    if elapsed >= rule['amber']:
        return 'amber'
    return 'green'


def project_stage_rag_keys(project) -> dict:
    """Map of 'red'/'amber' -> list of currently active stage keys for this project.

    Replaces the old date-based ProjectMilestone table (never populated since RAG
    moved to live per-stage computation) as the source for project-level delay flags.
    """
    cache = getattr(project, '_prefetched_objects_cache', {})
    rows = cache['stage_completions'] if 'stage_completions' in cache else project.stage_completions.all()
    completion_map = {sc.stage_key: sc for sc in rows}

    result = {'red': [], 'amber': []}
    for c in range(1, project.resample_cycle + 1):
        for s in RESAMPLE_LOOP_BASE:
            rag = compute_stage_rag(s['key'], c, completion_map)
            if rag in result:
                result[rag].append(get_loop_key(s['key'], c))
    for sec in ORDER_PHASE_SECTIONS:
        for s in sec['stages']:
            rag = compute_stage_rag(s['key'], 1, completion_map)
            if rag in result:
                result[rag].append(s['key'])
    return result


PHASE_CHOICES = [('sample', 'Sample Phase'), ('order', 'Order Phase')]


class CRMProject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_no = models.CharField(max_length=30, unique=True, blank=True, db_index=True)
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.PROTECT,
        to_field='phone_no',
        db_column='client_phone',
        related_name='crm_projects',
    )
    no_of_products = models.PositiveIntegerField(null=True, blank=True)
    moq = models.PositiveIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1)],
        verbose_name='MOQ',
    )
    manufacturers = models.ManyToManyField(
        'crm_master_data.Manufacturer', blank=True, related_name='projects',
    )

    # Phase tracking
    phase = models.CharField(
        max_length=10, choices=PHASE_CHOICES, default='sample', db_index=True,
    )
    resample_cycle = models.PositiveSmallIntegerField(default=1)
    sample_rejected = models.BooleanField(default=False)  # client rejected sample, no resample wanted
    order_advance_received = models.BooleanField(default=False)  # kept for old data
    order_booking_steps = models.JSONField(default=dict, blank=True)
    order_booked = models.BooleanField(default=False)

    # Legacy display field — free-form, set to the current active stage key for list views
    project_stage = models.CharField(
        max_length=60, blank=True, default='sample_invoice_shared', db_index=True,
    )

    sales_poc = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crm_projects_as_sales', limit_choices_to={'role': 'poc_sales'},
    )
    formulation_poc = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crm_projects_as_formulation', limit_choices_to={'role': 'poc_formulation'},
    )
    source_requirement = models.ForeignKey(
        'requirements_app.Requirement', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='crm_projects',
    )
    sample_booked_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='crm_projects_created',
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phase', '-created_at']),
            models.Index(fields=['client', '-created_at']),
        ]

    def __str__(self):
        return self.project_no or str(self.id)

    def save(self, *args, **kwargs):
        if not self.project_no:
            today = date.today().strftime('%Y%m%d')
            client_prefix = (self.client.name[:3]).upper()
            base = f'SKI{today}{client_prefix}'
            candidate = base
            counter = 2
            while True:
                self.project_no = candidate
                try:
                    with transaction.atomic():
                        super().save(*args, **kwargs)
                    break
                except IntegrityError:
                    candidate = f'{base}{counter}'
                    counter += 1
        else:
            super().save(*args, **kwargs)

    @property
    def progress_percentage(self) -> int:
        """Percentage of all expected stages completed (sample active cycle + order)."""
        # ponytail: use prefetch cache when available to avoid N+1 in list views
        cache = getattr(self, '_prefetched_objects_cache', {})
        if 'stage_completions' in cache:
            completed_keys = {sc.stage_key for sc in cache['stage_completions'] if sc.is_complete}
        else:
            completed_keys = set(
                self.stage_completions.filter(is_complete=True).values_list('stage_key', flat=True)
            )

        sample_done = sum(1 for s in SAMPLE_PRE_LOOP if s['key'] in completed_keys)
        sample_done += sum(
            1 for s in RESAMPLE_LOOP_BASE
            if get_loop_key(s['key'], self.resample_cycle) in completed_keys
        )
        sample_done += sum(1 for s in SAMPLE_POST_APPROVAL if s['key'] in completed_keys)

        order_done = sum(
            1 for sec in ORDER_PHASE_SECTIONS
            for s in sec['stages']
            if s['key'] in completed_keys
        )

        total = SAMPLE_TOTAL_STAGES + ORDER_TOTAL_STAGES
        return round(((sample_done + order_done) / total) * 100)

    @property
    def delayed_stages(self):
        return project_stage_rag_keys(self)['red']

    @property
    def at_risk_stages(self):
        return project_stage_rag_keys(self)['amber']


class ProjectVendorLink(models.Model):
    """Generic many-to-many between a project and a Vendor (any category)."""
    project = models.ForeignKey(CRMProject, on_delete=models.CASCADE, related_name='vendor_links')
    vendor = models.ForeignKey(
        'crm_master_data.Vendor', on_delete=models.CASCADE, related_name='project_links',
    )

    class Meta:
        unique_together = ('project', 'vendor')


class ResampleNote(models.Model):
    """Records the reason each resample cycle was triggered."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(CRMProject, on_delete=models.CASCADE, related_name='resample_notes')
    cycle_from = models.PositiveSmallIntegerField()  # cycle that was rejected (1 or 2)
    reason = models.TextField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='resample_notes_authored',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['cycle_from']
        unique_together = [('project', 'cycle_from')]


TASK_STATUS_CHOICES = [
    ('not_started', 'Not Started'),
    ('wip', 'WIP'),
    ('pending', 'Pending'),
    ('closed', 'Closed'),
]

PRIORITY_CHOICES = [('high', 'High'), ('medium', 'Medium'), ('low', 'Low')]


class StageCompletion(models.Model):
    """Flat stage completion record. One row per (project, stage_key)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        CRMProject, on_delete=models.CASCADE, related_name='stage_completions'
    )
    stage_key = models.CharField(max_length=50)   # max 50 — longest: sample_feedback_captured_c3 (28)
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    # Task assignment
    assigned_to = models.ForeignKey(
        'crm_master_data.InternalTeamMember',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_stages',
    )
    assigned_at = models.DateTimeField(null=True, blank=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='task_assignments_made',
    )
    task_status = models.CharField(
        max_length=15, choices=TASK_STATUS_CHOICES,
        default='not_started', db_index=True,
    )
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    planned_closure_date = models.DateField(null=True, blank=True)
    actual_closure_date = models.DateField(null=True, blank=True)
    last_updated_at = models.DateTimeField(null=True, blank=True)
    last_updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='stage_tasks_updated',
    )

    class Meta:
        unique_together = [('project', 'stage_key')]
        ordering = ['project', 'stage_key']

    def __str__(self):
        return f'{self.project_id} | {self.stage_key} | {"✓" if self.is_complete else "○"}'


class StandaloneTask(models.Model):
    """Ad-hoc task created directly from the Task Tracker (not tied to a project stage)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    project = models.ForeignKey(
        CRMProject, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='standalone_tasks',
    )
    client = models.ForeignKey(
        'clients.Client', on_delete=models.SET_NULL, null=True, blank=True,
        to_field='phone_no', db_column='client_phone',
        related_name='standalone_tasks',
    )
    assigned_to = models.ForeignKey(
        'crm_master_data.InternalTeamMember', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_standalone_tasks',
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='standalone_tasks_assigned',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    planned_closure_date = models.DateField(null=True, blank=True)
    actual_closure_date = models.DateField(null=True, blank=True)
    task_status = models.CharField(
        max_length=15, choices=TASK_STATUS_CHOICES, default='not_started', db_index=True,
    )
    last_updated_at = models.DateTimeField(auto_now=True)
    last_updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='standalone_tasks_updated',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='standalone_tasks_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} | {self.task_status}'


class TaskComment(models.Model):
    """Comment thread entry for both stage tasks and standalone tasks."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stage_task = models.ForeignKey(
        StageCompletion, on_delete=models.CASCADE,
        null=True, blank=True, related_name='comments',
    )
    standalone_task = models.ForeignKey(
        StandaloneTask, on_delete=models.CASCADE,
        null=True, blank=True, related_name='comments',
    )
    text = models.TextField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='task_comments_authored',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        target = f'stage:{self.stage_task_id}' if self.stage_task_id else f'standalone:{self.standalone_task_id}'
        return f'Comment on {target} by {self.author_id}'


class SubStageCompletion(models.Model):
    """Deprecated — kept in DB for historical data only. No longer written to."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        CRMProject, on_delete=models.CASCADE, related_name='sub_stage_completions'
    )
    stage_key = models.CharField(max_length=30)
    sub_stage_key = models.CharField(max_length=60)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sub_stages_completed',
    )

    class Meta:
        unique_together = [('project', 'stage_key', 'sub_stage_key')]


class ProjectNote(models.Model):
    """Append-only notes per project stage with user + timestamp."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(CRMProject, on_delete=models.CASCADE, related_name='notes')
    stage_key = models.CharField(max_length=60, blank=True, default='')
    sub_stage_key = models.CharField(max_length=60, blank=True, default='')
    text = models.TextField()
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='crm_notes_added',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['project', 'stage_key']),
            models.Index(fields=['project', '-created_at']),
        ]

    def __str__(self):
        return f'Note on {self.project_id}/{self.stage_key} at {self.created_at}'


class ProjectFile(models.Model):
    """Files/images attached to a project stage (Google Drive)."""
    FILE_TYPES = [('image', 'Image'), ('video', 'Video'), ('document', 'Document')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(CRMProject, on_delete=models.CASCADE, related_name='files')
    stage_key = models.CharField(max_length=60, blank=True, default='')
    sub_stage_key = models.CharField(max_length=60, blank=True, default='')
    drive_file_id = models.CharField(max_length=255)
    drive_url = models.URLField()
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES, default='document')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='crm_files_uploaded',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        indexes = [models.Index(fields=['project', 'stage_key'])]

    def __str__(self):
        return f'{self.filename} ({self.project_id}/{self.stage_key})'


class ProjectMilestone(models.Model):
    """Planned vs actual dates per milestone with RAG status flags."""
    STATUS_CHOICES = [
        ('on_track', 'On Track'), ('at_risk', 'At Risk'), ('delayed', 'Delayed'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(CRMProject, on_delete=models.CASCADE, related_name='milestones')
    milestone_key = models.CharField(max_length=60, db_index=True)
    milestone_display = models.CharField(max_length=120)
    planned_date = models.DateField()
    actual_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='on_track', db_index=True)

    class Meta:
        unique_together = [('project', 'milestone_key')]
        ordering = ['planned_date']

    def __str__(self):
        return f'{self.project_id} | {self.milestone_key} | {self.status}'

    def refresh_status(self):
        if self.actual_date:
            self.status = 'delayed' if self.actual_date > self.planned_date else 'on_track'
        else:
            today = date.today()
            delta = (self.planned_date - today).days
            if delta < 0:
                self.status = 'delayed'
            elif delta <= 2:
                self.status = 'at_risk'
            else:
                self.status = 'on_track'


class ProjectPayment(models.Model):
    """Cash-flow entry per project: Paid-out or Received, with vendor link for paid entries."""
    DIRECTION_CHOICES = [
        ('paid', 'Paid'), ('received', 'Received'),
        ('payable', 'Payable'), ('receivable', 'Receivable'),
    ]
    PAID_SUB_TYPES = [
        ('manufacturing', 'Manufacturing'), ('logistics', 'Logistics'),
        ('derma_testing', 'Derma Testing'), ('batch_testing', 'Batch Testing'),
        ('packaging', 'Packaging'), ('printing', 'Printing'),
        ('samples', 'Samples'), ('others', 'Others'),
    ]
    RECEIVED_SUB_TYPES = [
        ('sample', 'Sample'), ('production', 'Production'), ('design', 'Design'),
        ('packaging', 'Packaging'), ('printing', 'Printing'), ('logistics', 'Logistics'),
        ('testing', 'Testing'), ('others', 'Others'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        CRMProject, on_delete=models.CASCADE, null=True, blank=True, related_name='payments',
    )
    client = models.ForeignKey(
        'clients.Client', on_delete=models.SET_NULL, null=True, blank=True,
        to_field='phone_no', db_column='client_phone', related_name='cash_flow_payments',
    )
    payment_date = models.DateField()
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES, db_index=True)
    sub_type = models.CharField(max_length=30, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vendor = models.ForeignKey(
        'crm_master_data.Vendor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='cash_flow_payments',
    )
    manufacturer = models.ForeignKey(
        'crm_master_data.Manufacturer', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='cash_flow_payments',
    )
    settlement = models.OneToOneField(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='settles_payable',
    )
    comments = models.TextField(blank=True, default='')
    invoice_drive_id = models.CharField(max_length=255, blank=True, default='')
    invoice_drive_url = models.URLField(blank=True, default='')
    invoice_filename = models.CharField(max_length=255, blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='project_payments_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['project', '-payment_date']),
            models.Index(fields=['vendor', '-payment_date']),
            models.Index(fields=['manufacturer', '-payment_date']),
        ]

    @property
    def is_settled(self):
        return self.settlement_id is not None

    def __str__(self):
        return f'{self.project_id} | {self.direction}/{self.sub_type} | {self.payment_date}'


class KeyLearning(models.Model):
    """Key learnings per project — searchable for cross-project similarity."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(CRMProject, on_delete=models.CASCADE, related_name='key_learnings')
    text = models.TextField()
    tags = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='key_learnings_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['project'])]

    def __str__(self):
        return f'Learning on {self.project_id}: {self.text[:60]}'
