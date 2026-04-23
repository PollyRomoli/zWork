import json
import tempfile
import unittest
from pathlib import Path

from sidecar.core.activity_log import ActivityLog
from sidecar.core.artifacts import ArtifactManager
from sidecar.core.executor import ActionExecutor
from sidecar.core.models import PlanStep, RiskCategory


class TestExecutorFileCleanup(unittest.TestCase):
    def test_preview_and_apply_moves(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "Invoice_Acme_2026-04.pdf").write_text("", encoding="utf-8")
            (root / "Screenshot 2026-04-01 at 10.11.12.png").write_text("", encoding="utf-8")

            log_path = root / "activity.jsonl"
            log = ActivityLog(path=log_path)
            artifacts = ArtifactManager(root=root / "artifacts")
            ex = ActionExecutor(activity_log=log, artifacts=artifacts)

            ctx = {}
            preview_step = PlanStep(
                step_id="s1",
                title="preview",
                risk=RiskCategory.SAFE,
                kind="fs.preview_cleanup",
                payload={"root": str(root)},
            )
            result, _ = ex.execute_step(preview_step, ctx)
            self.assertTrue(result.ok)
            self.assertIn("fs.cleanup_ops", ctx)
            self.assertGreaterEqual(len(ctx["fs.cleanup_ops"]), 1)

            apply_step = PlanStep(
                step_id="s2",
                title="apply",
                risk=RiskCategory.DESTRUCTIVE,
                kind="fs.apply_cleanup",
                payload={"root": str(root)},
            )
            result2, _ = ex.execute_step(apply_step, ctx)
            self.assertTrue(result2.ok)
            self.assertTrue((root / "Invoices" / "Invoice_Acme_2026-04.pdf").exists())

            lines = log_path.read_text(encoding="utf-8").strip().splitlines()
            self.assertGreaterEqual(len(lines), 2)
            json.loads(lines[0])


if __name__ == "__main__":
    unittest.main()
