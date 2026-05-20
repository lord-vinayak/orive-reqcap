from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='catalogitem',
            name='rate_category',
            field=models.CharField(
                blank=True,
                choices=[('Basic', 'Basic'), ('Premium', 'Premium'), ('Luxury', 'Luxury')],
                default='',
                max_length=20,
            ),
        ),
    ]
