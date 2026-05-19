from django.conf import settings
from django.core.management.base import BaseCommand
from apps.users.models import User


class Command(BaseCommand):
    help = 'Creates the initial admin user from INITIAL_ADMIN_* env vars if it does not exist.'

    def handle(self, *args, **options):
        email = settings.INITIAL_ADMIN_EMAIL
        password = settings.INITIAL_ADMIN_PASSWORD
        name = settings.INITIAL_ADMIN_NAME
        if not (email and password):
            self.stdout.write(self.style.WARNING('INITIAL_ADMIN_EMAIL/PASSWORD not set, skipping.'))
            return
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Admin user {email} already exists. Updated password and permissions.'))
            return
        user = User.objects.create_user(email=email, name=name, password=password, role='admin')
        user.is_staff = True
        user.is_superuser = True
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Created admin user: {email}'))
