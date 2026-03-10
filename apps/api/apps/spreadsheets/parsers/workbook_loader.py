from pathlib import Path

from openpyxl import load_workbook


SUPPORTED_EXTENSIONS = {".xlsx", ".xlsm", ".xltx", ".xltm"}


def load_workbook_from_path(file_path: str):
    path = Path(file_path)
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported workbook extension: {path.suffix}")
    return load_workbook(filename=file_path, data_only=False, read_only=False)
