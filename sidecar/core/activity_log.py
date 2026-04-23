from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any

from .util import now_iso, sidecar_home


def _to_jsonable(obj: Any) -> Any:
    if is_dataclass(obj):
        return {k: _to_jsonable(v) for k, v in asdict(obj).items()}
    if isinstance(obj, dict):
        return {k: _to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_jsonable(v) for v in obj]
    return obj


class ActivityLog:
    def __init__(self, path: Path | None = None) -> None:
        self._path = path or sidecar_home() / "activity.jsonl"

    @property
    def path(self) -> Path:
        return self._path

    def write(self, event_type: str, payload: Any) -> None:
        record = {"ts": now_iso(), "type": event_type, "payload": _to_jsonable(payload)}
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False))
            f.write("\n")
