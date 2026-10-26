#!/usr/bin/env python3
"""Select or create a project workspace, then attach to the local Herdr session."""

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time


def api(command, arguments, environment):
    result = subprocess.run(
        [*command, *arguments], env=environment, capture_output=True, text=True,
        timeout=10,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    response = json.loads(result.stdout)
    if "error" in response:
        raise RuntimeError(str(response["error"]))
    return response


def snapshot(command, environment):
    return api(command, ["api", "snapshot"], environment)["result"]["snapshot"]


def ensure_server(command, environment, directory, session):
    sessions = api(command, ["session", "list", "--json"], environment)["sessions"]
    if any(item["name"] == session and item["running"] for item in sessions):
        return snapshot(command, environment)

    server = subprocess.Popen(
        [*command, "server"], cwd=directory, env=environment,
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL, start_new_session=True,
    )
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        try:
            return snapshot(command, environment)
        except (RuntimeError, subprocess.TimeoutExpired):
            if server.poll() is not None:
                raise RuntimeError(f"Herdr server exited with status {server.returncode}")
            time.sleep(0.1)
    raise RuntimeError("Herdr server did not become ready within 15 seconds")


def find_workspace(state, directory):
    for workspace in state["workspaces"]:
        checkout = (workspace.get("worktree") or {}).get("checkout_path")
        paths = [checkout, *[pane.get("cwd") for pane in state["panes"]
                             if pane["workspace_id"] == workspace["workspace_id"]]]
        if any(path and Path(path).resolve() == directory for path in paths):
            return workspace["workspace_id"]
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", default=".")
    parser.add_argument("--session", default="default")
    parser.add_argument("--select-only", action="store_true", help="Print the workspace ID without opening the TUI")
    args = parser.parse_args()
    directory = Path(args.directory).expanduser().resolve(strict=True)
    if not directory.is_dir():
        raise RuntimeError(f"Not a directory: {directory}")
    binary = shutil.which("herdr")
    if binary is None:
        raise RuntimeError("herdr is not on PATH")
    command = [binary, "--session", args.session]
    # A T3 server started in a Herdr pane can inherit a different session's sockets.
    inherited_context = {
        "HERDR_ENV", "HERDR_SESSION", "HERDR_SOCKET_PATH", "HERDR_CLIENT_SOCKET_PATH",
        "HERDR_WORKSPACE_ID", "HERDR_TAB_ID", "HERDR_PANE_ID", "HERDR_TERMINAL_ID",
        "HERDR_STARTUP_CWD",
    }
    environment = {key: value for key, value in os.environ.items()
                   if key not in inherited_context}
    cache = Path(os.environ.get("XDG_CACHE_HOME", str(Path.home() / ".cache")))
    locks = cache / "herdr-open-project"
    locks.mkdir(parents=True, exist_ok=True)
    session_key = hashlib.sha256(args.session.encode()).hexdigest()[:16]
    with (locks / f"{session_key}.lock").open("a") as lock:
        # Serialize selection and creation so repeated clicks do not create duplicates.
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = ensure_server(command, environment, directory, args.session)
        workspace_id = find_workspace(state, directory)
        if workspace_id:
            api(command, ["workspace", "focus", workspace_id], environment)
        else:
            created = api(command, ["workspace", "create", "--cwd", str(directory),
                                    "--label", directory.name or str(directory), "--focus"],
                          environment)
            workspace_id = created["result"]["workspace"]["workspace_id"]
    if args.select_only:
        print(workspace_id)
        return 0
    os.chdir(directory)
    os.execve(binary, command, environment)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(f"herdr-open-project: {error}", file=sys.stderr)
        raise SystemExit(1)
