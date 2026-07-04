from django.db import migrations


SEED = [
    ('Packaging',        'packaging',  'PKG'),
    ('Printing',         'printing',   'PRT'),
    ('Testing Services', 'testing',    'TST'),
    ('Designer',         'designer',   'DES'),
    ('Ecommerce Agency', 'ecommerce',  'ECM'),
    ('Logistics Agency', 'logistics',  'LOG'),
]


def seed_vendor_categories(apps, schema_editor):
    VendorCategory = apps.get_model('crm_master_data', 'VendorCategory')
    for name, slug, prefix in SEED:
        VendorCategory.objects.get_or_create(
            slug=slug,
            defaults={'name': name, 'prefix': prefix},
        )


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    atomic = True

    dependencies = [
        ('crm_master_data', '0007_vendor_category_model'),
    ]

    operations = [
        migrations.RunPython(seed_vendor_categories, reverse_noop),
    ]
