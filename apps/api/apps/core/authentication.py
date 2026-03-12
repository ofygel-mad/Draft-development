from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class QueryParamJWTAuthentication(JWTAuthentication):
    """Позволяет передавать JWT через query param ?token= (для SSE/EventSource)."""

    def get_header(self, request):
        token = request.query_params.get('token')
        if token:
            return f'Bearer {token}'.encode()
        return super().get_header(request)


class ApiTokenAuthentication(BaseAuthentication):
    """
    Authorization: Bearer crm_<token>
    Используется для партнёрских интеграций.
    """

    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() != b'bearer':
            return None

        raw = auth[1].decode() if len(auth) == 2 else ''
        if not raw.startswith('crm_'):
            return None

        from apps.core.api.api_tokens_views import ApiToken

        hashed = ApiToken.hash(raw)
        try:
            token = ApiToken.objects.select_related('organization').get(token_hash=hashed, is_active=True)
        except ApiToken.DoesNotExist:
            raise AuthenticationFailed('Недействительный API-токен')

        if token.is_expired():
            raise AuthenticationFailed('API-токен истёк')

        from django.utils import timezone

        ApiToken.objects.filter(id=token.id).update(last_used_at=timezone.now())

        from apps.users.models import OrganizationMembership

        membership = (
            OrganizationMembership.objects
            .filter(organization=token.organization, role='owner')
            .select_related('user')
            .first()
        )
        if not membership:
            raise AuthenticationFailed('Организация не найдена')

        membership.user._api_token = token
        return (membership.user, token)
