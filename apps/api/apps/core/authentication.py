from rest_framework_simplejwt.authentication import JWTAuthentication


class QueryParamJWTAuthentication(JWTAuthentication):
    """Позволяет передавать JWT через query param ?token= (для SSE/EventSource)."""

    def get_header(self, request):
        token = request.query_params.get('token')
        if token:
            return f'Bearer {token}'.encode()
        return super().get_header(request)
