from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Connect one Google Drive owner account and print GOOGLE_DRIVE_REFRESH_TOKEN.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--port',
            type=int,
            default=8080,
            help='Local callback port. Add http://localhost:<port>/ to the Google OAuth redirect URIs.',
        )

    def handle(self, *args, **options):
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise CommandError('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before running this command.')

        from google_auth_oauthlib.flow import InstalledAppFlow

        port = options['port']
        flow = InstalledAppFlow.from_client_config(
            {
                'installed': {
                    'client_id': settings.GOOGLE_CLIENT_ID,
                    'client_secret': settings.GOOGLE_CLIENT_SECRET,
                    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                    'token_uri': 'https://oauth2.googleapis.com/token',
                }
            },
            scopes=['https://www.googleapis.com/auth/drive'],
            redirect_uri=f'http://localhost:{port}/',
        )

        self.stdout.write(
            self.style.WARNING(
                f'Make sure http://localhost:{port}/ is listed in your Google OAuth client redirect URIs.'
            )
        )
        credentials = flow.run_local_server(
            host='localhost',
            port=port,
            authorization_prompt_message='Open this URL in a browser and sign in with the Drive owner account:\n{url}',
            success_message='Drive owner connected. You can close this tab and return to the terminal.',
            access_type='offline',
            prompt='consent',
        )

        if not credentials.refresh_token:
            raise CommandError(
                'Google did not return a refresh token. Re-run this command and make sure you approve access.'
            )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Add this to backend/.env and Railway variables:'))
        self.stdout.write(f'GOOGLE_DRIVE_REFRESH_TOKEN={credentials.refresh_token}')
