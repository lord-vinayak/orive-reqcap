from django.db import migrations

def migrate_production_stages(apps, schema_editor):
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')
    SubStageCompletion = apps.get_model('crm_projects', 'SubStageCompletion')
    ProjectNote = apps.get_model('crm_projects', 'ProjectNote')
    ProjectFile = apps.get_model('crm_projects', 'ProjectFile')

    # 1. Clean up obsolete client_feedback stage
    # Move any notes and files to project-level (stage_key='') so they are not lost
    ProjectNote.objects.filter(stage_key='client_feedback').update(stage_key='', sub_stage_key='')
    ProjectFile.objects.filter(stage_key='client_feedback').update(stage_key='', sub_stage_key='')
    CRMProject.objects.filter(project_stage='client_feedback').update(project_stage='sample_invoice_shared')

    StageCompletion.objects.filter(stage_key='client_feedback').delete()
    SubStageCompletion.objects.filter(stage_key='client_feedback').delete()

    # 2. Add the 7 new stage keys for all existing projects
    new_keys = [
        'production_entry_tracker',
        'production_email_manufacturer',
        'production_batch_allocated',
        'production_initiated',
        'production_completed',
        'batch_completed',
        'batch_reports_client_folder'
    ]
    projects = CRMProject.objects.all()

    new_stage_completions = []
    for project in projects:
        for key in new_keys:
            if not StageCompletion.objects.filter(project=project, stage_key=key).exists():
                new_stage_completions.append(
                    StageCompletion(project=project, stage_key=key, is_complete=False)
                )

    if new_stage_completions:
        StageCompletion.objects.bulk_create(new_stage_completions)

def reverse_migrate_production_stages(apps, schema_editor):
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')
    SubStageCompletion = apps.get_model('crm_projects', 'SubStageCompletion')

    # Delete the new stages
    new_keys = [
        'production_entry_tracker',
        'production_email_manufacturer',
        'production_batch_allocated',
        'production_initiated',
        'production_completed',
        'batch_completed',
        'batch_reports_client_folder'
    ]
    StageCompletion.objects.filter(stage_key__in=new_keys).delete()
    SubStageCompletion.objects.filter(stage_key__in=new_keys).delete()

    # Recreate the old client_feedback stage for all projects
    projects = CRMProject.objects.all()
    old_stage_completions = [
        StageCompletion(project=project, stage_key='client_feedback', is_complete=False)
        for project in projects
    ]
    if old_stage_completions:
        StageCompletion.objects.bulk_create(old_stage_completions)


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0018_update_printing_stages'),
    ]

    operations = [
        migrations.RunPython(migrate_production_stages, reverse_migrate_production_stages),
    ]
