from django.urls import path
from .auth_views import (
    RegisterView, LoginView, LogoutView, MeView,
    InviteView, AcceptInviteView, ChangePasswordView, ForgotPasswordView, ResetPasswordView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('invite/', InviteView.as_view(), name='auth-invite'),
    path('accept-invite/', AcceptInviteView.as_view(), name='auth-accept-invite'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
]
