#!/usr/bin/env python3
"""Lint eval.yaml files for structural correctness.

Checks:
  1. Bare `annotations` in check blocks — the harness wraps check: blocks in
     `def _check(outputs, arguments):`, so only `outputs` and `arguments` are
     in scope. Bare `annotations` references raise NameError at runtime.
  2. `skill:` field placement — the harness reads `skill` from the root-level
     YAML dict. A `skill:` nested under `execution:` is silently ignored,
     causing the eval to run without loading the skill.

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

BARE_ANNOTATIONS = re.compile(r'(?<!["\'])\bannotations\b')
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


def lint_skill_field(filepath, data, lines):
    errors = []
    if not data:
        return errors

    has_root_skill = "skill" in data
    exec_block = data.get("execution", {}) or {}
    has_nested_skill = "skill" in exec_block

    if has_nested_skill and not has_root_skill:
        line_num = _find_line(lines, "skill:")
        errors.append({
            "file": str(filepath),
            "judge": None,
            "line": line_num,
            "message": (
                "`skill:` is nested under `execution:` but the harness reads it "
                "from the root-level YAML dict. Move `skill:` to the top level "
                "as a sibling of `name:` and `description:`."
            ),
        })

    return errors


def lint_check_blocks(filepath, data, lines):
    errors = []
    if not data or "judges" not in data:
        return errors

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
        with open(filepath) as f:
            data = yaml.safe_load(f)
        lines = filepath.read_text().splitlines()
        all_errors.extend(lint_skill_field(filepath, data, lines))
        all_errors.extend(lint_check_blocks(filepath, data, lines))

    if not all_errors:
        print("eval-lint: all eval configs clean")
        return 0

    for err in all_errors:
        loc = f"{err['file']}"
        if err["line"]:
            loc += f":{err['line']}"
        file_param = str(err['file']).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A').replace(':', '%3A').replace(',', '%2C')
        msg = str(err['message']).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
        print(f"::error file={file_param},line={err['line'] or 0}::{msg}")
        print(f"  {loc}: {err['message']}", file=sys.stderr)

    print(f"\neval-lint: {len(all_errors)} error(s) found", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
