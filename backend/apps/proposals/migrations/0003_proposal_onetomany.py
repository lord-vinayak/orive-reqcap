from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Convert Proposal.requirement from OneToOneField to ForeignKey,
    allowing a requirement to have multiple proposals over time.
    Existing data is fully preserved.
    """

    dependencies = [
        ('proposals', '0002_initial'),
        ('requirements_app', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='proposal',
            name='requirement',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='proposals',
                to='requirements_app.requirement',
            ),
        ),
    ]
