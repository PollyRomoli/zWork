"""Discovery + lookup for agent skills.

Skills live under `<repo>/zWork-Skills/` and follow the Anthropic Skill
convention: each skill directory has a `SKILL.md` with YAML frontmatter at
the top (between `---` fences) containing at least `name` and `description`.

We walk the tree to find every SKILL.md, parse the frontmatter, and expose:
  - `list_skills()`  -> list of lightweight {name, description, path, slug}
  - `read_skill()`   -> full SKILL.md contents for a given slug

The agent sees the short list in its system prompt, and can call the
`read_skill` tool to load the full instructions on-demand.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from functools import lru_cache
from pathlib import Path
from typing import Any

from .home import skills_dir


@dataclass
class SkillMeta:
    slug: str            # unique local id (folder path, slash-joined)
    name: str            # display name
    description: str     # 1-line summary
    path: str            # absolute path to SKILL.md


# ----- Frontmatter parsing (lightweight; no pyyaml dependency) -----

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_frontmatter(text: str) -> dict[str, str]:
    """Minimal YAML-subset parser (key: value pairs, optional quotes)."""
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return {}
    out: dict[str, str] = {}
    current_key: str | None = None
    current_parts: list[str] = []
    for raw in m.group(1).splitlines():
        # Continuation line for multi-line value (indented)
        if current_key and (raw.startswith(" ") or raw.startswith("\t")):
            current_parts.append(raw.strip())
            continue
        if current_key:
            out[current_key] = " ".join(current_parts).strip().strip('"').strip("'")
            current_key = None
            current_parts = []

        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        k, _, v = line.partition(":")
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if v:
            out[k] = v
        else:
            current_key = k
            current_parts = []

    if current_key:
        out[current_key] = " ".join(current_parts).strip().strip('"').strip("'")
    return out


def _slug_for(root: Path, skill_md: Path) -> str:
    rel = skill_md.parent.relative_to(root)
    return str(rel).replace("\\", "/")


def _discover(root: Path) -> list[SkillMeta]:
    if not root.exists():
        return []
    out: list[SkillMeta] = []
    for md in sorted(root.rglob("SKILL.md")):
        try:
            text = md.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        fm = _parse_frontmatter(text)
        name = fm.get("name") or md.parent.name
        desc = fm.get("description") or _first_paragraph(text)
        out.append(
            SkillMeta(
                slug=_slug_for(root, md),
                name=name,
                description=_clip(desc, 280),
                path=str(md.resolve()),
            )
        )
    return out


def _first_paragraph(text: str) -> str:
    # Skip frontmatter if present
    m = _FRONTMATTER_RE.match(text)
    body = text[m.end():] if m else text
    # Strip leading headings and blank lines, grab first paragraph
    lines: list[str] = []
    for line in body.splitlines():
        s = line.strip()
        if s.startswith("#"):
            continue
        if not s:
            if lines:
                break
            else:
                continue
        lines.append(s)
        if sum(len(x) for x in lines) > 200:
            break
    return " ".join(lines)


def _clip(s: str, n: int) -> str:
    s = s.replace("\n", " ").strip()
    return s if len(s) <= n else s[: n - 1] + "…"


@lru_cache(maxsize=1)
def _cached_skills() -> tuple[SkillMeta, ...]:
    return tuple(_discover(skills_dir()))


def list_skills(*, refresh: bool = False) -> list[SkillMeta]:
    if refresh:
        _cached_skills.cache_clear()
    return list(_cached_skills())


def find_skill(slug: str) -> SkillMeta | None:
    slug_norm = slug.strip().strip("/").lower()
    for s in list_skills():
        if s.slug.lower() == slug_norm:
            return s
        # Tolerate callers passing just the leaf name.
        if s.slug.lower().endswith("/" + slug_norm) or s.slug.lower() == slug_norm:
            return s
        if Path(s.slug).name.lower() == slug_norm:
            return s
    return None


def read_skill(slug: str) -> str | None:
    meta = find_skill(slug)
    if not meta:
        return None
    try:
        return Path(meta.path).read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None


def as_dicts() -> list[dict[str, Any]]:
    return [asdict(s) for s in list_skills()]


def format_for_system_prompt(limit: int = 40) -> str:
    """A compact bullet list the LLM can scan during planning."""
    skills = list_skills()
    if not skills:
        return "(none installed)"
    lines = [f"- `{s.slug}` — {s.description}" for s in skills[:limit]]
    if len(skills) > limit:
        lines.append(f"- …and {len(skills) - limit} more")
    return "\n".join(lines)
