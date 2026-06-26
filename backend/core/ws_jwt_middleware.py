from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model

User = get_user_model()


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'websocket':
            qs = parse_qs(scope.get('query_string', b'').decode())
            token_str = qs.get('token', [None])[0]
            scope['user'] = await _get_user(token_str)
        return await self.inner(scope, receive, send)


async def _get_user(token_str):
    if not token_str:
        return AnonymousUser()
    try:
        token = AccessToken(token_str)
        return await _fetch_user(token['user_id'])
    except (InvalidToken, TokenError):
        return AnonymousUser()


async def _fetch_user(user_id):
    from channels.db import database_sync_to_async
    get = database_sync_to_async(User.objects.get)
    try:
        return await get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return AnonymousUser()
