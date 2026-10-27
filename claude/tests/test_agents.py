from pathlib import Path
import unittest


REPO = Path(__file__).resolve().parents[2]
AGENTS = REPO / "claude/plugin/agents"
SIDEKICKS = REPO / "home/.pi/agent/sidekicks"
NAMES = {"explorer", "researcher", "reviewer", "worker", "e2e-verifier"}


def definition(path):
    header, body = path.read_text().split("\n---\n", 1)
    fields = dict(line.split(": ", 1) for line in header.splitlines()[1:])
    return fields, body


class AgentTests(unittest.TestCase):
    def test_only_requested_roles_no_custom_general(self):
        self.assertEqual({p.stem for p in AGENTS.glob("*.md")}, NAMES)
        instructions = (REPO / "claude/CLAUDE.md").read_text()
        self.assertNotIn("my:general", instructions)

    def test_descriptions_and_prompts_match_sidekicks_verbatim(self):
        for name in sorted(NAMES):
            with self.subTest(name=name):
                source, source_body = definition(SIDEKICKS / f"{name}.md")
                target, target_body = definition(AGENTS / f"{name}.md")
                self.assertEqual(target["name"], source["name"])
                self.assertEqual(target["description"], source["description"])
                self.assertEqual(target_body, source_body)
        self.assertEqual(definition(AGENTS / "worker.md")[1], "")

    def test_no_tool_restrictions(self):
        for name in sorted(NAMES):
            with self.subTest(name=name):
                fields, _ = definition(AGENTS / f"{name}.md")
                self.assertFalse({"tools", "disallowedTools"} & set(fields))

if __name__ == "__main__":
    unittest.main()
