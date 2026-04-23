from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from .models import Plan, PlanStep, RiskCategory, Workflow
from .util import new_id, now_iso, sidecar_home


class WorkflowStore:
    def __init__(self, root: Path | None = None) -> None:
        self._root = root or (sidecar_home() / "workflows")
        self._root.mkdir(parents=True, exist_ok=True)

    def save(self, name: str, description: str, plan: Plan) -> Workflow:
        workflow = Workflow(
            workflow_id=new_id("wf"),
            name=name,
            description=description,
            plan=plan,
            created_at_iso=now_iso(),
        )
        path = self._root / f"{workflow.workflow_id}.json"
        path.write_text(json.dumps(_serialize_workflow(workflow), ensure_ascii=False, indent=2), encoding="utf-8")
        return workflow

    def list(self) -> list[Workflow]:
        workflows: list[Workflow] = []
        for p in sorted(self._root.glob("wf_*.json")):
            workflows.append(_deserialize_workflow(json.loads(p.read_text(encoding="utf-8"))))
        return workflows

    def load(self, workflow_id: str) -> Workflow | None:
        path = self._root / f"{workflow_id}.json"
        if not path.exists():
            return None
        return _deserialize_workflow(json.loads(path.read_text(encoding="utf-8")))


def _serialize_workflow(wf: Workflow) -> dict:
    d = asdict(wf)
    d["plan"]["steps"] = [asdict(s) for s in wf.plan.steps]
    return d


def _deserialize_workflow(d: dict) -> Workflow:
    plan_d = d["plan"]
    steps = [
        PlanStep(
            step_id=s["step_id"],
            title=s["title"],
            risk=RiskCategory(s["risk"]),
            kind=s["kind"],
            payload=s.get("payload") or {},
        )
        for s in plan_d["steps"]
    ]
    plan = Plan(
        plan_id=plan_d["plan_id"],
        summary=plan_d["summary"],
        steps=steps,
        impacted_resources=plan_d.get("impacted_resources") or [],
    )
    return Workflow(
        workflow_id=d["workflow_id"],
        name=d["name"],
        description=d["description"],
        plan=plan,
        created_at_iso=d["created_at_iso"],
    )
