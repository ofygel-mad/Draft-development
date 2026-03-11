import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger('apps.core')


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        request = context.get('request')
        logger.warning(
            'API error %s: %s',
            response.status_code,
            str(exc),
            extra={
                'user_id': str(request.user.id) if request and request.user.is_authenticated else None,
                'path': request.path if request else None,
            },
        )
        detail = response.data.get('detail', response.data) if isinstance(response.data, dict) else response.data
        return Response({'error': True, 'status': response.status_code, 'detail': detail}, status=response.status_code)

    logger.exception('Unhandled exception in view', exc_info=exc)
    return Response(
        {'error': True, 'status': 500, 'detail': 'Внутренняя ошибка сервера'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


crm_exception_handler = custom_exception_handler
