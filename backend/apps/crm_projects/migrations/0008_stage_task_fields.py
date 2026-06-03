from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('crm_projects', '0007_stage_tracker_refactor'),
        ('crm_master_data', '0003_add_vendor_id'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='stagecompletion',
            name='assigned_to',
            field=models.ForeignKey(
                'crm_master_data.InternalTeamMember',
                on_delete=django.db.models.deletion.SET_NULL,
                null=True, blank=True,
                related_name='assigned_stages',
            ),
        ),
        migrations.AddField(
            model_name='stagecompletion',
            name='assigned_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='stagecompletion',
            name='assigned_by',
            field=models.ForeignKey(
                settings.AUTH_USER_MODEL,
                on_delete=django.db.models.deletion.SET_NULL,
                null=True, blank=True,
                related_name='task_assignments_made',
            ),
        ),
        migrations.AddField(
            model_name='stagecompletion',
            name='task_status',
            field=models.CharField(
                choices=[
                    ('not_started', 'Not Started'),
                    ('wip', 'WIP'),
                    ('pending', 'Pending'),
                    ('closed', 'Closed'),
                ],
                default='not_started',
                max_length=15,
                db_index=True,
            ),
        ),
    ]
