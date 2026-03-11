from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from ..serializers import UserSerializer
from ..services.register import register_organization
from apps.organizations.serializers import OrganizationSerializer
from apps.core.permissions import get_user_role


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

        if len(data['password']) < 6:
            return Response({'detail': 'Пароль должен быть минимум 6 символов'}, status=400)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        if User.objects.filter(email=data['email']).exists():
            return Response({'detail': 'Email уже зарегистрирован'}, status=400)

        user, org = register_organization(
            organization_name=data['organization_name'],
            full_name=data['full_name'],
            email=data['email'],
            phone=data.get('phone', ''),
            password=data['password'],
            industry=data.get('industry', 'other'),
            company_size=data.get('company_size', '1_5'),
        )

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
        }, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'detail': 'Неверный email или пароль'}, status=401)

        refresh = RefreshToken.for_user(user)
        org = user.organization
        caps = list(org.capabilities.filter(enabled=True).values_list('capability_code', flat=True)) if org else []
        role = get_user_role(user) if org else 'viewer'
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'org': OrganizationSerializer(org).data if org else None,
            'capabilities': caps,
            'role': role,
        })


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        org = user.organization
        caps = list(org.capabilities.filter(enabled=True).values_list('capability_code', flat=True)) if org else []
        role = get_user_role(user) if org else 'viewer'
        return Response({
            'user': UserSerializer(user).data,
            'org': OrganizationSerializer(org).data if org else None,
            'capabilities': caps,
            'mode': org.mode if org else 'basic',
            'role': role,
        })
