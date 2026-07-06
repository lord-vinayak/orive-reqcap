from django.db import migrations

def migrate_packaging_stages(apps, schema_editor):
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')
    SubStageCompletion = apps.get_model('crm_projects', 'SubStageCompletion')
    ProjectNote = apps.get_model('crm_projects', 'ProjectNote')
    ProjectFile = apps.get_model('crm_projects', 'ProjectFile')

    # 1. Rename any existing 'pkg_po_taken' key to 'pkg_po_received'
    StageCompletion.objects.filter(stage_key='pkg_po_taken').update(stage_key='pkg_po_received')
    SubStageCompletion.objects.filter(stage_key='pkg_po_taken').update(stage_key='pkg_po_received')
    ProjectNote.objects.filter(stage_key='pkg_po_taken').update(stage_key='pkg_po_received')
    ProjectFile.objects.filter(stage_key='pkg_po_taken').update(stage_key='pkg_po_received')
    CRMProject.objects.filter(project_stage='pkg_po_taken').update(project_stage='pkg_po_received')

    # 2. Add the four new stage keys for all existing projects
    new_keys = ['pkg_packing_media_taken', 'pkg_tax_invoice_added', 'pkg_delivery_challan_created', 'pkg_insurance_created']
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

def reverse_migrate_packaging_stages(apps, schema_editor):
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')
    SubStageCompletion = apps.get_model('crm_projects', 'SubStageCompletion')
    ProjectNote = apps.get_model('crm_projects', 'ProjectNote')
    ProjectFile = apps.get_model('crm_projects', 'ProjectFile')

    # Delete the new stages
    new_keys = ['pkg_packing_media_taken', 'pkg_tax_invoice_added', 'pkg_delivery_challan_created', 'pkg_insurance_created']
    StageCompletion.objects.filter(stage_key__in=new_keys).delete()
    SubStageCompletion.objects.filter(stage_key__in=new_keys).delete()

    # Revert rename
    StageCompletion.objects.filter(stage_key='pkg_po_received').update(stage_key='pkg_po_taken')
    SubStageCompletion.objects.filter(stage_key='pkg_po_received').update(stage_key='pkg_po_taken')
    ProjectNote.objects.filter(stage_key='pkg_po_received').update(stage_key='pkg_po_taken')
    ProjectFile.objects.filter(stage_key='pkg_po_received').update(stage_key='pkg_po_taken')
    CRMProject.objects.filter(project_stage='pkg_po_received').update(project_stage='pkg_po_taken')


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0015_project_vendor_link'),
    ]

    operations = [
        migrations.RunPython(migrate_packaging_stages, reverse_migrate_packaging_stages),
    ]
