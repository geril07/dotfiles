#!/usr/bin/env python3
"""Exercise real Claude plugin loading against a temporary home and local HTTP sink."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
import time


REPO = Path(__file__).resolve().parents[2]


def main():
    binary = shutil.which("claude")
    if not binary:
        raise SystemExit("claude is not installed")
    with tempfile.TemporaryDirectory(prefix="claude-plugin-probe-") as temporary:
        home = Path(temporary)
        project = home / "project"
        project.mkdir()
        (home / ".config").mkdir()
        (home / ".config/opencode").symlink_to(REPO / ".config/opencode")
        context = home / "context"
        context.mkdir()
        (context / "note.md").write_text("EXTRA_CONTEXT_PROBE_SENTINEL")
        (context / "extra-context.json").write_text(json.dumps({"mappings": [{
            "selector": str(project), "instructions": ["note.md"],
        }]}))
        environment = {k: v for k, v in os.environ.items()
                       if not k.startswith(("CLAUDE", "ANTHROPIC", "ORCA", "EXTRA_CONTEXT", "OPENCODE", "XDG_"))}
        environment.update(
            HOME=str(home), CLAUDE_CONFIG_DIR=str(home / ".claude"),
            ANTHROPIC_API_KEY="local-probe-not-a-real-key",
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1",
            DISABLE_AUTOUPDATER="1", OPENCODE_CONFIG_DIR=str(context),
            PYTHONDONTWRITEBYTECODE="1",
        )
        result = subprocess.run(
            [sys.executable, str(REPO / "bin/sync-claude"), "--home", str(home), "--apply"],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode:
            raise RuntimeError(result.stderr)
        print(result.stdout.strip())
        validation = subprocess.run(
            [binary, "plugin", "validate", str(REPO / "claude/plugin")],
            cwd=project, env=environment, capture_output=True, text=True, timeout=15,
        )
        print("Manifest validation:", validation.returncode, validation.stdout.strip(), validation.stderr.strip())
        if validation.returncode:
            raise RuntimeError("Plugin validation failed")

        requests = queue.Queue()
        events = queue.Queue()

        class Sink(BaseHTTPRequestHandler):
            def do_POST(self):
                body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
                requests.put((self.path, body.decode()))
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"type":"error","error":{"type":"invalid_request_error","message":"Local probe: no model is connected"}}')

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Sink)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        environment["ANTHROPIC_BASE_URL"] = f"http://127.0.0.1:{server.server_port}"
        command = [binary, "-p", "Reply OK", "--output-format", "stream-json", "--verbose",
                   "--no-session-persistence", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
                   "--setting-sources", "user", "--tools", ""]
        process = subprocess.Popen(command, cwd=project, env=environment, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, text=True)

        def collect():
            for line in process.stdout:
                try:
                    events.put(json.loads(line))
                except ValueError:
                    pass

        reader = threading.Thread(target=collect, daemon=True)
        reader.start()
        init, request = None, None
        try:
            deadline = time.monotonic() + 25
            while time.monotonic() < deadline and (init is None or request is None):
                try:
                    item = events.get(timeout=0.1)
                    if item.get("subtype") == "init":
                        init = item
                except queue.Empty:
                    pass
                try:
                    candidate = requests.get_nowait()
                    if "/messages" in candidate[0]:
                        request = candidate
                except queue.Empty:
                    pass
                if process.poll() is not None and events.empty() and requests.empty():
                    break
        finally:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)
            reader.join(timeout=5)
            server.shutdown()
            server.server_close()
        if init is None:
            raise RuntimeError("No Claude init event: " + process.stderr.read()[-2000:])
        plugin = next((p for p in init["plugins"] if p["name"] == "my"), None)
        assert plugin and plugin["source"] == "my@skills-dir", init["plugins"]
        expected_agents = {"my:" + p.stem for p in (REPO / "claude/plugin/agents").glob("*.md")}
        assert expected_agents.issubset(init["agents"]), init["agents"]
        assert "my:general" not in init["agents"], init["agents"]
        assert "general-purpose" in init["agents"], init["agents"]
        assert "my:find-docs" in init["skills"], init["skills"]
        assert not init["mcp_servers"], init["mcp_servers"]
        assert request is not None, "Claude did not reach the local HTTP sink"
        assert "EXTRA_CONTEXT_PROBE_SENTINEL" in request[1], "SessionStart context absent from request"
        assert "my:worker" in request[1], "Claude CLAUDE.md absent from request"
        assert "geril-guidelines" in request[1], "Imported global AGENTS.md absent from request"
        print("Claude Code:", init["claude_code_version"])
        print("Plugin:", plugin["source"])
        print("Skills:", len([s for s in init["skills"] if s.startswith("my:")]), "under my:")
        print("Agents:", ", ".join(sorted(expected_agents)))
        print("SessionStart: selected extra context reached the local messages endpoint")
        print("CLAUDE.md: loaded through the profile link, AGENTS.md through @import")
        print("MCP: none started; external model API: not used")
        print("PASS (model execution and real Orca UI are outside this probe)")
        process.stdout.close()
        process.stderr.close()


if __name__ == "__main__":
    main()
