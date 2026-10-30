#!/usr/bin/env python3
"""Freeze explicitly approved local README-linked guidelines for an LLM review."""
import argparse
import json
from pathlib import Path
import sys

from artifact_io import local_path
from guideline_io import REQUEST_LIMIT, read_confined
from guideline_snapshot import freeze_selected_readme_sources


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
    result = freeze_selected_readme_sources(root, selection)
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
