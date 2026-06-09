from django.db import migrations, models


OLD_TO_NEW = {
    'unanswered':        ('initial_conversation', ''),
    'call_back':         ('initial_conversation', ''),
    'interested':        ('initial_conversation', ''),
    'catalogue_shared':  ('proposal',             'proposal__send'),
    'costing_shared':    ('costing',              'costing__send'),
    'language_barrier':  ('lead_closed',          'lead_closed__language_issue'),
    'not_interested':    ('lead_closed',           'lead_closed__others'),
    'not_responding':    ('lead_closed',           'lead_closed__not_responding'),
}


def migrate_forward(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')
    for client in Client.objects.all():
        ls, lss = OLD_TO_NEW.get(client.status, ('initial_conversation', ''))
        client.lead_status = ls
        client.lead_sub_status = lss
        client.save(update_fields=['lead_status', 'lead_sub_status'])


def migrate_backward(apps, schema_editor):
    # Best-effort reverse — map back to closest old status
    NEW_TO_OLD = {
        'initial_conversation':         'unanswered',
        'product_requirement_captured': 'interested',
        'proposal':                     'catalogue_shared',
        'costing':                      'costing_shared',
        'sample':                       'interested',
        'order':                        'interested',
        'production':                   'interested',
        'testing':                      'interested',
        'filling':                      'interested',
        'order_dispatch':               'interested',
        'order_closed':                 'interested',
        'on_hold':                      'call_back',
        'lead_closed':                  'not_interested',
    }
    Client = apps.get_model('clients', 'Client')
    for client in Client.objects.all():
        client.status = NEW_TO_OLD.get(client.lead_status, 'unanswered')
        client.save(update_fields=['status'])


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0005_add_client_product_fields'),
    ]

    operations = [
        # 1. Add new fields
        migrations.AddField(
            model_name='client',
            name='lead_status',
            field=models.CharField(
                blank=True, default='initial_conversation', max_length=40,
                choices=[
                    ('initial_conversation', 'Initial Conversation'),
                    ('product_requirement_captured', 'Product Requirement Captured'),
                    ('proposal', 'Proposal'),
                    ('costing', 'Costing'),
                    ('sample', 'Sample'),
                    ('order', 'Order'),
                    ('production', 'Production'),
                    ('testing', 'Testing'),
                    ('filling', 'Filling'),
                    ('order_dispatch', 'Order Dispatch'),
                    ('order_closed', 'Order Closed'),
                    ('on_hold', 'On Hold'),
                    ('lead_closed', 'Lead Closed'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='client',
            name='lead_sub_status',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
        # 2. Data migration
        migrations.RunPython(migrate_forward, migrate_backward),
        # 3. Drop old status field
        migrations.RemoveField(
            model_name='client',
            name='status',
        ),
    ]
