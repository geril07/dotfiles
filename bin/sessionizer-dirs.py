#!/usr/bin/env python3

import os
import sys


def discover(roots):
    pending = list(roots)
    while pending:
        path = pending.pop()
        if os.path.exists(os.path.join(path, ".git")) or os.path.exists(
            os.path.join(path, ".sessionizer")
        ):
            yield path
            continue
        try:
            with os.scandir(path) as entries:
                for entry in entries:
                    if entry.name != "node_modules" and entry.is_dir(follow_symlinks=False):
                        pending.append(entry.path)
        except OSError as error:
            print(f"sessionizer-dirs: {error}", file=sys.stderr)


if __name__ == "__main__":
    for path in discover(sys.argv[1:]):
        print(path, flush=True)
