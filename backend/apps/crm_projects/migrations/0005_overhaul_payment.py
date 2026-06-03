import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0004_add_project_payment'),
        ('crm_master_data', '0003_add_vendor_id'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Wipe all existing payment rows (hard cutover)
        migrations.RunSQL(
            'DELETE FROM crm_projects_projectpayment;',
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 2. Remove old columns
        migrations.RemoveField(model_name='projectpayment', name='payment_type'),
        migrations.RemoveField(model_name='projectpayment', name='amount_paid'),
        migrations.RemoveField(model_name='projectpayment', name='amount_received'),

        # 3. Add new columns
        migrations.AddField(
            model_name='projectpayment',
            name='direction',
            field=models.CharField(
                choices=[('paid', 'Paid'), ('received', 'Received')],
                db_index=True, default='paid', max_length=10,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='projectpayment',
            name='sub_type',
            field=models.CharField(db_index=True, default='others', max_length=30),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='projectpayment',
            name='amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='projectpayment',
            name='vendor',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cash_flow_payments',
                to='crm_master_data.vendor',
            ),
        ),
        migrations.AddField(
            model_name='projectpayment',
            name='manufacturer',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cash_flow_payments',
                to='crm_master_data.manufacturer',
            ),
        ),

        # 4. Add index for vendor/manufacturer lookups
        migrations.AddIndex(
            model_name='projectpayment',
            index=models.Index(fields=['vendor', '-payment_date'], name='crm_proj_vendor_date_idx'),
        ),
        migrations.AddIndex(
            model_name='projectpayment',
            index=models.Index(fields=['manufacturer', '-payment_date'], name='crm_proj_mfr_date_idx'),
        ),
    ]
