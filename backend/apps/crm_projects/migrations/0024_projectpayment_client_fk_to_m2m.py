from django.db import migrations, models


def migrate_fk_to_m2m(apps, schema_editor):
    """Copy existing single-FK client assignments into the new M2M table."""
    ProjectPayment = apps.get_model('crm_projects', 'ProjectPayment')
    for payment in ProjectPayment.objects.all():
        if payment._old_client_id:
            payment.clients.add(payment._old_client_id)


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0011_clientnote'),
        ('crm_projects', '0023_projectpayment_client_alter_projectpayment_project'),
    ]

    operations = [
        # 1. Add new M2M table
        migrations.AddField(
            model_name='projectpayment',
            name='clients',
            field=models.ManyToManyField(
                blank=True, related_name='cash_flow_payments', to='clients.client'
            ),
        ),

        # 2. Rename old FK column temporarily for migration
        migrations.RenameField('projectpayment', 'client', '_old_client'),

        # 3. Copy FK → M2M
        migrations.RunPython(migrate_fk_to_m2m, migrations.RunPython.noop),

        # 4. Remove old FK column
        migrations.RemoveField('projectpayment', '_old_client'),
    ]
