from __future__ import annotations

from pathlib import Path

from .models import Plan, PlanStep, RiskCategory
from .util import new_id


class Orchestrator:
    def build_plan(self, user_text: str, sandbox_root: Path) -> Plan:
        t = user_text.strip().lower()
        if any(k in t for k in ["clean up", "cleanup", "downloads", "rename", "organize files"]):
            return self._plan_file_cleanup(sandbox_root)
        if "summarize" in t and ("tabs" in t or "open tabs" in t):
            return self._plan_summarize_tabs()
        if "fill" in t and "form" in t:
            return self._plan_fill_form_stop_before_submit()
        return Plan(
            plan_id=new_id("plan"),
            summary="Clarify the request before taking any actions.",
            impacted_resources=[],
            steps=[
                PlanStep(
                    step_id=new_id("step"),
                    title="Ask a clarifying question",
                    risk=RiskCategory.SAFE,
                    kind="conversation.clarify",
                    payload={
                        "question": "What outcome do you want, and which files/pages should I operate on?",
                    },
                )
            ],
        )

    def _plan_file_cleanup(self, sandbox_root: Path) -> Plan:
        return Plan(
            plan_id=new_id("plan"),
            summary="Preview and organize files in a sandbox folder (Downloads-like) by filename patterns.",
            impacted_resources=[f"folder:{sandbox_root}"],
            steps=[
                PlanStep(
                    step_id=new_id("step"),
                    title="Scan target folder",
                    risk=RiskCategory.SAFE,
                    kind="fs.scan",
                    payload={"root": str(sandbox_root)},
                ),
                PlanStep(
                    step_id=new_id("step"),
                    title="Generate preview of moves/renames",
                    risk=RiskCategory.SAFE,
                    kind="fs.preview_cleanup",
                    payload={"root": str(sandbox_root)},
                ),
                PlanStep(
                    step_id=new_id("step"),
                    title="Apply approved file operations",
                    risk=RiskCategory.DESTRUCTIVE,
                    kind="fs.apply_cleanup",
                    payload={"root": str(sandbox_root)},
                ),
            ],
        )

    def _plan_summarize_tabs(self) -> Plan:
        return Plan(
            plan_id=new_id("plan"),
            summary="Create a 1-page brief from selected sources (stubbed in this skeleton).",
            impacted_resources=["browser:tabs", "artifact:markdown"],
            steps=[
                PlanStep(
                    step_id=new_id("step"),
                    title="List open tabs",
                    risk=RiskCategory.SAFE,
                    kind="browser.list_tabs",
                    payload={},
                ),
                PlanStep(
                    step_id=new_id("step"),
                    title="Draft summary artifact",
                    risk=RiskCategory.SAFE,
                    kind="artifact.write_markdown",
                    payload={
                        "title": "Brief",
                        "template": "# Brief\n\nSources:\n{sources}\n\nSummary:\n{summary}\n",
                    },
                ),
            ],
        )

    def _plan_fill_form_stop_before_submit(self) -> Plan:
        return Plan(
            plan_id=new_id("plan"),
            summary="Assist with filling a form and stop before submission (stubbed in this skeleton).",
            impacted_resources=["browser:active_tab"],
            steps=[
                PlanStep(
                    step_id=new_id("step"),
                    title="Read the form structure",
                    risk=RiskCategory.SAFE,
                    kind="browser.read_form",
                    payload={},
                ),
                PlanStep(
                    step_id=new_id("step"),
                    title="Fill fields (no submission)",
                    risk=RiskCategory.SENSITIVE,
                    kind="browser.fill_form",
                    payload={},
                ),
                PlanStep(
                    step_id=new_id("step"),
                    title="Stop before submit and request approval",
                    risk=RiskCategory.DESTRUCTIVE,
                    kind="browser.stop_before_submit",
                    payload={},
                ),
            ],
        )
