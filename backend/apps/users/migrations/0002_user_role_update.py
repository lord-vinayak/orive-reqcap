from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Admin'),
                    ('poc_sales', 'POC-Sales'),
                    ('poc_formulation', 'POC-Formulation'),
                ],
                default='poc_sales',
                max_length=20,
            ),
        ),
    ]
