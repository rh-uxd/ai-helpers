#!/usr/bin/env python3
"""Validate a supplied semantic review and publish separate report/fix artifacts."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

from artifact_io import local_path, output_path, protect_inputs, write_json
from guideline_io import read_confined
from guideline_sources import validate_manifest
from guideline_snapshot import validate_readme_snapshot
from llm_review_contract import validate_llm_review


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--input", required=True, help="LLM-produced structured review JSON")
    parser.add_argument("--scope-report", required=True, help="checker report with frozen changed-line scope")
    parser.add_argument("--guideline-manifest", help="defaults to the scope report's frozen manifest")
    parser.add_argument('--selection', help='new structured approval receipt required when binding a legacy manifest')
    parser.add_argument("--output", required=True, help="new JSON report path inside workspace .artifacts")
    parser.add_argument("--fix-output", required=True, help="new validated fix proposal path inside workspace .artifacts")
    args = parser.parse_args(argv)
    root = Path(args.workspace).expanduser().resolve()
    if not root.is_dir():
        raise ValueError("workspace must be an existing directory")
    raw_path = local_path(args.input, root)
    scope_path = local_path(args.scope_report, root)
    if not raw_path.is_file() or not scope_path.is_file():
        raise ValueError("review input and scope report must be regular files")
    raw = json.loads(read_confined(root, raw_path, 16 * 1024 * 1024).decode("utf-8"))
    scope_report = json.loads(read_confined(root, scope_path, 16 * 1024 * 1024).decode("utf-8"))
    manifest_value = args.guideline_manifest or scope_report.get("guideline_manifest")
    if not manifest_value:
        raise ValueError("scope report must reference a frozen guideline manifest")
    manifest_path = local_path(manifest_value, root)
    if not manifest_path.is_file():
        raise ValueError("frozen guideline manifest must be a regular file")
    manifest = json.loads(read_confined(root, manifest_path, 64 * 1024 * 1024).decode("utf-8"))
    if manifest.get("schema_version") in ('readme-guideline-snapshot-1.0.0', 'readme-guideline-snapshot-2.0.0'):
        validate_readme_snapshot(manifest, root)
    else:
        validate_manifest(manifest, manifest.get("design_system"))
    prompt_path = Path(__file__).resolve().parents[1] / "references/llm-review-contract.md"
    prompt_hash = hashlib.sha256(prompt_path.read_bytes()).hexdigest()
    selection = (json.loads(read_confined(root, local_path(args.selection, root)).decode('utf-8'))
                 if args.selection else None)
    report, handoff = validate_llm_review(raw, manifest=manifest, workspace=root, scope_report=scope_report,
                                          expected_prompt_sha256=prompt_hash, review_selection=selection)
    report['guideline_manifest'] = manifest_path.relative_to(root).as_posix()
    output = output_path(args.output, root)
    fix_output = output_path(args.fix_output, root)
    if output == fix_output:
        raise ValueError("report and fix handoff require separate output paths")
    protect_inputs(output, [raw_path, scope_path, manifest_path])
    protect_inputs(fix_output, [raw_path, scope_path, manifest_path])
    if output.exists() or fix_output.exists():
        raise ValueError("LLM report and fix handoff outputs must be new artifacts")
    write_json(output, report)
    write_json(fix_output, handoff)
    print(json.dumps({"status": report["status"], "report": str(output.relative_to(root)),
                      "fix_handoff": str(fix_output.relative_to(root)), **report["summary"]}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
        print(json.dumps({"status": "error", "error": str(error)}), file=sys.stderr)
        raise SystemExit(2)
