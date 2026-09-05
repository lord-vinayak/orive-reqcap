from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')


class AuditorReadOnlyMiddleware:
    """Blocks every non-safe method under /api/ for role='auditor'.

    Runs independently of each view's own permission_classes (many override
    the project defaults entirely), so this is the one place that guarantees
    the role is read-only everywhere, including future endpoints.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()

    def __call__(self, request):
        if request.path.startswith('/api/') and request.method not in SAFE_METHODS:
            try:
                auth_result = self.jwt_auth.authenticate(request)
            except Exception:
                auth_result = None
            if auth_result is not None:
                user, _ = auth_result
                if getattr(user, 'role', None) == 'auditor':
                    return JsonResponse({'detail': 'Auditor accounts are read-only.'}, status=403)
        return self.get_response(request)
