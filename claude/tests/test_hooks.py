import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


PLUGIN = Path(__file__).resolve().parents[1] / "plugin"
SPEC = importlib.util.spec_from_file_location("extra_context", PLUGIN / "scripts/extra-context.py")
CONTEXT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CONTEXT)


class HookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="claude hooks ")
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        self.cwd = self.home / "projects/app"
        self.cwd.mkdir(parents=True)
        self.env = {k: v for k, v in os.environ.items()
                    if not k.startswith(("CLAUDE", "ORCA", "EXTRA_CONTEXT", "OPENCODE", "XDG_CONFIG"))}
        self.env.update(HOME=str(self.home), CLAUDE_PLUGIN_ROOT=str(PLUGIN),
                        OPENCODE_CONFIG_DIR=str(self.home / "config"))
        self.config = self.home / "config"
        self.config.mkdir()
        self.hooks = json.loads((PLUGIN / "hooks/hooks.json").read_text())["hooks"]

    def run_context(self, event="SessionStart", source="startup"):
        command = self.hooks[event][-1]["hooks"][0]["command"]
        result = subprocess.run(command, shell=True, env=self.env, input=json.dumps({
            "hook_event_name": event, "cwd": str(self.cwd), "source": source,
            "agent_type": "my:worker",
        }), capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        if not result.stdout:
            return "", result.stderr
        output = json.loads(result.stdout)["hookSpecificOutput"]
        self.assertEqual(output["hookEventName"], event)
        return output["additionalContext"], result.stderr

    def write_mapping(self, filename="extra-context.json"):
        (self.config / "notes").mkdir(exist_ok=True)
        (self.config / "notes/a.md").write_text("MATCHED_SENTINEL")
        (self.config / "notes/.hidden.md").write_text("HIDDEN_SENTINEL")
        (self.config / "notes/z.md").write_text("LAST_SENTINEL")
        data = {"mappings": [{
            "selector": [str(self.home / "projects/{app,other}")],
            "instructions": ["notes/*.md", "notes/a.md"],
            "mcp": ["never-start-this-server"],
        }], "pi": {"mcpServers": {"never-start-this-server": {"command": "false"}}}}
        path = self.config / filename
        path.write_text(json.dumps(data))
        return path

    def test_no_config_adds_no_context(self):
        text, error = self.run_context()
        self.assertEqual(text, "")
        self.assertEqual(error, "")

    def test_session_and_subagents_receive_selected_context(self):
        self.write_mapping()
        for event, source in [("SessionStart", "startup"), ("SessionStart", "resume"),
                              ("SessionStart", "clear"), ("SessionStart", "compact"),
                              ("SessionStart", "fork"), ("SubagentStart", "startup")]:
            with self.subTest(event=event, source=source):
                text, error = self.run_context(event, source)
                self.assertEqual(text.count("MATCHED_SENTINEL"), 1)
                self.assertIn("HIDDEN_SENTINEL", text)
                self.assertLess(text.index("MATCHED_SENTINEL"), text.index("LAST_SENTINEL"))
                self.assertNotIn("never-start-this-server", text)
                self.assertEqual(error, "")

    def test_nonmatching_path_does_not_leak_context(self):
        self.write_mapping()
        self.cwd = self.home / "projects/unrelated"
        self.cwd.mkdir()
        text, error = self.run_context()
        self.assertNotIn("SENTINEL", text)
        self.assertEqual(error, "")

    def test_explicit_config_overrides_defaults(self):
        self.write_mapping()
        path = self.home / "explicit.json"
        path.write_text('{"mappings": []}')
        self.env["EXTRA_CONTEXT_CONFIG"] = str(path)
        text, _ = self.run_context()
        self.assertNotIn("MATCHED_SENTINEL", text)

    def test_git_root_is_used_from_subdirectories(self):
        self.write_mapping()
        subprocess.run(["git", "init", "-q", str(self.cwd)], check=True, capture_output=True)
        self.cwd = self.cwd / "nested"
        self.cwd.mkdir()
        text, _ = self.run_context()
        self.assertIn("MATCHED_SENTINEL", text)

    def test_invalid_config_warns_user(self):
        for content in ["{", '{"mappings": [{}]}', '{"mappings": [{"selector": "relative", "instructions": []}]}']:
            with self.subTest(content=content):
                (self.config / "extra-context.json").write_text(content)
                text, error = self.run_context()
                self.assertIn("extra-context:", error)
                self.assertIn("could not be loaded", text)

    def test_selectors_observe_directory_boundaries_and_hidden_paths(self):
        cases = [
            ("/work/va-*", "/work/va-web", True),
            ("/work/va-*", "/work/va-web/nested", False),
            ("/work/**/va-*", "/work/va-web", True),
            ("/work/**/va-*", "/work/.hidden/va-web", True),
            ("/work/{a,{b,c}}", "/work/c", True),
            ("/work/app[12]", "/work/app2", True),
            ("/work/app?", "/work/app1", True),
            ("/work/app", "/other/work/app", False),
        ]
        for pattern, value, expected in cases:
            with self.subTest(pattern=pattern, value=value):
                self.assertEqual(CONTEXT.matches(pattern, Path(value)), expected)

    def test_plugin_hooks_only_register_extra_context(self):
        self.assertEqual(set(self.hooks), {"SessionStart", "SubagentStart"})
        for groups in self.hooks.values():
            self.assertEqual(len(groups), 1)
            self.assertEqual(len(groups[0]["hooks"]), 1)
            self.assertIn("extra-context.py", groups[0]["hooks"][0]["command"])


if __name__ == "__main__":
    unittest.main()
