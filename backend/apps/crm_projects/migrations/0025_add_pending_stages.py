from django.db import migrations

# Non-loop keys, added once per project (order phase)
NEW_ORDER_KEYS = ['pkg_pending', 'pkg_order_pending', 'production_pending']

# Loop key, added per resample cycle already initiated (sample phase)
NEW_LOOP_KEY = 'pickup_pending'


def add_stages(apps, schema_editor):
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')

    to_create = []
    for project in CRMProject.objects.all():
        for key in NEW_ORDER_KEYS:
            to_create.append(StageCompletion(project=project, stage_key=key))
        num_cycles = project.resample_cycle or 1
        for cycle in range(1, num_cycles + 1):
            key = NEW_LOOP_KEY if cycle == 1 else f'{NEW_LOOP_KEY}_c{cycle}'
            to_create.append(StageCompletion(project=project, stage_key=key))

    StageCompletion.objects.bulk_create(to_create, ignore_conflicts=True)


def remove_stages(apps, schema_editor):
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')
    keys = list(NEW_ORDER_KEYS)
    for suffix in ('', '_c2', '_c3', '_c4', '_c5', '_c6', '_c7', '_c8', '_c9', '_c10'):
        keys.append(f'{NEW_LOOP_KEY}{suffix}')
    StageCompletion.objects.filter(stage_key__in=keys).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0024_projectpayment_client_fk_to_m2m'),
    ]

    operations = [
        migrations.RunPython(add_stages, remove_stages),
    ]
