from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='status',
            field=models.CharField(
                blank=True,
                choices=[
                    ('new_lead', 'New Lead'),
                    ('interested_started', 'Interested – Project Started'),
                    ('not_interested_closed', 'Not Interested – Closed'),
                ],
                default='new_lead',
                max_length=30,
            ),
        ),
    ]
