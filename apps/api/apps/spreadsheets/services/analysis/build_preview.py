from django.conf import settings


def build_sheet_preview(sheet_name: str, headers: list[str], rows: list[list]) -> dict:
    preview_rows = []
    issues = []
    for row_idx, row in enumerate(rows[: settings.SPREADSHEET_MAX_PREVIEW_ROWS], start=1):
        rendered = {headers[col_idx] if col_idx < len(headers) else f'col_{col_idx+1}': value for col_idx, value in enumerate(row)}
        if not any(str(value).strip() for value in rendered.values()):
            issues.append({'row': row_idx, 'code': 'empty_row'})
        preview_rows.append(rendered)
    return {'sheet_name': sheet_name, 'headers': headers, 'rows': preview_rows, 'issues': issues}
