from rest_framework.permissions import BasePermission
from django.core.cache import cache


ROLE_PERMS: dict[str, set[str]] = {
    'owner': {'*'},
    'admin': {
        'customers.*', 'deals.*', 'tasks.*', 'pipelines.*',
        'automations.*', 'reports.*', 'users.list', 'users.invite',
        'imports.*', 'audit.read', 'organizations.edit',
        'spreadsheets.*', 'bulk.*', 'presence.read', 'exports.*',
    },
    'manager': {
        'customers.read', 'customers.create', 'customers.update',
        'deals.read', 'deals.create', 'deals.update', 'deals.change_stage',
        'tasks.*', 'reports.basic', 'imports.upload', 'spreadsheets.read',
        'spreadsheets.upload', 'spreadsheets.map', 'spreadsheets.sync',
        'bulk.read', 'bulk.update', 'presence.read',
    },
    'viewer': {
        'customers.read', 'deals.read', 'tasks.read', 'reports.read', 'spreadsheets.read',
    },
}


def get_user_role(user) -> str:
    cache_key = f'user_role:{user.id}'
    cached = cache.get(cache_key)
    if cached:
        return cached

    from apps.users.models import OrganizationMembership

    m = OrganizationMembership.objects.filter(
        user=user, organization=user.organization,
    ).values_list('role', flat=True).first()
    role = m or 'viewer'
    cache.set(cache_key, role, timeout=300)
    return role


def get_user_capabilities(user) -> set[str]:
    if not user or not user.is_authenticated:
        return set()
    role = get_user_role(user)
    return ROLE_PERMS.get(role, set())


def user_can(user, permission: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    role = get_user_role(user)
    perms = ROLE_PERMS.get(role, set())
    if '*' in perms:
        return True
    entity = permission.split('.')[0]
    return permission in perms or f'{entity}.*' in perms


class HasRolePerm(BasePermission):
    """
    Usage:
        class MyViewSet(ModelViewSet):
            permission_classes = [IsAuthenticated, HasRolePerm]
            required_perm = 'customers.read'
    """

    def has_permission(self, request, view):
        perm = getattr(view, 'required_perm', None)
        if not perm:
            return request.user and request.user.is_authenticated
        return user_can(request.user, perm)


class IsOrgAdmin(BasePermission):
    """Разрешает доступ только owner и admin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_user_role(request.user)
        return role in ('owner', 'admin')


class IsOrgOwner(BasePermission):
    """Разрешает доступ только owner."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_user_role(request.user)
        return role == 'owner'


class HasAnyRolePerm(BasePermission):
    required_perms: tuple[str, ...] = ()

    def has_permission(self, request, view):
        perms = getattr(view, 'required_perms', self.required_perms)
        if not perms:
            return request.user and request.user.is_authenticated
        return any(user_can(request.user, perm) for perm in perms)
