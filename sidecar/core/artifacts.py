from __future__ import annotations

from pathlib import Path

from .models import Artifact
from .util import new_id, now_iso, sidecar_home


class ArtifactManager:
    def __init__(self, root: Path | None = None) -> None:
        self._root = root or (sidecar_home() / "artifacts")
        self._root.mkdir(parents=True, exist_ok=True)

    def create_markdown(self, title: str, content: str) -> Artifact:
        artifact_id = new_id("artifact")
        path = self._root / f"{artifact_id}.md"
        path.write_text(content, encoding="utf-8")
        return Artifact(
            artifact_id=artifact_id,
            title=title,
            path=str(path),
            created_at_iso=now_iso(),
        )
