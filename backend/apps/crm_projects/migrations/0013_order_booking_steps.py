from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0012_sample_phase_stages_overhaul'),
    ]

    operations = [
        migrations.AddField(
            model_name='crmproject',
            name='order_booking_steps',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
