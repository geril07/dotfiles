#!/usr/bin/env python3
"""Open or create the workspace for a directory, then attach to the local Herdr session.

Workspaces are matched by Git checkout root, so launching from a subdirectory
reuses the project workspace. A linked Git worktree opens as a grouped child of
its parent repository workspace, and that parent workspace is created when it
is closed.
"""

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


def git_output(arguments, directory):
    try:
        result = subprocess.run(
            ["git", *arguments], cwd=directory, capture_output=True, text=True, timeout=10,
        )
    except OSError:
        return None
    if result.returncode:
        return None
    return result.stdout


def checkout_for(directory):
    """Return the Git checkout of a directory, including its linked-worktree parent."""
    toplevel = git_output(["rev-parse", "--show-toplevel"], directory)
    if not toplevel:
        return None
    root = Path(toplevel.strip()).resolve()
    primary = None
    for line in (git_output(["worktree", "list", "--porcelain"], root) or "").splitlines():
        if line.startswith("worktree "):
            primary = Path(line[len("worktree "):]).resolve()
            break
    return {"root": root, "primary": primary, "linked": primary is not None and primary != root}


def repo_root(path, cache):
    if path not in cache:
        value = None
        if os.path.isdir(path):
            toplevel = git_output(["rev-parse", "--show-toplevel"], path)
            value = Path(toplevel.strip()).resolve() if toplevel else None
        cache[path] = value or Path(path).resolve(strict=False)
    return cache[path]


def find_workspace(state, directory, checkout):
    """Find the workspace for the directory's checkout root, not its exact path.

    A linked worktree never matches on a pane's location: its workspace belongs
    to the checkout, and `worktree open` adopts an older provenance-less
    workspace for the same checkout instead of leaving a duplicate.
    """
    target = checkout["root"] if checkout else directory
    panes = {}
    if checkout is None or not checkout["linked"]:
        for pane in state["panes"]:
            cwd = pane.get("cwd")
            if cwd:
                panes.setdefault(pane["workspace_id"], set()).add(cwd)

    roots = {}
    exact = []
    same_checkout = []
    for workspace in state["workspaces"]:
        workspace_id = workspace["workspace_id"]
        paths = set(panes.get(workspace_id, ()))
        checkout_path = (workspace.get("worktree") or {}).get("checkout_path")
        if checkout_path:
            paths.add(checkout_path)
        for raw in paths:
            path = Path(raw)
            if path.resolve(strict=False) == target:
                exact.append(workspace_id)
                break
            if repo_root(path, roots) == target:
                same_checkout.append(workspace_id)
                break
    for group in (exact, same_checkout):
        if group:
            return group[0]
    return None


def open_workspace(command, environment, directory, checkout):
    if checkout is None:
        created = api(command, ["workspace", "create", "--cwd", str(directory),
                                "--label", directory.name or str(directory), "--focus"],
                      environment)
        return created["result"]["workspace"]["workspace_id"]

    # A linked worktree belongs under its parent repository workspace. `worktree
    # open` creates that parent when it is closed and groups the checkout below it.
    source = checkout["primary"] if checkout["linked"] else checkout["root"]
    try:
        opened = api(command, ["worktree", "open", "--cwd", str(source),
                               "--path", str(checkout["root"]), "--focus"], environment)
        return opened["result"]["workspace"]["workspace_id"]
    except RuntimeError:
        if not checkout["linked"]:
            raise
        # Keep plain launches working when Git discovery and the API disagree.
        created = api(command, ["workspace", "create", "--cwd", str(checkout["root"]),
                                "--label", checkout["root"].name or str(checkout["root"]),
                                "--focus"], environment)
        return created["result"]["workspace"]["workspace_id"]


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
    inside_herdr = bool(os.environ.get("HERDR_ENV"))
    # A T3 server started in a Herdr pane can inherit a different session's sockets.
    inherited_context = {
        "HERDR_ENV", "HERDR_SESSION", "HERDR_SOCKET_PATH", "HERDR_CLIENT_SOCKET_PATH",
        "HERDR_WORKSPACE_ID", "HERDR_TAB_ID", "HERDR_PANE_ID", "HERDR_TERMINAL_ID",
        "HERDR_STARTUP_CWD",
    }
    environment = {key: value for key, value in os.environ.items()
                   if key not in inherited_context}
    checkout = checkout_for(directory)
    cache = Path(os.environ.get("XDG_CACHE_HOME", str(Path.home() / ".cache")))
    locks = cache / "herdr-open-project"
    locks.mkdir(parents=True, exist_ok=True)
    session_key = hashlib.sha256(args.session.encode()).hexdigest()[:16]
    with (locks / f"{session_key}.lock").open("a") as lock:
        # Serialize selection and creation so repeated clicks do not create duplicates.
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = ensure_server(command, environment, directory, args.session)
        workspace_id = find_workspace(state, directory, checkout)
        if workspace_id:
            api(command, ["workspace", "focus", workspace_id], environment)
        else:
            workspace_id = open_workspace(command, environment, directory, checkout)
    if args.select_only:
        print(workspace_id)
        return 0
    if inside_herdr:
        # Attaching from inside Herdr is blocked by design; focus is the whole action.
        return 0
    os.chdir(directory)
    os.execve(binary, command, environment)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(f"herdr-open-project: {error}", file=sys.stderr)
        raise SystemExit(1)
