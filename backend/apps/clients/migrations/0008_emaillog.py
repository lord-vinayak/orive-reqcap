import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0007_remove_product_requirement_captured_status'),
        ('crm_projects', '0014_add_source_requirement'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email_type', models.CharField(max_length=50)),
                ('email_type_label', models.CharField(max_length=100)),
                ('recipient_email', models.EmailField()),
                ('subject', models.CharField(max_length=300)),
                ('sent_by_name', models.CharField(blank=True, max_length=150)),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('attachments', models.JSONField(blank=True, default=list)),
                ('client', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='email_logs',
                    to='clients.client',
                    to_field='phone_no',
                )),
                ('project', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='email_logs',
                    to='crm_projects.crmproject',
                )),
                ('sent_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-sent_at'],
            },
        ),
    ]
