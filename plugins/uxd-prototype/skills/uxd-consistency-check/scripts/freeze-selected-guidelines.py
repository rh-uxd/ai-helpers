#!/usr/bin/env python3
# Documentation comments are AI-generated.
"""Save the approved rule snapshot used by a semantic review.

The reviewer and validator need an unchanged copy of the same guidance.
Read a local selection receipt, delegate freezing, and return the artifact path.
"""
import argparse
import json
from pathlib import Path
import sys

from uxd_consistency.guidelines.guideline_snapshot import freeze_selected_sources
from uxd_consistency.shared.artifact_io import local_path
from uxd_consistency.shared.guideline_io import REQUEST_LIMIT, read_confined


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--selection", required=True, help="confirmed selection receipt JSON")
    args = parser.parse_args()
    root = Path(args.workspace).expanduser().resolve()
    selection_path = local_path(args.selection, root)
    if not selection_path.is_file():
        raise ValueError("selection receipt must be a regular file")
    selection = json.loads(read_confined(root, selection_path, REQUEST_LIMIT).decode("utf-8"))
    result = freeze_selected_sources(root, selection)
    snapshot = result["snapshot"]
    print(json.dumps({"status": "frozen", "path": str(Path(result["path"]).relative_to(root)),
        "snapshot_sha256": snapshot["snapshot_sha256"], "repository_ref": snapshot["repository_ref"],
        "selected_rule_ids": [document["id"] for document in snapshot["documents"]],
        "guideline_hashes": [document["sha256"] for document in snapshot["documents"]]}))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
        print(json.dumps({"status": "error", "error": str(error)}), file=sys.stderr)
        raise SystemExit(2)
