import tempfile
import unittest
from pathlib import Path

from sidecar.core.orchestrator import Orchestrator


class TestOrchestrator(unittest.TestCase):
    def test_builds_file_cleanup_plan(self) -> None:
        orch = Orchestrator()
        with tempfile.TemporaryDirectory() as d:
            plan = orch.build_plan("Clean up my Downloads", sandbox_root=Path(d))
        self.assertEqual(len(plan.steps), 3)
        self.assertEqual([s.kind for s in plan.steps], ["fs.scan", "fs.preview_cleanup", "fs.apply_cleanup"])

    def test_builds_summarize_tabs_plan(self) -> None:
        orch = Orchestrator()
        plan = orch.build_plan("Summarize my open tabs", sandbox_root=Path("."))
        self.assertEqual([s.kind for s in plan.steps], ["browser.list_tabs", "artifact.write_markdown"])


if __name__ == "__main__":
    unittest.main()
