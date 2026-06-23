from django.db import migrations, models


def migrate_forward(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')
    Client.objects.filter(lead_status='product_requirement_captured').update(
        lead_status='initial_conversation',
        lead_sub_status='initial_conversation__product_requirement_captured',
    )
    Client.objects.filter(lead_status='on_hold').update(
        lead_status='lead_closed',
        lead_sub_status='lead_closed__on_hold',
    )


def migrate_backward(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')
    Client.objects.filter(
        lead_status='initial_conversation',
        lead_sub_status='initial_conversation__product_requirement_captured',
    ).update(lead_status='product_requirement_captured', lead_sub_status='')
    Client.objects.filter(
        lead_status='lead_closed',
        lead_sub_status='lead_closed__on_hold',
    ).update(lead_status='on_hold', lead_sub_status='')


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0006_lead_status'),
    ]

    operations = [
        migrations.RunPython(migrate_forward, migrate_backward),
        migrations.AlterField(
            model_name='client',
            name='lead_status',
            field=models.CharField(
                blank=True, default='initial_conversation', max_length=40,
                choices=[
                    ('initial_conversation', 'Initial Conversation'),
                    ('proposal', 'Proposal'),
                    ('costing', 'Costing'),
                    ('sample', 'Sample'),
                    ('order', 'Order'),
                    ('production', 'Production'),
                    ('testing', 'Testing'),
                    ('filling', 'Filling'),
                    ('order_dispatch', 'Order Dispatch'),
                    ('order_closed', 'Order Closed'),
                    ('lead_closed', 'Lead Closed'),
                ],
            ),
        ),
    ]
