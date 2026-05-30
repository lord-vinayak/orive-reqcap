import uuid
from datetime import date, timedelta
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator

from .stage_definitions import STAGE_KEYS, TOTAL_STAGES, STAGE_KEY_TO_INDEX


def _add_weekdays(start: date, days: int) -> date:
    """Add `days` weekdays (Mon–Fri) to start date."""
    current = start
    added = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:  # 0=Mon, 4=Fri
            added += 1
    return current


STAGE_CHOICES = [(k, k.replace('_', ' ').title()) for k in STAGE_KEYS]


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
    manufacturer = models.ForeignKey(
        'crm_master_data.Manufacturer',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='projects',
    )
    project_stage = models.CharField(
        max_length=30, choices=STAGE_CHOICES, default='new_lead', db_index=True
    )
    sales_poc = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='crm_projects_as_sales',
        limit_choices_to={'role': 'poc_sales'},
    )
    formulation_poc = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='crm_projects_as_formulation',
        limit_choices_to={'role': 'poc_formulation'},
    )
    # Day 0 of timeline engine
    sample_booked_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='crm_projects_created',
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project_stage', '-created_at']),
            models.Index(fields=['client', '-created_at']),
        ]

    def __str__(self):
        return self.project_no or str(self.id)

    def save(self, *args, **kwargs):
        if not self.project_no:
            today = date.today().strftime('%Y%m%d')
            client_prefix = (self.client.name[:3]).upper()
            self.project_no = f'SKI{today}{client_prefix}'
        super().save(*args, **kwargs)

    @property
    def progress_percentage(self):
        """(completed stages / 16) × 100, integer."""
        completed = self.stage_completions.filter(is_complete=True).count()
        return round((completed / TOTAL_STAGES) * 100)

    @property
    def delayed_stages(self):
        return self.milestones.filter(status='delayed')

    @property
    def at_risk_stages(self):
        return self.milestones.filter(status='at_risk')


class StageCompletion(models.Model):
    """Tracks whether a top-level stage is complete for a project."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        CRMProject, on_delete=models.CASCADE, related_name='stage_completions'
    )
    stage_key = models.CharField(max_length=30, choices=STAGE_CHOICES)
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
    )

    class Meta:
        unique_together = [('project', 'stage_key')]
        ordering = ['project', 'stage_key']

    def __str__(self):
        return f'{self.project_id} | {self.stage_key} | {"✓" if self.is_complete else "○"}'


class SubStageCompletion(models.Model):
    """Checkbox state for each sub-stage step per project."""
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
        null=True, blank=True,
        related_name='sub_stages_completed',
    )

    class Meta:
        unique_together = [('project', 'stage_key', 'sub_stage_key')]
        indexes = [
            models.Index(fields=['project', 'stage_key']),
        ]

    def __str__(self):
        return f'{self.project_id} | {self.stage_key}/{self.sub_stage_key}'


class ProjectNote(models.Model):
    """Append-only notes per project stage/sub-stage with user + timestamp."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        CRMProject, on_delete=models.CASCADE, related_name='notes'
    )
    # stage_key=None means project-level note
    stage_key = models.CharField(max_length=30, blank=True, default='')
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
    """Files/images attached to a project stage or sub-stage (Google Drive)."""
    FILE_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('document', 'Document'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        CRMProject, on_delete=models.CASCADE, related_name='files'
    )
    stage_key = models.CharField(max_length=30, blank=True, default='')
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
        indexes = [
            models.Index(fields=['project', 'stage_key']),
        ]

    def __str__(self):
        return f'{self.filename} ({self.project_id}/{self.stage_key})'


class ProjectMilestone(models.Model):
    """Planned vs actual dates per milestone with RAG status flags."""
    STATUS_CHOICES = [
        ('on_track', 'On Track'),
        ('at_risk', 'At Risk'),
        ('delayed', 'Delayed'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        CRMProject, on_delete=models.CASCADE, related_name='milestones'
    )
    milestone_key = models.CharField(max_length=60, db_index=True)
    milestone_display = models.CharField(max_length=120)
    planned_date = models.DateField()
    actual_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='on_track', db_index=True
    )

    class Meta:
        unique_together = [('project', 'milestone_key')]
        ordering = ['planned_date']

    def __str__(self):
        return f'{self.project_id} | {self.milestone_key} | {self.status}'

    def refresh_status(self):
        """Recalculate RAG status based on today vs planned_date."""
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


class KeyLearning(models.Model):
    """Key learnings per project — searchable for cross-project similarity."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        CRMProject, on_delete=models.CASCADE, related_name='key_learnings'
    )
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
        indexes = [
            models.Index(fields=['project']),
        ]

    def __str__(self):
        return f'Learning on {self.project_id}: {self.text[:60]}'
