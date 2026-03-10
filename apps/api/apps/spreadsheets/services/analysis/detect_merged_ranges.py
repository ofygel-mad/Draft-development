def detect_merged_ranges(workbook) -> dict[str, list[str]]:
    return {sheet_name: [str(cell_range) for cell_range in workbook[sheet_name].merged_cells.ranges] for sheet_name in workbook.sheetnames}
