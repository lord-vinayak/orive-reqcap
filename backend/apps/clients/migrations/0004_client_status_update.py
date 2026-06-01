from django.db import migrations, models


def migrate_old_statuses(apps, schema_editor):
    """Map the 3 old status values to the closest new 8-value equivalents."""
    Client = apps.get_model('clients', 'Client')
    mapping = {
        'new_lead': 'unanswered',
        'interested_started': 'interested',
        'not_interested_closed': 'not_interested',
    }
    for old, new in mapping.items():
        Client.objects.filter(status=old).update(status=new)


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0003_client_status'),
    ]

    operations = [
        migrations.RunPython(migrate_old_statuses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='client',
            name='status',
            field=models.CharField(
                blank=True,
                choices=[
                    ('call_back', 'Call Back'),
                    ('catalogue_shared', 'Catalogue Shared'),
                    ('costing_shared', 'Costing Shared'),
                    ('interested', 'Interested'),
                    ('language_barrier', 'Language Barrier'),
                    ('not_interested', 'Not Interested'),
                    ('not_responding', 'Not Responding after Multiple Attempts'),
                    ('unanswered', 'Unanswered'),
                ],
                default='unanswered',
                max_length=30,
            ),
        ),
    ]
