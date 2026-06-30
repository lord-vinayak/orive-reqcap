from django.db.models.signals import post_save
from django.dispatch import receiver

ROLE_TO_TEAM = {
    'poc_sales': 'sales',
    'poc_formulation': 'formulation',
    'poc_ops': 'ops',
    'admin': 'admin',
}


@receiver(post_save, sender='users.User')
def sync_team_member(sender, instance, **kwargs):
    """Auto-create or update InternalTeamMember whenever a poc_sales/poc_formulation user is saved."""
    from .models import InternalTeamMember

    team = ROLE_TO_TEAM.get(instance.role)
    if not team:
        return

    InternalTeamMember.objects.update_or_create(
        user=instance,
        defaults={
            'name': instance.name,
            'email': instance.email,
            'team': team,
        },
    )
