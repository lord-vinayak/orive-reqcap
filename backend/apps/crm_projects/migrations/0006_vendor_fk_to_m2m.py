import django.db.models.deletion
from django.db import migrations, models


def migrate_fk_to_m2m(apps, schema_editor):
    """Copy existing single-FK vendor assignments into the new M2M tables."""
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    for project in CRMProject.objects.all():
        if project._old_manufacturer_id:
            project.manufacturers.add(project._old_manufacturer_id)
        if project._old_designer_id:
            project.designers.add(project._old_designer_id)
        if project._old_packaging_vendor_id:
            project.packaging_vendors.add(project._old_packaging_vendor_id)
        if project._old_printer_id:
            project.printers.add(project._old_printer_id)
        if project._old_batch_testing_vendor_id:
            project.batch_testing_vendors.add(project._old_batch_testing_vendor_id)
        if project._old_derma_testing_vendor_id:
            project.derma_testing_vendors.add(project._old_derma_testing_vendor_id)


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0005_overhaul_payment'),
        ('crm_master_data', '0003_add_vendor_id'),
    ]

    operations = [
        # 1. Add new M2M tables
        migrations.AddField(
            model_name='crmproject',
            name='manufacturers',
            field=models.ManyToManyField(
                blank=True, related_name='projects', to='crm_master_data.manufacturer'
            ),
        ),
        migrations.AddField(
            model_name='crmproject',
            name='designers',
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={'vendor_type': 'designer'},
                related_name='projects_as_designer',
                to='crm_master_data.vendor',
            ),
        ),
        migrations.AddField(
            model_name='crmproject',
            name='packaging_vendors',
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={'vendor_type': 'packaging'},
                related_name='projects_as_packaging_vendor',
                to='crm_master_data.vendor',
            ),
        ),
        migrations.AddField(
            model_name='crmproject',
            name='printers',
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={'vendor_type': 'printing'},
                related_name='projects_as_printer',
                to='crm_master_data.vendor',
            ),
        ),
        migrations.AddField(
            model_name='crmproject',
            name='batch_testing_vendors',
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={'vendor_type': 'testing'},
                related_name='projects_as_batch_testing',
                to='crm_master_data.vendor',
            ),
        ),
        migrations.AddField(
            model_name='crmproject',
            name='derma_testing_vendors',
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={'vendor_type': 'testing'},
                related_name='projects_as_derma_testing',
                to='crm_master_data.vendor',
            ),
        ),

        # 2. Rename old FK columns temporarily for migration
        migrations.RenameField('crmproject', 'manufacturer', '_old_manufacturer'),
        migrations.RenameField('crmproject', 'designer', '_old_designer'),
        migrations.RenameField('crmproject', 'packaging_vendor', '_old_packaging_vendor'),
        migrations.RenameField('crmproject', 'printer', '_old_printer'),
        migrations.RenameField('crmproject', 'batch_testing_vendor', '_old_batch_testing_vendor'),
        migrations.RenameField('crmproject', 'derma_testing_vendor', '_old_derma_testing_vendor'),

        # 3. Copy FK → M2M
        migrations.RunPython(migrate_fk_to_m2m, migrations.RunPython.noop),

        # 4. Remove old FK columns
        migrations.RemoveField('crmproject', '_old_manufacturer'),
        migrations.RemoveField('crmproject', '_old_designer'),
        migrations.RemoveField('crmproject', '_old_packaging_vendor'),
        migrations.RemoveField('crmproject', '_old_printer'),
        migrations.RemoveField('crmproject', '_old_batch_testing_vendor'),
        migrations.RemoveField('crmproject', '_old_derma_testing_vendor'),
    ]
