import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


REPO = Path(__file__).resolve().parents[2]
SYNC = REPO / "bin/sync-claude"


def snapshot(root):
    return {str(p.relative_to(root)): (
        ("link", os.readlink(p)) if p.is_symlink() else
        ("file", p.read_bytes(), p.stat().st_mode) if p.is_file() else ("dir",)
    ) for p in root.rglob("*")}


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="sync-claude-test-")
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        self.personal = self.home / ".claude"
        self.work = self.home / ".claude-profiles/work"
        for profile in (self.personal, self.work):
            (profile / "skills/synced").mkdir(parents=True)
            (profile / "skills/synced/account.txt").write_text(profile.name)
            (profile / "settings.json").write_text(json.dumps({
                "model": profile.name, "theme": "dark", "enabledPlugins": {"other@market": True},
            }))
            (profile / ".credentials.json").write_text("opaque credentials")
            (profile / "projects/project").mkdir(parents=True)
            (profile / "projects/project/session.jsonl").write_text("session")

    def run_sync(self, *args):
        return subprocess.run([sys.executable, str(SYNC), "--home", str(self.home), *args],
                              capture_output=True, text=True, timeout=10)

    def test_check_never_writes_and_apply_is_idempotent(self):
        before = snapshot(self.home)
        check = self.run_sync("--check")
        self.assertEqual(check.returncode, 1, check.stderr)
        self.assertEqual(snapshot(self.home), before)
        applied = self.run_sync("--apply")
        self.assertEqual(applied.returncode, 0, applied.stderr)
        for profile in (self.personal, self.work):
            self.assertEqual((profile / "skills/my").resolve(), REPO / "claude/plugin")
            self.assertEqual((profile / "CLAUDE.md").resolve(), REPO / "claude/CLAUDE.md")
            self.assertEqual((profile / "statusline-command.sh").resolve(), REPO / "claude/statusline-command.sh")
            data = json.loads((profile / "settings.json").read_text())
            self.assertEqual(data["model"], profile.name)
            self.assertEqual(data["theme"], "dark")
            self.assertTrue(data["enabledPlugins"]["other@market"])
            self.assertTrue(data["enabledPlugins"]["my@skills-dir"])
            self.assertIs(data["autoMemoryEnabled"], False)
            self.assertEqual((profile / "settings.json").stat().st_mode & 0o777, 0o600)
        for name, value in before.items():
            if value[0] == "file" and not name.endswith("settings.json"):
                self.assertEqual(snapshot(self.home)[name], value)
        after = snapshot(self.home)
        self.assertEqual(self.run_sync("--check").returncode, 0)
        self.assertEqual(self.run_sync("--apply").returncode, 0)
        self.assertEqual(snapshot(self.home), after)

    def test_all_profiles_preflight_before_writes(self):
        (self.work / "CLAUDE.md").write_text("user instructions")
        before = snapshot(self.home)
        result = self.run_sync("--apply")
        self.assertEqual(result.returncode, 2)
        self.assertIn("Conflicting", result.stderr)
        self.assertEqual(snapshot(self.home), before)

    def test_invalid_json_preflight(self):
        (self.work / "settings.json").write_text("{")
        before = snapshot(self.home)
        self.assertEqual(self.run_sync("--apply").returncode, 2)
        self.assertEqual(snapshot(self.home), before)

    def test_settings_symlink_is_detached_without_modifying_target(self):
        path = self.personal / "settings.json"
        target = self.home / "tracked-settings.json"
        path.rename(target)
        original = target.read_bytes()
        path.symlink_to(target)
        result = self.run_sync("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(path.is_symlink())
        self.assertEqual(target.read_bytes(), original)

    def test_symlinked_skills_or_profile_is_refused(self):
        skills = self.work / "skills"
        external = self.home / "shared-skills"
        skills.rename(external)
        skills.symlink_to(external)
        before = snapshot(self.home)
        self.assertEqual(self.run_sync("--apply").returncode, 2)
        self.assertEqual(snapshot(self.home), before)
        skills.unlink()
        external.rename(skills)
        self.work.rename(self.home / "external-profile")
        self.work.symlink_to(self.home / "external-profile")
        before = snapshot(self.home)
        self.assertEqual(self.run_sync("--apply").returncode, 2)
        self.assertEqual(snapshot(self.home), before)

    def test_conflicting_plugin_link_is_refused(self):
        (self.work / "skills/my").symlink_to(self.home / "another-plugin")
        before = snapshot(self.home)
        self.assertEqual(self.run_sync("--apply").returncode, 2)
        self.assertEqual(snapshot(self.home), before)

    def test_orca_is_copied_from_primary_preserving_other_hooks(self):
        path = self.personal / "settings.json"
        data = json.loads(path.read_text())
        primary_only = {"type": "command", "command": "echo primary only"}
        orca = {"type": "command", "command": 'sh "$HOME/.orca/agent-hooks/claude-hook.sh"',
                "timeout": 10, "async": True}
        data["hooks"] = {"SessionStart": [{"matcher": "startup|resume", "hooks": [orca, primary_only]}]}
        path.write_text(json.dumps(data))
        source_bytes = path.read_bytes()
        target = self.work / "settings.json"
        settings = json.loads(target.read_text())
        other = {"type": "command", "command": "echo work only"}
        stale = {"type": "command", "command": 'sh "$HOME/.orca/agent-hooks/claude-hook.cmd"'}
        settings["hooks"] = {"SessionStart": [{"matcher": "startup", "hooks": [stale, other]}],
                             "Stop": [{"hooks": []}]}
        target.write_text(json.dumps(settings))
        before = snapshot(self.home)
        self.assertEqual(self.run_sync("--check", "--profile", "work").returncode, 1)
        self.assertEqual(snapshot(self.home), before)
        result = self.run_sync("--apply", "--profile", "work")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(path.read_bytes(), source_bytes)
        updated = json.loads(target.read_text())
        self.assertEqual(updated["hooks"], {
            "SessionStart": [{"matcher": "startup", "hooks": [other]},
                             {"matcher": "startup|resume", "hooks": [orca]}],
            "Stop": [{"hooks": []}],
        })
        self.assertEqual(updated["model"], "work")
        after = snapshot(self.home)
        self.assertEqual(self.run_sync("--check", "--profile", "work").returncode, 0)
        self.assertEqual(self.run_sync("--apply", "--profile", "work").returncode, 0)
        self.assertEqual(snapshot(self.home), after)

    def test_orca_updates_and_removals_follow_primary(self):
        source = self.personal / "settings.json"
        for event in ("Stop", "SessionStart", None):
            with self.subTest(event=event):
                data = json.loads(source.read_text())
                expected = {} if event is None else {event: [{"hooks": [{
                    "type": "command", "command": f'sh "$HOME/.orca/agent-hooks/claude-hook.sh" {event}',
                }]}]}
                data["hooks"] = expected
                source.write_text(json.dumps(data))
                result = self.run_sync("--apply")
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(json.loads(source.read_text())["hooks"], expected)
                self.assertEqual(json.loads((self.work / "settings.json").read_text()).get("hooks", {}), expected)
                self.assertEqual(self.run_sync("--check").returncode, 0)

    def test_missing_primary_does_not_erase_target_orca(self):
        (self.personal / "settings.json").unlink()
        target = self.work / "settings.json"
        data = json.loads(target.read_text())
        hooks = {"Stop": [{"hooks": [{"type": "command", "command":
                  'sh "$HOME/.orca/agent-hooks/claude-hook.sh"'}]}]}
        data["hooks"] = hooks
        target.write_text(json.dumps(data))
        result = self.run_sync("--apply", "--profile", "work")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(target.read_text())["hooks"], hooks)

    def test_invalid_orca_source_aborts_even_when_only_work_is_selected(self):
        source = self.personal / "settings.json"
        source.write_text('{"hooks": {"Stop": "invalid"}}')
        before = snapshot(self.home)
        result = self.run_sync("--apply", "--profile", "work")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(snapshot(self.home), before)

    def test_memory_cleanup_requires_explicit_flag_and_keeps_sessions(self):
        for profile in (self.personal, self.work):
            (profile / "projects/project/memory").mkdir()
            (profile / "projects/project/memory/MEMORY.md").write_text("private memory")
            (profile / "agent-memory/worker").mkdir(parents=True)
            (profile / "agent-memory/worker/MEMORY.md").write_text("agent memory")
        self.assertEqual(self.run_sync("--apply").returncode, 0)
        before = snapshot(self.home)
        self.assertEqual(self.run_sync("--check", "--clear-memory").returncode, 1)
        self.assertEqual(snapshot(self.home), before)
        result = self.run_sync("--apply", "--clear-memory")
        self.assertEqual(result.returncode, 0, result.stderr)
        for profile in (self.personal, self.work):
            self.assertFalse((profile / "projects/project/memory").exists())
            self.assertFalse((profile / "agent-memory").exists())
            self.assertEqual((profile / "projects/project/session.jsonl").read_text(), "session")

    def test_memory_cleanup_refuses_external_links(self):
        external = self.home / "external-memory"
        external.mkdir()
        (external / "MEMORY.md").write_text("keep")
        (self.work / "projects/project/memory").symlink_to(external)
        before = snapshot(self.home)
        self.assertEqual(self.run_sync("--apply", "--clear-memory").returncode, 2)
        self.assertEqual(snapshot(self.home), before)

    def test_named_profile_is_opt_in_and_name_is_validated(self):
        result = self.run_sync("--apply", "--profile", "new")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.home / ".claude-profiles/new/skills/my").is_symlink())
        self.assertFalse((self.personal / "skills/my").exists())
        before = snapshot(self.home)
        self.assertEqual(self.run_sync("--apply", "--profile", "../escape").returncode, 2)
        self.assertEqual(snapshot(self.home), before)


if __name__ == "__main__":
    unittest.main()
