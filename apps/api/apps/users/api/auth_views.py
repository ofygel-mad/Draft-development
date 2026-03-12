import secrets
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.core.cache import cache
from ..serializers import UserSerializer
from ..services.register import register_organization
from apps.organizations.serializers import OrganizationSerializer
from apps.core.permissions import get_user_role, IsOrgAdmin

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        data = request.data
        required = ['organization_name', 'full_name', 'email', 'password']
        for f in required:
            if not data.get(f):
                return Response({'detail': f'{f} обязательно'}, status=400)

        if len(data['password']) < 8:
            return Response({'detail': 'Пароль должен быть минимум 8 символов'}, status=400)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        if User.objects.filter(email=data['email'].lower().strip()).exists():
            return Response({'detail': 'Email уже зарегистрирован'}, status=400)

        user, org = register_organization(
            organization_name=data['organization_name'],
            full_name=data['full_name'],
            email=data['email'].lower().strip(),
            phone=data.get('phone', ''),
            password=data['password'],
            industry=data.get('industry', 'other'),
            company_size=data.get('company_size', '1_5'),
            mode=data.get('mode', 'basic'),
        )

        refresh = RefreshToken.for_user(user)
        caps = list(org.capabilities.filter(enabled=True).values_list('capability_code', flat=True))
        role = get_user_role(user)

        from apps.audit.services import log_action
        from apps.audit.models import AuditLog
        log_action(
            organization_id=org.id, actor_id=user.id,
            action=AuditLog.Action.LOGIN, entity_type='user',
            entity_id=user.id, entity_label=user.email, request=request,
        )

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'org': OrganizationSerializer(org).data,
            'capabilities': caps,
            'role': role,
        }, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        if not email or not password:
            return Response({'detail': 'Email и пароль обязательны'}, status=400)

        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'detail': 'Неверный email или пароль'}, status=401)

        if getattr(user, 'status', 'active') != 'active':
            return Response({'detail': 'Аккаунт деактивирован. Обратитесь к администратору'}, status=403)

        refresh = RefreshToken.for_user(user)
        org = user.organization
        caps = list(
            org.capabilities.filter(enabled=True).values_list('capability_code', flat=True)
        ) if org else []
        role = get_user_role(user) if org else 'viewer'

        from apps.audit.services import log_action
        from apps.audit.models import AuditLog
        if org:
            log_action(
                organization_id=org.id, actor_id=user.id,
                action=AuditLog.Action.LOGIN, entity_type='user',
                entity_id=user.id, entity_label=user.email, request=request,
            )

        daily = {}
        if org:
            try:
                from apps.tasks.models import Task
                from apps.deals.models import Deal
                from django.utils import timezone as tz

                now = tz.now()
                daily = {
                    'tasks_today': Task.objects.filter(
                        organization=org,
                        assigned_to=user,
                        status='open',
                        due_at__date=now.date(),
                    ).count(),
                    'overdue_tasks': Task.objects.filter(
                        organization=org,
                        assigned_to=user,
                        status='open',
                        due_at__lt=now,
                    ).count(),
                    'open_deals': Deal.objects.filter(
                        organization=org,
                        status='open',
                        deleted_at__isnull=True,
                    ).count(),
                }
            except Exception:
                pass

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'org': OrganizationSerializer(org).data if org else None,
            'capabilities': caps,
            'role': role,
            'onboarding_completed': org.onboarding_completed if org else False,
            'daily_summary': daily,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except TokenError:
            pass

        org = request.user.organization
        if org:
            from apps.audit.services import log_action
            from apps.audit.models import AuditLog
            log_action(
                organization_id=org.id, actor_id=request.user.id,
                action=AuditLog.Action.LOGOUT, entity_type='user',
                entity_id=request.user.id, entity_label=request.user.email,
                request=request,
            )

        return Response({'detail': 'Вы вышли из системы'})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        org = user.organization
        caps = list(
            org.capabilities.filter(enabled=True).values_list('capability_code', flat=True)
        ) if org else []
        role = get_user_role(user) if org else 'viewer'
        return Response({
            'user': UserSerializer(user).data,
            'org': OrganizationSerializer(org).data if org else None,
            'capabilities': caps,
            'mode': org.mode if org else 'basic',
            'role': role,
            'onboarding_completed': org.onboarding_completed if org else False,
        })

    def patch(self, request):
        """Обновление профиля текущего пользователя."""
        user = request.user
        allowed = ['full_name', 'phone', 'avatar_url']
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save(update_fields=[f for f in allowed if f in request.data])
        return Response(UserSerializer(user).data)


class InviteView(APIView):
    """Приглашение нового сотрудника в организацию."""
    permission_classes = [IsAuthenticated, IsOrgAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        role = request.data.get('role', 'manager')
        full_name = request.data.get('full_name', '')

        if not email:
            return Response({'detail': 'Email обязателен'}, status=400)
        if role not in ('admin', 'manager', 'viewer'):
            return Response({'detail': 'Недопустимая роль'}, status=400)

        org = request.user.organization
        if not org:
            return Response({'detail': 'Нет организации'}, status=400)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        from apps.users.models import OrganizationMembership

        existing = User.objects.filter(email=email).first()
        if existing:
            _, created = OrganizationMembership.objects.get_or_create(
                user=existing,
                organization=org,
                defaults={'role': role},
            )
            if not created:
                return Response({'detail': 'Пользователь уже в организации'}, status=400)

            from apps.notifications.models import Notification
            Notification.objects.create(
                organization=org,
                recipient=existing,
                title=f'Вас добавили в организацию «{org.name}»',
                body=f'Ваша роль: {role}',
                notification_type='system',
            )
            return Response({'detail': 'Пользователь добавлен в организацию', 'status': 'added'})

        token = secrets.token_urlsafe(32)
        cache_key = f'invite:{token}'
        cache.set(cache_key, {
            'email': email,
            'org_id': str(org.id),
            'role': role,
            'inviter_id': str(request.user.id),
            'full_name': full_name,
        }, timeout=7 * 24 * 3600)

        invite_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/auth/accept-invite?token={token}"

        if getattr(settings, 'EMAIL_HOST', ''):
            try:
                send_mail(
                    subject=f'Приглашение в CRM — {org.name}',
                    message=(
                        f'{request.user.full_name} приглашает вас в организацию «{org.name}».\n\n'
                        f'Перейдите по ссылке для регистрации:\n{invite_url}\n\n'
                        f'Ссылка действительна 7 дней.'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as exc:
                logger.warning('Failed to send invite email to %s: %s', email, exc)

        from apps.audit.services import log_action
        from apps.audit.models import AuditLog
        log_action(
            organization_id=org.id, actor_id=request.user.id,
            action=AuditLog.Action.CREATE, entity_type='invite',
            entity_label=email, request=request,
        )

        return Response({
            'detail': 'Приглашение отправлено',
            'invite_url': invite_url,
            'status': 'invited',
        }, status=201)


class AcceptInviteView(APIView):
    """Принятие приглашения новым пользователем."""
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token', '')
        password = request.data.get('password', '')
        full_name = request.data.get('full_name', '')

        if not token or not password:
            return Response({'detail': 'token и password обязательны'}, status=400)
        if len(password) < 8:
            return Response({'detail': 'Пароль минимум 8 символов'}, status=400)

        cache_key = f'invite:{token}'
        invite_data = cache.get(cache_key)
        if not invite_data:
            return Response({'detail': 'Ссылка недействительна или устарела'}, status=400)

        from django.contrib.auth import get_user_model
        from apps.organizations.models import Organization
        from apps.users.models import OrganizationMembership
        User = get_user_model()

        if User.objects.filter(email=invite_data['email']).exists():
            return Response({'detail': 'Email уже зарегистрирован'}, status=400)

        try:
            org = Organization.objects.get(id=invite_data['org_id'])
        except Organization.DoesNotExist:
            return Response({'detail': 'Организация не найдена'}, status=400)

        user = User.objects.create_user(
            email=invite_data['email'],
            password=password,
            full_name=full_name or invite_data.get('full_name', ''),
            organization=org,
        )
        OrganizationMembership.objects.create(
            user=user, organization=org, role=invite_data['role'],
        )
        cache.delete(cache_key)

        refresh = RefreshToken.for_user(user)
        caps = list(org.capabilities.filter(enabled=True).values_list('capability_code', flat=True))
        role = get_user_role(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'org': OrganizationSerializer(org).data,
            'capabilities': caps,
            'role': role,
            'onboarding_completed': True,
        }, status=201)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not old_password or not new_password:
            return Response({'detail': 'old_password и new_password обязательны'}, status=400)
        if len(new_password) < 8:
            return Response({'detail': 'Новый пароль минимум 8 символов'}, status=400)

        user = request.user
        if not user.check_password(old_password):
            return Response({'detail': 'Неверный текущий пароль'}, status=400)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Пароль успешно изменён'})
