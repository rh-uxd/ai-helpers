#!/usr/bin/env python3
# AI-generated script by GPT-6 Luna.
"""Offline, workspace-owned consistency reports. No model or network imports."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys
import uuid

from artifact_io import local_path, output_path, protect_inputs, write_json
from guideline_sources import load_guidelines, load_manifest
from internal_consistency import compare_internal
from scoped_sources import read_sources, mask_comments
from report_contract import validate_report

SCHEMA_VERSION = "1.0.0"



def evaluate(documents, files, changed_lines=None):
    findings = []
    evaluated = []
    for document in documents:
        check = document.get("check")
        # Unsupported checks remain unevaluated; prose never authorizes execution.
        if check not in {"patternfly-component-usage", "no-custom-css", "css-token-usage", "required-html-class"} or not files:
            continue
        # A stylesheet cannot supply component evidence or a root HTML element.
        suffixes = {"required-html-class": {".html", ".htm"},
                    "patternfly-component-usage": {".html", ".htm", ".jsx", ".tsx", ".js", ".ts"}}.get(check)
        targets = {file: text for file, text in files.items()
                   if suffixes is None or Path(file).suffix.lower() in suffixes}
        if not targets:
            continue
        # Mark as evaluated before the file loop: zero matches is still a pass, not a skip.
        evaluated.append(document["id"])
        for file, text in targets.items():
            text = mask_comments(text)
            suffix = Path(file).suffix.lower()
            matches = []
            if check == "patternfly-component-usage":
                matches = [(match.start(), match.group()) for match in
                           re.finditer(r"<(?:button|input|select|textarea)\b[^>]*>", text)
                           if not re.search(r"pf-v\d+-", match.group())]
            elif check == "no-custom-css":
                if suffix in {".css", ".scss"}:
                    matches.append((0, "Authored stylesheet: " + file))
                else:
                    # Legacy PatternFly asset exemptions are not generic policy.
                    matches = [(match.start(), match.group()) for match in re.finditer(
                        r"\bstyle\s*=|<style\b|<link\b[^>]*rel\s*=\s*[\"']stylesheet[\"'][^>]*>", text)
                        if document.get("design_system") != "patternfly" or
                        ("patternfly" not in match.group() and "uxd-prototype-bar" not in match.group())]
            elif check == "css-token-usage":
                matches = [(match.start(), match.group()) for match in re.finditer(
                    r"\b(?:color|background(?:-color|Color)?|border(?:-color|Color)?|fill|stroke)\s*:\s*['\"]?(?:#[0-9a-fA-F]{3,8}\b|(?:rgb|hsl)a?\([^)]*\))", text)]
            elif check == "required-html-class" and suffix in {".html", ".htm"}:
                required = document.get("parameters", {}).get("required_class")
                if not isinstance(required, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", required):
                    raise ValueError("required-html-class needs a required_class scalar")
                root = re.search(r"<html\b[^>]*>", text, re.IGNORECASE)
                classes = re.search(r"\bclass\s*=\s*['\"]([^'\"]*)['\"]", root.group()) if root else None
                if not classes or required not in classes.group(1).split():
                    matches = [(root.start() if root else 0, "Missing required root HTML class: " + required)]
            # Regex matches can't confirm PatternFly compliance or token origin, only flag for human review.
            candidate = check in {"patternfly-component-usage", "css-token-usage"}
            for offset, value in matches:
                line = text.count("\n", 0, offset) + 1
                end_line = line + value.count("\n")
                # CSS/SCSS files flag the whole file when they appear in the diff at all (no per-line granularity).
                whole_file = check == "no-custom-css" and suffix in {".css", ".scss"}
                if changed_lines is not None and not (bool(changed_lines.get(file)) if whole_file else any(number in changed_lines.get(file, set()) for number in range(line, end_line + 1))):
                    continue
                severity = "warning" if candidate else document["severity"]
                findings.append({"guideline_id": document["id"], "guideline_title": document["title"],
                                 "category": document["category"], "severity": severity,
                                 "verdict": "VIOLATION" if severity == "error" else "FLAGGED",
                                 "confidence": "low" if candidate else "high", "review_candidate": candidate,
                                 "file": file, "line": None if whole_file else line,
                                 "property": document["id"], "value": value,
                                 "description": "Source pattern requires review against the selected guideline." if candidate else "Source does not satisfy the selected guideline's explicit policy.",
                                 "suggestion": document["text"].split("## Rule", 1)[-1].strip(),
                                 "check_method": "automated_candidate" if candidate else "automated",
                                 "pf_doc_url": document.get("source_url")})
    return findings, evaluated


def guideline_coverage(documents, evaluated, sources):
    def group(kinds):
        source_ids = {identity for source in sources if source["kind"] in kinds for identity in source["document_ids"]}
        selected = [doc["id"] for doc in documents if doc["id"] in source_ids]
        checked = [identity for identity in selected if identity in evaluated]
        return {"status": "evaluated" if checked and len(checked) == len(selected) else "partially_evaluated" if checked else "not_evaluated",
                "selected_rules": selected, "evaluated_rules": checked}
    return {"status": "evaluated" if evaluated and len(evaluated) == len(documents) else "partially_evaluated" if evaluated else "not_evaluated",
            "baseline": group({"baseline"}), "workspace": group({"workspace", "explicit"})}


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--workspace", "--src", "--source-dir", dest="workspace", required=True)
    parser.add_argument("--design-system", help="Optional system label; patternfly opts into its bundled baseline")
    parser.add_argument("--design-system-version", default="unspecified")
    parser.add_argument("--json-output", action="store_true", help="Print JSON (also the default)")
    parser.add_argument("--json-file", help="Explicit workspace .artifacts JSON destination")
    parser.add_argument("--guidelines", action="append", default=[], help="Repeat local [NAMESPACE=]PATH (default namespace: local)")
    parser.add_argument("--guideline-manifest", help="Frozen offline source manifest")
    parser.add_argument("--guideline", help="Check one exact namespace:original-id (raw ID for legacy replay)")
    parser.add_argument("--category", help="Check one category")
    parser.add_argument("--report-dir", help="Compatibility alias for a JSON-only .artifacts run directory")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--changed", action="store_true")
    parser.add_argument("--base-ref", default="main")
    parser.add_argument("--tracked-only", action="store_true")
    parser.add_argument("--merge-base", action="store_true")
    args = parser.parse_args()
    workspace = Path(args.workspace).expanduser().resolve()
    if not workspace.is_dir():
        parser.error("workspace must be an existing directory")
    if args.guideline_manifest and args.guidelines:
        parser.error("a frozen manifest cannot be combined with new guidelines")
    context = load_manifest(args.guideline_manifest, workspace, args.design_system) if args.guideline_manifest else load_guidelines(workspace, args.guidelines, args.design_system)
    args.design_system = context["design_system"]
    documents = context["documents"]
    for key in ("guideline", "category"):
        selected = getattr(args, key)
        if selected:
            field = "id" if key == "guideline" else "category"
            documents = [doc for doc in documents if doc[field] == selected]
            if not documents:
                parser.error(f"unknown {key}: {selected}")
    if (args.tracked_only or args.merge_base) and not args.changed:
        parser.error("--tracked-only and --merge-base require --changed")
    files, changed_lines, inputs = read_sources(workspace, args.changed, args.base_ref, args.tracked_only, args.merge_base)
    # In changed mode, skip files that had no lines in the diff (changed_lines maps to empty set for unchanged files).
    targets = files if changed_lines is None else {file: text for file, text in files.items() if changed_lines.get(file)}
    # "any" is the wildcard design_system sentinel; guidelines with it apply to every design system.
    applicable_documents = [doc for doc in documents if doc.get("design_system") in {args.design_system, "any"}]
    findings, evaluated = evaluate(applicable_documents, targets, changed_lines)
    error_ids = {finding["guideline_id"] for finding in findings if finding["severity"] == "error"}
    warning_ids = {finding["guideline_id"] for finding in findings} - error_ids
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:12]
    if args.report_dir and args.json_file:
        parser.error("choose --json-file or --report-dir, not both")
    destination = output_path(args.json_file or str(Path(args.report_dir or ".artifacts/consistency") / run_id / "consistency-report.json"), workspace)
    protected = [source for doc in context["documents"] for source in doc["sources"]]
    if args.guideline_manifest:
        protected.append(str(local_path(args.guideline_manifest, workspace)))
    protect_inputs(destination, protected)
    artifact = destination.relative_to(workspace)
    snapshot_path = destination.parent / ("guidelines-" + run_id + ".json")
    report = {
        "schema_version": SCHEMA_VERSION, "run_id": run_id,
        "source": "uxd-consistency-check", "degraded": False,
        "workspace": str(workspace), "artifact": artifact.as_posix(),
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "design_system": {"id": args.design_system, "version": args.design_system_version},
        "guidelines_version": context["version"],
        "guideline_manifest": snapshot_path.relative_to(workspace).as_posix(),
        "guideline_context": {"sources": context["sources"], "documents": [{key: value for key, value in doc.items() if key != "text"} for doc in context["documents"]]},
        "guideline_consistency": guideline_coverage(documents, evaluated, context["sources"]),
        "internal_consistency": compare_internal(files, changed_lines, inputs["file_aliases"]),
        "inputs": inputs,
        "coverage": {"evaluated_rules": evaluated,
                     "unevaluated_rules": [doc["id"] for doc in documents if doc["id"] not in evaluated]},
        "source_mode": {"ran": True, "violations": findings},
        "visual_mode": {"ran": False, "screenshots_checked": 0, "findings": []},
        "summary": {"total_guidelines_checked": len(evaluated), "violations": len(error_ids),
                    "warnings": len(warning_ids), "passes": len(evaluated) - len(error_ids | warning_ids)},
    }
    validate_report(report)
    write_json(snapshot_path, context)
    write_json(destination, report)
    if args.verbose:
        print(f"Source scope: {inputs['scope']}; checked {len(evaluated)} guideline groups. Internal: {report['internal_consistency']['status']}", file=sys.stderr)
    print(json.dumps(report, indent=2))
    return 1 if error_ids else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError) as error:
        print(f"Consistency analysis failed: {error}", file=sys.stderr)
        sys.exit(2)
