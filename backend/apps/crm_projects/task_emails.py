import logging

from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_task_assignment_email(member, *, task_title, context_label, priority, planned_closure_date, assigned_by):
    """Notify an InternalTeamMember they've been assigned a task. Never raises."""
    recipient = member.email or (member.user.email if member.user_id else '')
    if not recipient:
        logger.warning('Skipped assignment email for %s: no email on file.', member.name)
        return

    due = planned_closure_date.strftime('%d %b %Y') if planned_closure_date else 'Not set'
    assigned_by_name = getattr(assigned_by, 'name', '') or getattr(assigned_by, 'email', '') or 'a team member'

    body = (
        f"Hi {member.name},\n\n"
        f"You've been assigned a task by {assigned_by_name}.\n\n"
        f"Task: {task_title}\n"
        f"Project: {context_label}\n"
        f"Priority: {priority.title()}\n"
        f"Planned closure date: {due}\n\n"
        f"— Skinovation Sciences"
    )

    try:
        send_mail(
            subject=f'Task assigned: {task_title}',
            message=body,
            from_email=None,
            recipient_list=[recipient],
            fail_silently=False,
        )
    except Exception:
        logger.exception('Failed to send task assignment email to %s', recipient)
