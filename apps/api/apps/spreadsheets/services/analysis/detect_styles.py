def detect_style_stats(workbook) -> dict[str, dict]:
    stats = {}
    for sheet_name in workbook.sheetnames:
        sheet = workbook[sheet_name]
        non_default_styles = 0
        for row in sheet.iter_rows(min_row=1, max_row=sheet.max_row, min_col=1, max_col=sheet.max_column):
            non_default_styles += sum(1 for cell in row if cell.style_id != 0)
        stats[sheet_name] = {
            "non_default_style_cells": non_default_styles,
            "freeze_panes": str(sheet.freeze_panes) if sheet.freeze_panes else None,
            "has_auto_filter": bool(sheet.auto_filter and sheet.auto_filter.ref),
        }
    return stats
