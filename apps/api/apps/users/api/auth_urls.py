from django.urls import path
from .auth_views import (
    RegisterView, LoginView, LogoutView, MeView,
    InviteView, AcceptInviteView, ChangePasswordView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('invite/', InviteView.as_view(), name='auth-invite'),
    path('accept-invite/', AcceptInviteView.as_view(), name='auth-accept-invite'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
]
