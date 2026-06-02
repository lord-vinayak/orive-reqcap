"""Google Drive helper utilities."""
import io
import json
import os
from datetime import date
from django.conf import settings


def _build_drive_service():
    from google.oauth2.credentials import Credentials
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds_json = settings.GOOGLE_DRIVE_CREDENTIALS_JSON
    creds_file = settings.GOOGLE_DRIVE_CREDENTIALS_FILE
    refresh_token = settings.GOOGLE_DRIVE_REFRESH_TOKEN
    scopes = ['https://www.googleapis.com/auth/drive']

    if refresh_token:
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise RuntimeError(
                'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required when '
                'GOOGLE_DRIVE_REFRESH_TOKEN is configured'
            )
        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=scopes,
        )
    elif creds_json:
        info = json.loads(creds_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
    elif creds_file:
        # Resolve relative paths against Django's BASE_DIR (the backend/ folder)
        from django.conf import settings as _settings
        resolved = creds_file if os.path.isabs(creds_file) else os.path.join(_settings.BASE_DIR, creds_file)
        if not os.path.exists(resolved):
            raise RuntimeError(
                f'Google Drive credentials file not found: {resolved}\n'
                'Please download the service account JSON key from Google Cloud Console and '
                f'place it at {resolved}, or set GOOGLE_DRIVE_CREDENTIALS_JSON in your .env.'
            )
        creds = service_account.Credentials.from_service_account_file(resolved, scopes=scopes)
    else:
        raise RuntimeError('Google Drive credentials not configured')

    return build('drive', 'v3', credentials=creds, cache_discovery=False)


def _get_or_create_folder(service, name, parent_id):
    """Find or create a folder under parent_id with the given name."""
    safe_name = name.replace("'", "\\'")
    q = (f"name = '{safe_name}' and mimeType = 'application/vnd.google-apps.folder' "
         f"and '{parent_id}' in parents and trashed = false")
    resp = service.files().list(q=q, fields='files(id,name)', supportsAllDrives=True,
                                includeItemsFromAllDrives=True).execute()
    if resp.get('files'):
        return resp['files'][0]['id']
    metadata = {
        'name': name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id],
    }
    folder = service.files().create(body=metadata, fields='id', supportsAllDrives=True).execute()
    return folder['id']


def upload_file(file_bytes, filename, mimetype, client_name, subfolder=None):
    """Upload a file to Google Drive.

    Folder structure:
      - subfolder given: /<root>/<client_name>/<subfolder>/<filename>
      - subfolder None:  /<root>/<client_name>/<YYYY-MM-DD>/<filename>  (existing behaviour)
    """
    from googleapiclient.http import MediaIoBaseUpload

    service = _build_drive_service()
    root_id = settings.GOOGLE_DRIVE_ROOT_FOLDER_ID
    if not root_id:
        raise RuntimeError('GOOGLE_DRIVE_ROOT_FOLDER_ID not configured')

    client_folder_id = _get_or_create_folder(service, client_name or 'unknown', root_id)
    if subfolder:
        date_folder_id = _get_or_create_folder(service, subfolder, client_folder_id)
    else:
        date_folder_id = _get_or_create_folder(service, date.today().isoformat(), client_folder_id)

    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mimetype, resumable=False)
    metadata = {'name': filename, 'parents': [date_folder_id]}
    file = service.files().create(
        body=metadata, media_body=media,
        fields='id, webViewLink, webContentLink',
        supportsAllDrives=True,
    ).execute()

    # Make it readable by anyone with link (optional)
    try:
        service.permissions().create(
            fileId=file['id'],
            body={'type': 'anyone', 'role': 'reader'},
            supportsAllDrives=True,
        ).execute()
    except Exception:
        pass

    return {
        'drive_file_id': file['id'],
        'drive_url': file.get('webViewLink', ''),
    }


def delete_file(drive_file_id):
    service = _build_drive_service()
    try:
        service.files().delete(fileId=drive_file_id, supportsAllDrives=True).execute()
    except Exception:
        pass


def download_file(drive_file_id) -> bytes:
    """Download a file's raw bytes from Google Drive (for email attachments)."""
    from googleapiclient.http import MediaIoBaseDownload

    service = _build_drive_service()
    request = service.files().get_media(fileId=drive_file_id, supportsAllDrives=True)
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buf.getvalue()
