def detect_formulas(workbook) -> dict[str, int]:
    result: dict[str, int] = {}
    for sheet_name in workbook.sheetnames:
        sheet = workbook[sheet_name]
        formula_count = 0
        for row in sheet.iter_rows(min_row=1, max_row=sheet.max_row, min_col=1, max_col=sheet.max_column):
            formula_count += sum(1 for cell in row if isinstance(cell.value, str) and cell.value.startswith("="))
        result[sheet_name] = formula_count
    return result
