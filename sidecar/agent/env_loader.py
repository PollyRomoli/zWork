"""Tiny .env loader used at backend startup. Optional, non-fatal."""

from __future__ import annotations

import os
from pathlib import Path


def load_dotenv(path: Path | None = None) -> dict[str, str]:
    """Read KEY=VALUE pairs from a .env file and populate os.environ
    if the keys aren't already set. Returns the dict that was loaded.
    Silently no-ops if the file is missing.
    """
    if path is None:
        # Walk up from CWD to find a .env
        cwd = Path.cwd()
        for candidate in [cwd, *cwd.parents]:
            p = candidate / ".env"
            if p.exists():
                path = p
                break
    if path is None or not path.exists():
        return {}

    loaded: dict[str, str] = {}
    try:
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            loaded[key] = val
            os.environ.setdefault(key, val)
    except OSError:
        return {}
    return loaded
