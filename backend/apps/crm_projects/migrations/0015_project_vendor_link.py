from django.db import migrations, models
import django.db.models.deletion


def migrate_vendor_assignments(apps, schema_editor):
    """Copy existing per-category M2M rows into ProjectVendorLink."""
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    ProjectVendorLink = apps.get_model('crm_projects', 'ProjectVendorLink')

    for project in CRMProject.objects.prefetch_related(
        'designers', 'packaging_vendors', 'printers',
        'batch_testing_vendors', 'derma_testing_vendors',
    ).all():
        seen = set()
        for m2m in ('designers', 'packaging_vendors', 'printers',
                    'batch_testing_vendors', 'derma_testing_vendors'):
            for vendor in getattr(project, m2m).all():
                if vendor.id not in seen:
                    ProjectVendorLink.objects.get_or_create(project=project, vendor=vendor)
                    seen.add(vendor.id)


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0014_add_source_requirement'),
        ('crm_master_data', '0008_seed_vendor_categories'),
    ]

    operations = [
        # 1. Create the new through model
        migrations.CreateModel(
            name='ProjectVendorLink',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vendor_links', to='crm_projects.crmproject')),
                ('vendor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='project_links', to='crm_master_data.vendor')),
            ],
            options={
                'unique_together': {('project', 'vendor')},
            },
        ),
        # 2. Copy existing assignments
        migrations.RunPython(migrate_vendor_assignments, migrations.RunPython.noop),
        # 3. Drop the old per-category M2M fields
        migrations.RemoveField(model_name='crmproject', name='designers'),
        migrations.RemoveField(model_name='crmproject', name='packaging_vendors'),
        migrations.RemoveField(model_name='crmproject', name='printers'),
        migrations.RemoveField(model_name='crmproject', name='batch_testing_vendors'),
        migrations.RemoveField(model_name='crmproject', name='derma_testing_vendors'),
    ]
