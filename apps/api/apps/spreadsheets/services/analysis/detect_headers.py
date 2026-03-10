def detect_headers(workbook, *, max_scan_rows: int = 5) -> dict[str, dict]:
    headers_by_sheet: dict[str, dict] = {}
    for sheet_name in workbook.sheetnames:
        sheet = workbook[sheet_name]
        header_row = None
        header_values = []
        for row_index in range(1, min(sheet.max_row, max_scan_rows) + 1):
            values = [sheet.cell(row=row_index, column=col).value for col in range(1, sheet.max_column + 1)]
            text_values = [str(value).strip() for value in values if value not in (None, "")]
            if text_values:
                header_row = row_index
                header_values = text_values
                break
        headers_by_sheet[sheet_name] = {"header_row": header_row, "headers": header_values}
    return headers_by_sheet
