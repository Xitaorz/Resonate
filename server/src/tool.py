from __future__ import annotations

from pathlib import Path
from typing import Union

# Project root is the parent of the src/ directory (where this file lives)
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def resolve_path(path_like: Union[str, Path]) -> Path:
    """Return an absolute path anchored at the project root when needed."""
    path = Path(path_like)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def read_text(path_like: Union[str, Path]) -> str:
    """Read a text file using UTF-8 regardless of current working directory."""
    path = resolve_path(path_like)
    return path.read_text(encoding="utf-8")


def load_sql(path_like: Union[str, Path]) -> str:
    """Read a SQL file; append .sql suffix when omitted."""
    path = Path(path_like)
    if not path.suffix:
        path = path.with_suffix(".sql")
    return read_text(path)
