#!/usr/bin/env python3
"""Wait for required artifacts to be ready before report generation.

Usage: python3 artifact-readiness-gate.py <ARTIFACTS_DIR>

render-report.js reads journey-log.json, persona-results.json, and
consistency-report.json at startup. If any background task is still
writing these files, the report renders with empty/partial data.

Retries up to 6 times with 5s delays. Prints warnings and proceeds
if artifacts remain incomplete after all retries.
"""
import json
import os
import sys
import time

if len(sys.argv) < 2:
    print("Usage: artifact-readiness-gate.py <ARTIFACTS_DIR>", file=sys.stderr)
    sys.exit(1)

ad = sys.argv[1]

required = {
    "persona-results.json": lambda d: isinstance(d, list) and len(d) > 0,
    "journey-log.json": lambda d: "usability_dimensions" in d,
    "consistency-report.json": lambda d: d is not None,
}

for attempt in range(6):
    missing = []
    for f, check in required.items():
        fp = os.path.join(ad, f)
        if not os.path.exists(fp):
            missing.append(f"{f} (not found)")
            continue
        try:
            data = json.loads(open(fp).read())
            if not check(data):
                missing.append(f"{f} (incomplete)")
        except Exception:
            missing.append(f"{f} (unreadable)")
    if not missing:
        print("All artifacts ready for report generation")
        break
    if attempt < 5:
        print(f"Waiting for artifacts: {', '.join(missing)}")
        time.sleep(5)
    else:
        print(f"WARNING: Proceeding with incomplete artifacts: {', '.join(missing)}")
