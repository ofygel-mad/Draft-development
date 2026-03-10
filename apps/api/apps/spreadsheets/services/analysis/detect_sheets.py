def detect_sheets(workbook) -> list[dict]:
    sheets = []
    for position, sheet_name in enumerate(workbook.sheetnames):
        sheet = workbook[sheet_name]
        sheets.append(
            {
                "name": sheet_name,
                "position": position,
                "max_row": sheet.max_row,
                "max_col": sheet.max_column,
            }
        )
    return sheets
