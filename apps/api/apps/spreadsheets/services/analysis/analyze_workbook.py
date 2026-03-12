from .detect_headers import detect_headers
from .infer_schema import build_mapping_suggestions
from .build_preview import build_sheet_preview


def analyze_workbook(workbook):
    sheets = []
    mapping_suggestions = []
    for worksheet in workbook.worksheets:
        rows = list(worksheet.iter_rows(values_only=True))
        headers = detect_headers(rows)
        data_rows = rows[1: min(len(rows), 51)]
        samples_by_header = {header: [str(row[idx]) for row in data_rows if idx < len(row) and row[idx] is not None] for idx, header in enumerate(headers)}
        sheets.append(build_sheet_preview(worksheet.title, headers, data_rows))
        mapping_suggestions.extend(build_mapping_suggestions(headers, samples_by_header))
    avg_confidence = round(sum(item['confidence'] for item in mapping_suggestions) / len(mapping_suggestions), 2) if mapping_suggestions else 0
    return {'sheets': sheets, 'mapping_suggestions': mapping_suggestions, 'analysis_confidence': avg_confidence}
