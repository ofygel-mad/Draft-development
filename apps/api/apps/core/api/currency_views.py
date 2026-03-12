import logging
from defusedxml import ElementTree as ET

import requests
from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

NBKZ_URL = 'https://nationalbank.kz/rss/get_rates.cfm?fdate={date}'
CACHE_TTL = 3600


def _fetch_nbkz_rates(date_str: str) -> dict:
    cache_key = f'nbkz_rates:{date_str}'
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        response = requests.get(NBKZ_URL.format(date=date_str), timeout=8)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        rates: dict[str, float] = {'KZT': 1.0}
        for item in root.findall('.//item'):
            code = item.findtext('title', '').strip()
            quant = float(item.findtext('quant', '1') or 1)
            value = float(item.findtext('description', '0').replace(',', '.') or 0)
            if code and value:
                rates[code] = round(value / quant, 4)

        cache.set(cache_key, rates, timeout=CACHE_TTL)
        return rates
    except Exception as exc:
        logger.warning('NBK rates fetch failed: %s', exc)
        return {'KZT': 1.0, 'USD': 450.0, 'EUR': 490.0, 'RUB': 5.0}


class ExchangeRatesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone

        date_str = timezone.now().strftime('%d.%m.%Y')
        rates = _fetch_nbkz_rates(date_str)
        return Response({'base': 'KZT', 'rates': rates, 'date': date_str})


def convert_to_kzt(amount: float, currency: str) -> float:
    if currency == 'KZT':
        return amount

    from django.utils import timezone

    rates = _fetch_nbkz_rates(timezone.now().strftime('%d.%m.%Y'))
    rate = rates.get(currency, 1.0)
    return round(amount * rate, 2)
