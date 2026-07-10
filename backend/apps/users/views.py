from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer, CreateUserSerializer, LoginSerializer, GoogleAuthSerializer
from .permissions import IsAdmin, IsAdminOrReadOnly

GOOGLE_TOKEN_CLOCK_SKEW_SECONDS = 30


def _tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        # Soft delete - deactivate instead of delete
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    
    # Debug logging
    from django.db import connection
    from apps.users.models import User
    print(f"[DEBUG LOGIN] Attempting login for email: {email}")
    print(f"[DEBUG LOGIN] Database: {connection.settings_dict.get('NAME')} on host {connection.settings_dict.get('HOST')}")
    
    try:
        db_user = User.objects.get(email=email)
        print(f"[DEBUG LOGIN] User found in DB: {db_user.email}")
        print(f"[DEBUG LOGIN] User attributes: is_active={db_user.is_active}, is_staff={db_user.is_staff}, is_superuser={db_user.is_superuser}")
        pw_check = db_user.check_password(password)
        print(f"[DEBUG LOGIN] Password check: {pw_check}")
    except User.DoesNotExist:
        print(f"[DEBUG LOGIN] User NOT found in DB for email: {email}")
        print(f"[DEBUG LOGIN] Existing users in DB: {[u.email for u in User.objects.all()[:5]]}")
    
    user = authenticate(
        request,
        username=email,
        password=password,
    )
    print(f"[DEBUG LOGIN] Authenticate output: {user}")
    
    if user is None or not user.is_active:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    tokens = _tokens_for_user(user)
    return Response({**tokens, 'user': UserSerializer(user).data})


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login_view(request):
    """Verify a Google ID token and issue JWTs."""
    serializer = GoogleAuthSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    id_token_str = serializer.validated_data['id_token']

    try:
        from google.oauth2 import id_token as g_id_token
        from google.auth.transport import requests as g_requests
        id_info = g_id_token.verify_oauth2_token(
            id_token_str,
            g_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=GOOGLE_TOKEN_CLOCK_SKEW_SECONDS,
        )
    except Exception as e:
        return Response({'detail': f'Invalid Google token: {e}'}, status=status.HTTP_401_UNAUTHORIZED)

    email = id_info.get('email')
    google_id = id_info.get('sub')
    name = id_info.get('name', email)
    if not email:
        return Response({'detail': 'Email not in token'}, status=status.HTTP_400_BAD_REQUEST)

    # Only allow login if Admin has pre-created this user
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Account not found. Please contact Admin to create your account.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not user.is_active:
        return Response({'detail': 'Account is deactivated.'}, status=status.HTTP_403_FORBIDDEN)

    if not user.google_id:
        user.google_id = google_id
        user.save(update_fields=['google_id'])

    tokens = _tokens_for_user(user)
    return Response({**tokens, 'user': UserSerializer(user).data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)
