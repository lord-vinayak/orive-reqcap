from django.db import migrations, models


VENDOR_TYPE_PREFIXES = {
    'packaging': 'PKG',
    'printing': 'PRT',
    'testing': 'TST',
    'designer': 'DES',
    'ecommerce': 'ECM',
    'logistics': 'LOG',
}


def assign_vendor_ids(apps, schema_editor):
    Manufacturer = apps.get_model('crm_master_data', 'Manufacturer')
    Vendor = apps.get_model('crm_master_data', 'Vendor')

    for i, m in enumerate(Manufacturer.objects.order_by('created_at'), 1):
        m.vendor_id = f'MFR-{i:03d}'
        m.save(update_fields=['vendor_id'])

    counters = {}
    for v in Vendor.objects.order_by('vendor_type', 'created_at'):
        prefix = VENDOR_TYPE_PREFIXES.get(v.vendor_type, 'VND')
        counters[prefix] = counters.get(prefix, 0) + 1
        v.vendor_id = f'{prefix}-{counters[prefix]:03d}'
        v.save(update_fields=['vendor_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('crm_master_data', '0002_initial'),
    ]

    operations = [
        # Add without index first so backfill runs before uniqueness is enforced
        migrations.AddField(
            model_name='manufacturer',
            name='vendor_id',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='vendor',
            name='vendor_id',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.RunPython(assign_vendor_ids, migrations.RunPython.noop),
        # Now add unique + db_index constraint after backfill
        migrations.AlterField(
            model_name='manufacturer',
            name='vendor_id',
            field=models.CharField(blank=True, db_index=True, max_length=20, unique=True),
        ),
        migrations.AlterField(
            model_name='vendor',
            name='vendor_id',
            field=models.CharField(blank=True, db_index=True, max_length=20, unique=True),
        ),
    ]
