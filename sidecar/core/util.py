from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone
from pathlib import Path


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"


def sidecar_home() -> Path:
    root = Path(os.environ.get("SIDECAR_HOME", ".sidecar")).expanduser()
    root.mkdir(parents=True, exist_ok=True)
    return root
