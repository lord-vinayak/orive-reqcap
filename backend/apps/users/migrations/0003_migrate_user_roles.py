from django.db import migrations


def migrate_user_roles_forward(apps, schema_editor):
    """Rename legacy 'user' role to 'poc_sales'."""
    User = apps.get_model('users', 'User')
    User.objects.filter(role='user').update(role='poc_sales')


def migrate_user_roles_backward(apps, schema_editor):
    """Reverse: rename 'poc_sales' back to 'user'."""
    User = apps.get_model('users', 'User')
    User.objects.filter(role='poc_sales').update(role='user')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_role_update'),
    ]

    operations = [
        migrations.RunPython(migrate_user_roles_forward, migrate_user_roles_backward),
    ]
