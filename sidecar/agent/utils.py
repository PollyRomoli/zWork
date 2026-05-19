"""Shared utility functions for the sidecar agent."""

from __future__ import annotations

import secrets
import time
import uuid


def now_ms() -> int:
    return int(time.time() * 1000)


def uid() -> str:
    return uuid.uuid4().hex[:12]


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"
