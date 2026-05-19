from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import login_view, google_login_view, me_view

urlpatterns = [
    path('login/', login_view),
    path('google/', google_login_view),
    path('me/', me_view),
    path('refresh/', TokenRefreshView.as_view()),
]
