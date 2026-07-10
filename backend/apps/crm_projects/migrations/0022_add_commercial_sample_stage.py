from django.db import migrations

NEW_KEY = 'commercial_sample_sent_client'

def add_stage(apps, schema_editor):
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')

    existing = set(StageCompletion.objects.filter(stage_key=NEW_KEY).values_list('project_id', flat=True))
    new_rows = [
        StageCompletion(project=project, stage_key=NEW_KEY, is_complete=False)
        for project in CRMProject.objects.all()
        if project.id not in existing
    ]
    if new_rows:
        StageCompletion.objects.bulk_create(new_rows)

def remove_stage(apps, schema_editor):
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')
    SubStageCompletion = apps.get_model('crm_projects', 'SubStageCompletion')
    StageCompletion.objects.filter(stage_key=NEW_KEY).delete()
    SubStageCompletion.objects.filter(stage_key=NEW_KEY).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0021_crmproject_sample_rejected'),
    ]

    operations = [
        migrations.RunPython(add_stage, remove_stage),
    ]
