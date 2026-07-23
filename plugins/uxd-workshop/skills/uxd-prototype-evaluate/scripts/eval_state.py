#!/usr/bin/env python3
"""Eval pipeline state persistence — survives context compression.

Follows the rfe-creator state.py pattern: key-value pairs in a YAML file
that the agent reads back after context window compression.

Standard fields:
    phase: a | b          (current pipeline phase)
    iteration: N          (current Phase A loop iteration)
    max_iterations: N     (Phase A loop cap)
    ac_pass: true|false   (whether Phase A AC gate passed)
    exit_reason: pending|all_pass|flagged_unfixable|max_iterations|regression|no_iterate|no_fix
    key: JIRA-KEY
    url: prototype URL
    workspace: path to prototype repo

Usage:
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py init <file> key=value ...
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set <file> key=value ...
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py get <file> <key>
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py read <file>
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp
"""
import os
import sys
from datetime import datetime, timezone


def _parse_pairs(args):
    pairs = []
    for arg in args:
        if '=' in arg:
            k, v = arg.split('=', 1)
            pairs.append((k.strip(), v.strip()))
    return pairs


def cmd_init(args):
    """Create directory and write a fresh state file."""
    if len(args) < 1:
        print("Usage: eval_state.py init <file> [key=value ...]", file=sys.stderr)
        sys.exit(1)
    path = args[0]
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    pairs = _parse_pairs(args[1:])
    with open(path, "w") as f:
        for k, v in pairs:
            f.write(f"{k}: {v}\n")


def cmd_set(args):
    """Set key-value pairs, updating existing keys in place."""
    if len(args) < 2:
        print("Usage: eval_state.py set <file> key=value ...", file=sys.stderr)
        sys.exit(1)
    path = args[0]
    pairs = _parse_pairs(args[1:])
    update = {k: v for k, v in pairs}
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    lines = []
    seen = set()
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                if ':' in line:
                    key = line.split(':', 1)[0].strip()
                    if key in update:
                        lines.append(f"{key}: {update[key]}\n")
                        seen.add(key)
                    else:
                        lines.append(line)
                else:
                    lines.append(line)
    for k, v in pairs:
        if k not in seen:
            lines.append(f"{k}: {v}\n")
    with open(path, "w") as f:
        f.writelines(lines)


def cmd_get(args):
    """Read a single key value."""
    if len(args) < 2:
        print("Usage: eval_state.py get <file> <key>", file=sys.stderr)
        sys.exit(1)
    path, key = args[0], args[1]
    if not os.path.exists(path):
        sys.exit(1)
    with open(path) as f:
        for line in f:
            if ':' in line:
                k, v = line.split(':', 1)
                if k.strip() == key:
                    print(v.strip())
                    return
    sys.exit(1)


def cmd_read(args):
    """Read and print entire state file."""
    if len(args) < 1:
        print("Usage: eval_state.py read <file>", file=sys.stderr)
        sys.exit(1)
    path = args[0]
    if not os.path.exists(path):
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)
    with open(path) as f:
        print(f.read(), end='')


def cmd_timestamp(args):
    """Print current UTC timestamp."""
    print(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))


COMMANDS = {
    "init": cmd_init,
    "set": cmd_set,
    "get": cmd_get,
    "read": cmd_read,
    "timestamp": cmd_timestamp,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(f"Usage: eval_state.py <{'|'.join(COMMANDS.keys())}> ...", file=sys.stderr)
        sys.exit(1)
    COMMANDS[sys.argv[1]](sys.argv[2:])


if __name__ == "__main__":
    main()
