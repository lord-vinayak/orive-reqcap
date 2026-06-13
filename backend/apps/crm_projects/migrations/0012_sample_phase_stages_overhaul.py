from django.db import migrations

# New keys added to sample pre-loop
NEW_PRE_LOOP_KEYS = ['invoice_pending']

# New keys added to the resample loop base (no _c1 suffix for cycle 1)
NEW_LOOP_BASE_KEYS = [
    'formula_pending',
    'sample_in_pipeline',
    'sample_created',
    'shipment_created',
    'shipment_picked',
    'shipment_delivered',
]


def add_new_stage_completions(apps, schema_editor):
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')

    to_create = []
    for project in CRMProject.objects.all():
        # Pre-loop additions (not per-cycle)
        for key in NEW_PRE_LOOP_KEYS:
            to_create.append(StageCompletion(project=project, stage_key=key))

        # Loop additions — one row per cycle that has already been initiated
        num_cycles = project.resample_cycle or 1
        for cycle in range(1, num_cycles + 1):
            for key in NEW_LOOP_BASE_KEYS:
                actual_key = key if cycle == 1 else f'{key}_c{cycle}'
                to_create.append(StageCompletion(project=project, stage_key=actual_key))

    StageCompletion.objects.bulk_create(to_create, ignore_conflicts=True)


def reverse_new_stage_completions(apps, schema_editor):
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')
    all_keys = list(NEW_PRE_LOOP_KEYS)
    for key in NEW_LOOP_BASE_KEYS:
        for suffix in ('', '_c2', '_c3'):
            all_keys.append(f'{key}{suffix}')
    StageCompletion.objects.filter(stage_key__in=all_keys).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0011_payable_receivable_directions'),
    ]

    operations = [
        migrations.RunPython(
            add_new_stage_completions,
            reverse_new_stage_completions,
        ),
    ]
