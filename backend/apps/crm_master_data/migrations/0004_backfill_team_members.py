from django.db import migrations


def backfill_team_members(apps, schema_editor):
    User = apps.get_model('users', 'User')
    InternalTeamMember = apps.get_model('crm_master_data', 'InternalTeamMember')
    ROLE_TO_TEAM = {'poc_sales': 'sales', 'poc_formulation': 'formulation'}
    for user in User.objects.filter(role__in=ROLE_TO_TEAM):
        team = ROLE_TO_TEAM[user.role]
        if not InternalTeamMember.objects.filter(user=user).exists():
            InternalTeamMember.objects.create(
                user=user,
                name=user.name,
                email=user.email,
                team=team,
            )


class Migration(migrations.Migration):
    dependencies = [
        ('crm_master_data', '0003_add_vendor_id'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(backfill_team_members, migrations.RunPython.noop),
    ]
