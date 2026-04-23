from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class RiskCategory(str, Enum):
    SAFE = "safe"
    SENSITIVE = "sensitive"
    DESTRUCTIVE = "destructive"


@dataclass(frozen=True)
class ChatMessage:
    role: str
    content: str


@dataclass(frozen=True)
class PlanStep:
    step_id: str
    title: str
    risk: RiskCategory
    kind: str
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Plan:
    plan_id: str
    summary: str
    steps: list[PlanStep]
    impacted_resources: list[str] = field(default_factory=list)


class ApprovalDecision(str, Enum):
    APPROVE = "approve"
    DENY = "deny"
    APPROVE_ALL_SAFE = "approve_all_safe"


@dataclass(frozen=True)
class ActionResult:
    step_id: str
    ok: bool
    message: str
    data: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Artifact:
    artifact_id: str
    title: str
    path: str
    created_at_iso: str


@dataclass(frozen=True)
class Workflow:
    workflow_id: str
    name: str
    description: str
    plan: Plan
    created_at_iso: str


@dataclass(frozen=True)
class RunSummary:
    run_id: str
    plan_id: str
    results: list[ActionResult]
    artifacts: list[Artifact]
