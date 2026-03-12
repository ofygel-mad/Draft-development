import csv
import re
import logging
from typing import Any

import phonenumbers

logger = logging.getLogger(__name__)


def _normalize_phone(phone: str) -> str:
    if not phone:
        return phone
    try:
        parsed = phonenumbers.parse(phone, 'KZ')
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except Exception:
        pass
    return re.sub(r'[\s\-\(\)\+]', '', phone)


class ImportProcessor:
    def __init__(self, job):
        self.job = job

    def run(self) -> dict[str, Any]:
        mapping = self.job.column_mapping
        if not mapping:
            raise ValueError('Column mapping is empty')

        ext = self.job.file_name.rsplit('.', 1)[-1].lower()
        if ext == 'csv':
            rows = self._read_csv()
        elif ext in ('xlsx', 'xls'):
            rows = self._read_excel()
        else:
            raise ValueError(f'Unsupported format: {ext}')

        if self.job.import_type == 'customer':
            return self._import_customers(rows, mapping)
        raise ValueError(f'Unknown import_type: {self.job.import_type}')

    def _read_csv(self) -> list[list[str]]:
        with open(self.job.file_path, encoding='utf-8-sig', newline='') as f:
            reader = csv.reader(f)
            rows = list(reader)
        return rows[1:] if rows else []

    def _read_excel(self) -> list[list[str]]:
        import openpyxl

        wb = openpyxl.load_workbook(self.job.file_path, read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
        return [[str(c) if c is not None else '' for c in row] for row in rows[1:]]

    def _import_customers(self, rows: list, mapping: dict) -> dict[str, Any]:
        from apps.customers.models import Customer
        from django.db.models import Q

        def _is_duplicate(org_id, phone, email):
            if not phone and not email:
                return False
            q = Q(organization_id=org_id)
            if phone:
                q &= Q(phone=phone)
            elif email:
                q &= Q(email=email)
            return Customer.objects.filter(q, deleted_at__isnull=True).exists()

        created = updated = 0
        errors = []

        preview = self.job.preview_json
        headers = preview.get('headers', [])
        index_mapping: dict[int, str] = {}
        for key, field in mapping.items():
            try:
                index_mapping[int(key)] = field
            except ValueError:
                if key in headers:
                    index_mapping[headers.index(key)] = field

        for row_idx, row in enumerate(rows):
            try:
                data: dict[str, str] = {}
                for col_idx, field in index_mapping.items():
                    if col_idx < len(row):
                        val = str(row[col_idx]).strip()
                        if val and val != 'None':
                            data[field] = val

                if data.get('phone'):
                    data['phone'] = _normalize_phone(data['phone'])

                if not data.get('full_name') and not data.get('phone'):
                    errors.append({'row': row_idx + 2, 'error': 'Нет имени и телефона'})
                    continue

                if _is_duplicate(self.job.organization_id, data.get('phone'), data.get('email')):
                    updated += 1
                    continue

                lookup = {}
                if data.get('phone'):
                    lookup['phone'] = data['phone']
                    lookup['organization'] = self.job.organization
                elif data.get('email'):
                    lookup['email'] = data['email']
                    lookup['organization'] = self.job.organization
                else:
                    Customer.objects.create(
                        organization=self.job.organization,
                        owner=self.job.created_by,
                        full_name=data.get('full_name', 'Без имени'),
                        email=data.get('email', ''),
                        company_name=data.get('company_name', ''),
                        source=data.get('source', 'import'),
                    )
                    created += 1
                    continue

                defaults = {
                    'full_name': data.get('full_name', 'Без имени'),
                    'email': data.get('email', ''),
                    'company_name': data.get('company_name', ''),
                    'source': data.get('source', 'import'),
                    'owner': self.job.created_by,
                }
                _, was_created = Customer.objects.update_or_create(defaults=defaults, **lookup)
                if was_created:
                    created += 1
                else:
                    updated += 1

            except Exception as exc:
                logger.warning('Import row %d error: %s', row_idx + 2, exc)
                errors.append({'row': row_idx + 2, 'error': str(exc)})

        return {'created': created, 'updated': updated, 'errors': errors[:100]}
