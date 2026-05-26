from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0002_catalogitem_rate_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='catalogitem',
            name='uploaded_at',
            field=models.DateField(blank=True, null=True),
        ),
    ]
