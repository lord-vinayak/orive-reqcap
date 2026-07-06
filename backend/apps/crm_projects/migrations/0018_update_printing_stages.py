from django.db import migrations

def migrate_printing_stages(apps, schema_editor):
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')

    new_keys = ['printing_shipment_created']
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

def reverse_migrate_printing_stages(apps, schema_editor):
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')
    SubStageCompletion = apps.get_model('crm_projects', 'SubStageCompletion')

    new_keys = ['printing_shipment_created']
    StageCompletion.objects.filter(stage_key__in=new_keys).delete()
    SubStageCompletion.objects.filter(stage_key__in=new_keys).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0017_update_content_stages'),
    ]

    operations = [
        migrations.RunPython(migrate_printing_stages, reverse_migrate_printing_stages),
    ]
