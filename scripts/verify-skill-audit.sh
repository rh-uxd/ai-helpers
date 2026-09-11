#!/usr/bin/env bash
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

command -v python3 >/dev/null 2>&1 || {
  printf 'Error: Python 3 is required to verify the skill audit watermark.\n' >&2
  exit 2
}

BASE_SHA="${1:-${BASE_SHA:-}}"
if [ -z "$BASE_SHA" ]; then
  printf 'Usage: %s BASE_SHA\n' "$0" >&2
  exit 2
fi

changed_skills=$(git diff --name-only --diff-filter=ACMR "$BASE_SHA...HEAD" -- 'plugins/**/SKILL.md')
if [ -z "$changed_skills" ]; then
  printf 'No changed skills require a watermark.\n'
  exit 0
fi

skill_paths=()
while IFS= read -r path; do
  [ -n "$path" ] && skill_paths+=("$path")
done <<< "$changed_skills"

if [ ! -f .skill-audit.json ]; then
  printf 'Skill audit required. Run:\n  make skill-audit SKILLS="%s"\nCommit .skill-audit.json and push again.\n' "$changed_skills" >&2
  exit 1
fi

python3 - .skill-audit.json "${skill_paths[@]}" <<'PY'
import hashlib
import json
import pathlib
import re
import sys

watermark_path = pathlib.Path(sys.argv[1])
paths = sys.argv[2:]
errors = []

try:
    watermark = json.loads(watermark_path.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as error:
    print(f"Invalid .skill-audit.json: {error}", file=sys.stderr)
    raise SystemExit(1)

if not isinstance(watermark, dict):
    errors.append("watermark must be a JSON object")
if watermark.get("status") != "pass":
    errors.append("watermark status must be pass")
if not isinstance(watermark.get("audit"), str) or not watermark["audit"]:
    errors.append("watermark is missing its audit identifier")
if not isinstance(watermark.get("skills"), list):
    errors.append("watermark skills must be an array")

entries = {}
if isinstance(watermark.get("skills"), list):
    for item in watermark["skills"]:
        if not isinstance(item, dict):
            errors.append("watermark contains a non-object skill entry")
            continue
        path = item.get("path")
        digest = item.get("sha256")
        if not isinstance(path, str) or not path:
            errors.append("watermark entry is missing a path")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            errors.append(f"{path or '<unknown>'}: invalid sha256 hash")
        if path in entries:
            errors.append(f"{path}: duplicate watermark entry")
        entries[path] = item

for path in paths:
    entry = entries.get(path)
    if not entry:
        errors.append(f"{path}: missing from .skill-audit.json")
        continue
    digest = hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()
    if entry.get("sha256") != digest:
        errors.append(f"{path}: watermark hash does not match the current file")

if errors:
    print("Skill audit watermark is stale:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    print("Run the audit again and commit the updated .skill-audit.json:", file=sys.stderr)
    print(f"  make skill-audit SKILLS=\"{' '.join(paths)}\"", file=sys.stderr)
    raise SystemExit(1)

print(f"Skill audit watermark verified for {len(paths)} changed skill(s).")
PY
