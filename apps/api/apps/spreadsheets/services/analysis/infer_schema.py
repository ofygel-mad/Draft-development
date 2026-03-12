from collections import Counter
import re

PHONE_RE = re.compile(r'\+?\d[\d\s\-\(\)]{7,}')
IIN_BIN_RE = re.compile(r'^\d{12}$')


def infer_column_type(values: list[str]) -> tuple[str, float, list[str]]:
    normalized = [str(v).strip() for v in values if str(v).strip()]
    warnings: list[str] = []
    if not normalized:
        return 'empty', 0.2, warnings
    hits = Counter()
    for value in normalized:
        if PHONE_RE.match(value):
            hits['phone'] += 1
        if IIN_BIN_RE.match(value):
            hits['iin_bin'] += 1
        if value.replace(' ', '').replace(',', '').isdigit():
            hits['number'] += 1
        if any(token in value.lower() for token in ['@', '.com', '.kz']):
            hits['emailish'] += 1
    guessed = hits.most_common(1)[0][0] if hits else 'string'
    confidence = round(hits[guessed] / max(len(normalized), 1), 2)
    if confidence < 0.60:
        warnings.append('low_type_confidence')
    return guessed, confidence, warnings


def build_mapping_suggestions(headers: list[str], samples_by_header: dict[str, list[str]]) -> list[dict]:
    suggestions = []
    aliases = {'phone': ('phone', 'телефон', 'номер', 'whatsapp'),'full_name': ('фио', 'имя', 'full name', 'клиент'),'company_name': ('company', 'компания', 'organization', 'организация'),'amount': ('сумма', 'amount', 'budget', 'price'),'iin_bin': ('бин', 'иин', 'iin', 'bin')}
    for header in headers:
        h = header.lower().strip()
        inferred_type, confidence, warnings = infer_column_type(samples_by_header.get(header, []))
        target_entity, target_field = 'customer', 'custom_field'
        for field, field_aliases in aliases.items():
            if any(alias in h for alias in field_aliases):
                target_field = field
                target_entity = 'deal' if field == 'amount' else 'customer'
                confidence = max(confidence, 0.87)
                break
        suggestions.append({'column_key': header,'target_entity': target_entity,'target_field': target_field,'confidence': confidence,'warnings': warnings,'sample_values': samples_by_header.get(header, [])[:5],'detected_type': inferred_type})
    return suggestions
