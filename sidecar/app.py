from __future__ import annotations

import sys
from pathlib import Path

from .core.activity_log import ActivityLog
from .core.artifacts import ArtifactManager
from .core.executor import ActionExecutor
from .core.models import ActionResult, ApprovalDecision, Plan, RunSummary
from .core.orchestrator import Orchestrator
from .core.permission_manager import PermissionManager
from .core.util import new_id, sidecar_home
from .core.workflows import WorkflowStore


def main() -> None:
    home = sidecar_home()
    sandbox = home / "sandbox"
    sandbox.mkdir(parents=True, exist_ok=True)
    _seed_sandbox(sandbox)

    log = ActivityLog()
    artifacts = ArtifactManager()
    workflows = WorkflowStore()
    orchestrator = Orchestrator()
    permissions = PermissionManager()
    executor = ActionExecutor(activity_log=log, artifacts=artifacts)

    print("Sidecar (skeleton). Type /help for commands.")
    while True:
        try:
            user_text = input("\nYou> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if not user_text:
            continue
        if user_text in {"/exit", "/quit"}:
            return
        if user_text == "/help":
            _print_help()
            continue
        if user_text == "/workflows":
            _print_workflows(workflows)
            continue
        if user_text.startswith("/run "):
            wf_id = user_text.split(" ", 1)[1].strip()
            wf = workflows.load(wf_id)
            if wf is None:
                print("No workflow found with that id.")
                continue
            _run_plan(wf.plan, permissions, executor, log, workflows)
            continue

        plan = orchestrator.build_plan(user_text=user_text, sandbox_root=sandbox)
        _run_plan(plan, permissions, executor, log, workflows)


def _run_plan(
    plan: Plan,
    permissions: PermissionManager,
    executor: ActionExecutor,
    log: ActivityLog,
    workflows: WorkflowStore,
) -> RunSummary:
    print()
    _print_plan(plan)
    log.write("plan_shown", {"plan_id": plan.plan_id, "summary": plan.summary, "impacted": plan.impacted_resources})

    context: dict = {"plan_id": plan.plan_id}
    results = []
    artifacts = []

    for step in plan.steps:
        if permissions.needs_approval(step):
            decision = _prompt_approval(step.title, step.risk.value)
            log.write("approval", {"step_id": step.step_id, "decision": decision.value})
            if not permissions.apply_decision(step, decision):
                log.write("step_skipped", {"step_id": step.step_id, "title": step.title, "risk": step.risk.value})
                print(f"- skipped: {step.title}")
                results.append(ActionResult(step_id=step.step_id, ok=False, message="Denied by user approval."))
                continue
        result, new_artifacts = executor.execute_step(step, context)
        results.append(result)
        artifacts.extend(new_artifacts)
        status = "ok" if result.ok else "fail"
        print(f"- {status}: {step.title} — {result.message}")
        if not result.ok and step.kind != "conversation.clarify":
            break

    summary = RunSummary(run_id=new_id("run"), plan_id=plan.plan_id, results=results, artifacts=artifacts)
    log.write("run_completed", {"run_id": summary.run_id, "plan_id": summary.plan_id})
    if artifacts:
        print("\nArtifacts:")
        for a in artifacts:
            print(f"- {a.title}: {a.path}")

    if _prompt_yes_no("\nSave this as a workflow? [y/N] "):
        name = input("Workflow name: ").strip() or "Untitled Workflow"
        desc = input("Description: ").strip()
        wf = workflows.save(name=name, description=desc, plan=plan)
        log.write("workflow_saved", {"workflow_id": wf.workflow_id, "name": wf.name})
        print(f"Saved workflow: {wf.workflow_id}")
    return summary


def _print_plan(plan: Plan) -> None:
    print("Plan:")
    print(f"- {plan.summary}")
    if plan.impacted_resources:
        print("Touches:")
        for r in plan.impacted_resources:
            print(f"- {r}")
    print("Steps:")
    for i, s in enumerate(plan.steps, start=1):
        print(f"{i}. [{s.risk.value}] {s.title} ({s.kind})")


def _prompt_approval(title: str, risk: str) -> ApprovalDecision:
    while True:
        raw = input(f"Approve step ({risk}) '{title}'? [y/N] ").strip().lower()
        if raw in {"y", "yes"}:
            return ApprovalDecision.APPROVE
        if raw in {"n", "no", ""}:
            return ApprovalDecision.DENY


def _prompt_yes_no(prompt: str) -> bool:
    return input(prompt).strip().lower() in {"y", "yes"}


def _print_workflows(store: WorkflowStore) -> None:
    wfs = store.list()
    if not wfs:
        print("No workflows saved.")
        return
    print("Workflows:")
    for wf in wfs:
        print(f"- {wf.workflow_id}: {wf.name} — {wf.description}")


def _seed_sandbox(sandbox: Path) -> None:
    samples = [
        "Invoice_Acme_2026-04.pdf",
        "Invoice_Contoso_2026-04.pdf",
        "Screenshot 2026-04-01 at 10.11.12.png",
        "Screenshot 2026-03-15 at 09.05.00.png",
        "notes.txt",
    ]
    for name in samples:
        p = sandbox / name
        if not p.exists():
            p.write_text("", encoding="utf-8")


def _print_help() -> None:
    print("Commands:")
    print("- /help: show commands")
    print("- /workflows: list saved workflows")
    print("- /run <workflow_id>: run a saved workflow")
    print("- /exit: quit")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
