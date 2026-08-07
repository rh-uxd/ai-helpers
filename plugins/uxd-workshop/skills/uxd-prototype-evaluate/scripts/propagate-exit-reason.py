#!/usr/bin/env python3
"""Propagate exit_reason from eval-state.yaml to iteration-log.json.

Usage: python3 propagate-exit-reason.py <ARTIFACTS_DIR>

The iteration-log.json root-level exit_reason is the canonical field
that downstream consumers read (MLflow scorers, leaderboard, report).
Without this, the report shows "exit_reason: pending" after clean exit.
"""
import json
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print("Usage: propagate-exit-reason.py <ARTIFACTS_DIR>", file=sys.stderr)
    sys.exit(1)

ad = Path(sys.argv[1])
exit_reason = "unknown"

es = ad / "eval-state.yaml"
if es.exists():
    for line in es.read_text().splitlines():
        if line.strip().startswith("exit_reason:"):
            exit_reason = line.split(":", 1)[1].strip()

il = ad / "iteration-log.json"
if il.exists():
    log = json.loads(il.read_text())
    log["exit_reason"] = exit_reason
    il.write_text(json.dumps(log, indent=2))
    print(f"iteration-log.json exit_reason set to: {exit_reason}")
else:
    print("iteration-log.json not found, skipping", file=sys.stderr)
