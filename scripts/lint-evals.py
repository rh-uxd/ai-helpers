#!/usr/bin/env python3
"""Lint eval.yaml files for common check-block scoping bugs.

The eval harness wraps check: blocks in `def _check(outputs, arguments):`,
so only `outputs` and `arguments` are in scope. Bare `annotations` references
inside check blocks raise NameError at runtime. This script catches that
before merge.

Usage:
    python3 scripts/lint-evals.py [path ...]

If no paths given, finds all eval.yaml files under plugins/.
Exit code 0 = clean, 1 = errors found.
"""

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("pyyaml not installed — install with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

BARE_ANNOTATIONS = re.compile(r'\bannotations\s*[\.\[\(]')
SKIP_DIRS = {"uxd-workshop", "pf-workshop"}


def find_eval_files(roots):
    if roots:
        for r in roots:
            p = Path(r)
            if p.is_file():
                yield p
            else:
                yield from (f for f in p.rglob("eval.yaml") if not _is_workshop(f))
    else:
        yield from (f for f in Path("plugins").rglob("eval.yaml") if not _is_workshop(f))


def _is_workshop(path):
    return any(part in SKIP_DIRS for part in path.parts)


def lint_check_blocks(filepath):
    errors = []
    with open(filepath) as f:
        data = yaml.safe_load(f)

    if not data or "judges" not in data:
        return errors

    lines = filepath.read_text().splitlines()

    for judge in data["judges"]:
        name = judge.get("name", "<unnamed>")
        check_src = judge.get("check")
        if not check_src:
            continue

        if BARE_ANNOTATIONS.search(check_src):
            line_num = _find_line(lines, check_src.strip().splitlines()[0].strip())
            errors.append({
                "file": str(filepath),
                "judge": name,
                "line": line_num,
                "message": (
                    f"Bare `annotations` reference in check block of judge `{name}`. "
                    "Check blocks are wrapped in `def _check(outputs, arguments):` — "
                    "only `outputs` and `arguments` are in scope. "
                    "Use `outputs.get(\"annotations\", {}).get(\"key\")` instead."
                ),
            })

    return errors


def _find_line(lines, needle):
    for i, line in enumerate(lines, 1):
        if needle in line:
            return i
    return None


def main():
    roots = sys.argv[1:] if len(sys.argv) > 1 else []
    all_errors = []

    for filepath in find_eval_files(roots):
        all_errors.extend(lint_check_blocks(filepath))

    if not all_errors:
        print("eval-lint: all check blocks clean")
        return 0

    for err in all_errors:
        loc = f"{err['file']}"
        if err["line"]:
            loc += f":{err['line']}"
        print(f"::error file={err['file']},line={err['line'] or 0}::{err['message']}")
        print(f"  {loc}: {err['message']}", file=sys.stderr)

    print(f"\neval-lint: {len(all_errors)} error(s) found", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
