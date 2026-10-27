#!/usr/bin/env python3
"""Supply path-selected extra context to Claude hooks."""

import glob
import json
import os
from pathlib import Path
import subprocess
import sys



def expand_alternatives(pattern):
    start = pattern.find("{")
    if start == -1:
        return [pattern]
    depth = 0
    for end in range(start, len(pattern)):
        if pattern[end] == "{":
            depth += 1
        elif pattern[end] == "}":
            depth -= 1
            if depth == 0:
                break
    else:
        raise ValueError(f"Unclosed brace in pattern: {pattern}")
    choices, part, depth = [], "", 0
    for char in pattern[start + 1:end] + ",":
        if char == "," and depth == 0:
            choices.append(part)
            part = ""
        else:
            part += char
            depth += (char == "{") - (char == "}")
    return [result for choice in choices for result in expand_alternatives(
        pattern[:start] + choice + pattern[end + 1:]
    )]


def matches(pattern, directory):
    return any(directory.full_match(item) for item in expand_alternatives(pattern))


def config_path():
    if value := os.environ.get("EXTRA_CONTEXT_CONFIG"):
        return Path(value).expanduser(), True
    directory = Path(os.environ.get(
        "OPENCODE_CONFIG_DIR",
        str(Path(os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))) / "opencode"),
    )).expanduser()
    return directory / "extra-context.json", False


def strings(value, label):
    if not isinstance(value, list) or any(not isinstance(x, str) or not x.strip() for x in value):
        raise ValueError(f"{label} must be an array of non-empty strings")
    return value


def project_root(cwd):
    result = subprocess.run(
        ["git", "-C", str(cwd), "rev-parse", "--show-toplevel"],
        capture_output=True, text=True, timeout=3,
    )
    return Path(result.stdout.strip()).absolute() if result.returncode == 0 else cwd


def extra_context(cwd):
    filepath, explicit = config_path()
    if not filepath.exists() and not explicit:
        return []
    config = json.loads(filepath.read_text())
    if not isinstance(config, dict) or not isinstance(config.get("mappings", []), list):
        raise ValueError(f"{filepath}: expected an object with a mappings array")
    directory = project_root(cwd)
    paths = []
    for index, mapping in enumerate(config.get("mappings", [])):
        if not isinstance(mapping, dict):
            raise ValueError(f"mappings[{index}] must be an object")
        selectors = mapping.get("selector")
        if isinstance(selectors, str):
            selectors = [selectors]
        selectors = strings(selectors, f"mappings[{index}].selector")
        patterns = strings(mapping.get("instructions"), f"mappings[{index}].instructions")
        expanded = [os.path.normpath(os.path.expanduser(x)) for x in selectors]
        if any(not Path(x).is_absolute() for x in expanded):
            raise ValueError("Selectors must be absolute paths or start with ~/")
        if not any(matches(x, directory) for x in expanded):
            continue
        for pattern in patterns:
            source = Path(pattern).expanduser()
            if not source.is_absolute():
                source = filepath.parent / source
            for alternative in expand_alternatives(str(source)):
                paths.extend(sorted(glob.glob(alternative, recursive=True, include_hidden=True)))
    files, seen = [], set()
    for name in paths:
        source = Path(name).resolve()
        if source in seen or not source.is_file():
            continue
        seen.add(source)
        files.append(f"Instructions from: {source}\n{source.read_text()}")
    return files


def main():
    event = json.load(sys.stdin)
    name = event.get("hook_event_name")
    if name not in ("SessionStart", "SubagentStart"):
        raise ValueError(f"Unsupported hook event: {name}")
    try:
        context = extra_context(Path(event["cwd"]).absolute())
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"extra-context: {error}", file=sys.stderr)
        context = ["Extra context could not be loaded. Tell the user before work that depends on it."]
    if not context:
        return
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": name, "additionalContext": "\n\n".join(context),
    }}))


if __name__ == "__main__":
    main()
