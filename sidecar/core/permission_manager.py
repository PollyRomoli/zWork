from __future__ import annotations

from dataclasses import dataclass

from .models import ApprovalDecision, PlanStep, RiskCategory


@dataclass
class ApprovalPolicy:
    approve_safe_by_default: bool = True
    require_confirmation_for_sensitive: bool = True
    require_confirmation_for_destructive: bool = True


class PermissionManager:
    def __init__(self, policy: ApprovalPolicy | None = None) -> None:
        self._policy = policy or ApprovalPolicy()
        self._approve_all_safe = False

    def needs_approval(self, step: PlanStep) -> bool:
        if step.risk == RiskCategory.SAFE:
            if self._approve_all_safe:
                return False
            return not self._policy.approve_safe_by_default
        if step.risk == RiskCategory.SENSITIVE:
            return self._policy.require_confirmation_for_sensitive
        return self._policy.require_confirmation_for_destructive

    def apply_decision(self, step: PlanStep, decision: ApprovalDecision) -> bool:
        if decision == ApprovalDecision.APPROVE_ALL_SAFE and step.risk == RiskCategory.SAFE:
            self._approve_all_safe = True
            return True
        if decision == ApprovalDecision.APPROVE:
            return True
        return False
