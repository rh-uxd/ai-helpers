#!/usr/bin/env python3
"""Append validated LLM guideline fix handoffs without replacing other phases."""
import argparse
import json
import os
from pathlib import Path
import re
import sys

CHECKER = Path(os.environ.get("UXD_CONSISTENCY_CHECKER_DIR")
               or Path(__file__).resolve().parents[2] / "uxd-consistency-check")
if not CHECKER.is_absolute():
    raise SystemExit("UXD_CONSISTENCY_CHECKER_DIR must be an absolute skill-directory path")
if not all((CHECKER / name).is_file() for name in ("SKILL.md", "scripts/analyze.py")):
    raise SystemExit("The bundled sibling uxd-consistency-check skill is missing or incomplete; "
                     "restore or update the combined plugin, or set UXD_CONSISTENCY_CHECKER_DIR "
                     "to an absolute path for a deliberately separate installation")
sys.path.insert(0, str(CHECKER / "scripts"))
try:
    from guideline_resolver import confined_path, resolve_workspace
    from guideline_io import parent_directory_fd, read_confined
    from review_scope import in_code_scope
except ImportError as error:
    raise SystemExit("Selected uxd-consistency-check runtime is incomplete; restore or update the "
                     "combined plugin or the deliberately separate checker installation") from error


def _local_href(value):
    if not isinstance(value, str) or not value or value.startswith(("/", "\\")):
        return False
    path = value.split("#", 1)[0]
    return not re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", path) and ".." not in Path(path.replace("\\", "/")).parts


def _validate_handoff(value, report):
    if (not isinstance(value, dict) or value.get("schema_version") != "1.1.0"
            or value.get("artifact_type") != "guideline_rooted_fix_proposals"
            or value.get("applied") is not False
            or value.get("approval_state") != "pending_human_approval"
            or not isinstance(value.get("proposals"), list)):
        raise ValueError("validated non-applied fix handoff required")
    if (not isinstance(report, dict) or report.get("schema_version") != "1.1.0"
            or report.get("report_type") != "product_guideline_llm_review"
            or report.get("method") != "llm" or report.get("guideline_ref") != value.get("guideline_ref")
            or not isinstance(report.get("reviews"), list)):
        raise ValueError("matching validated LLM report required")
    scope = value.get('approved_scope')
    if (not isinstance(scope, dict) or scope.get('kind') != 'code_paths'
            or not isinstance(scope.get('directories'), list) or not isinstance(scope.get('files'), list)
            or scope != report.get('approved_scope')
            or not re.fullmatch(r'[0-9a-f]{64}', str(value.get('selection_sha256', '')))
            or value['selection_sha256'] != report.get('selection_sha256')):
        raise ValueError('fix handoff lacks matching approved scope/selection binding')
    findings = {item.get("finding_id"): item for item in report["reviews"]
                if isinstance(item, dict) and isinstance(item.get("finding_id"), str)}
    for item in value["proposals"]:
        required = {"finding_id", "guideline_id", "status", "severity", "confidence", "guideline",
                    "source_evidence", "proposed_change", "why_it_satisfies_rule", "side_effects_or_unknowns",
                    "smallest_safe_file_scope", "test_suggestion", "acceptance_condition", "applied", "approval_state"}
        if not isinstance(item, dict) or set(item) != required:
            raise ValueError("fix proposal fields do not match the handoff contract")
        if (item["status"] != "violation" or item["applied"] is not False
                or item["approval_state"] != "pending_human_approval"
                or item["severity"] not in ("error", "warning")
                or item["confidence"] not in ("high", "medium", "low")):
            raise ValueError("only validated, unapplied violation proposals can be appended")
        for field in ("finding_id", "guideline_id", "proposed_change", "why_it_satisfies_rule",
                      "side_effects_or_unknowns", "test_suggestion", "acceptance_condition"):
            if not isinstance(item[field], str) or not item[field].strip():
                raise ValueError("fix proposal is missing " + field)
        citation = item["guideline"]
        evidence = item["source_evidence"]
        if (not isinstance(citation, dict) or not citation.get("href") or not citation.get("quote")
                or not re.fullmatch(r"[0-9a-f]{64}", str(citation.get("sha256", "")))
                or not isinstance(evidence, dict) or not evidence.get("href") or not evidence.get("excerpt")
                or not re.fullmatch(r"[0-9a-f]{64}", str(evidence.get("sha256", "")))):
            raise ValueError("fix proposal needs exact guideline and source provenance")
        if not _local_href(citation["href"]) or not _local_href(evidence["href"]):
            raise ValueError("fix proposal links must remain workspace-local")
        if item["smallest_safe_file_scope"] != [evidence.get("file")]:
            raise ValueError("fix scope must remain limited to its cited evidence file")
        if (not in_code_scope(evidence['file'], scope) or evidence.get('evidence_type') != 'source_excerpt'
                or type(evidence.get('column_start')) is not int or evidence['column_start'] < 1
                or citation.get('ref_status') not in ('verified_git_blob', 'working_tree_content', 'unverifiable_legacy_ref')
                or (citation['ref_status'] != 'verified_git_blob' and citation.get('ref') is not None)):
            raise ValueError('fix proposal scope/location/provenance contract is invalid')
        review = findings.get(item["finding_id"])
        if (review is None or review.get("status") != "violation"
                or review.get("guideline_id") != item["guideline_id"]
                or review.get('severity') != item['severity'] or review.get('confidence') != item['confidence']
                or review.get('applicability', {}).get('outcome') != 'applicable'
                or review.get("guideline") != citation or review.get("source_evidence") != evidence
                or review.get("suggested_fix") != item["proposed_change"]):
            raise ValueError("fix proposal does not match its exact validated report finding")


def append_handoffs(workspace, handoff_path, report_path, suggestions_path):
    root = resolve_workspace(workspace)
    handoff_file = confined_path(handoff_path, root)
    report_file = confined_path(report_path, root)
    destination = confined_path(suggestions_path, root)
    if not destination.is_relative_to(root / ".artifacts") or destination.suffix != ".json":
        raise ValueError("suggestions output must be a JSON file inside workspace .artifacts")
    if (handoff_file == destination or report_file == destination
            or not handoff_file.is_file() or not report_file.is_file()):
        raise ValueError("handoff and matching report must be separate regular input files")
    handoff = json.loads(read_confined(root, handoff_file, 16 * 1024 * 1024).decode("utf-8"))
    report = json.loads(read_confined(root, report_file, 16 * 1024 * 1024).decode("utf-8"))
    _validate_handoff(handoff, report)
    if destination.exists():
        current = json.loads(read_confined(root, destination, 16 * 1024 * 1024).decode("utf-8"))
        if not isinstance(current, list):
            raise ValueError("refinement-suggestions.json must be an array")
    else:
        current = []
    by_id = {item.get("finding_id"): item for item in current
             if isinstance(item, dict) and isinstance(item.get("finding_id"), str)}
    appended = 0
    for proposal in handoff["proposals"]:
        identity = proposal["finding_id"]
        previous = by_id.get(identity)
        if previous is not None:
            if (previous.get("guideline") != proposal["guideline"]
                    or previous.get("source_evidence") != proposal["source_evidence"]
                    or previous.get('approved_scope') != handoff['approved_scope']
                    or previous.get('selection_sha256') != handoff['selection_sha256']):
                raise ValueError("duplicate finding identity has conflicting rule or source provenance")
            continue
        evidence = proposal["source_evidence"]
        current.append({"type": "consistency", "finding_id": identity,
            "guideline_id": proposal["guideline_id"], "severity": proposal["severity"],
            "confidence": proposal["confidence"], "file": evidence["file"],
            "line": evidence["line_start"], "current": evidence["excerpt"],
            "fix": proposal["proposed_change"], "source": "llm_consistency",
            "guideline": proposal["guideline"], "source_evidence": evidence,
            "side_effects_or_unknowns": proposal["side_effects_or_unknowns"],
            "test_suggestion": proposal["test_suggestion"],
            "acceptance_condition": proposal["acceptance_condition"],
            "smallest_safe_file_scope": proposal["smallest_safe_file_scope"],
            'approved_scope': handoff['approved_scope'],
            'selection_sha256': handoff['selection_sha256'],
            "applied": False, "approval_state": "pending_human_approval"})
        by_id[identity] = current[-1]
        appended += 1
    data = (json.dumps(current, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    temporary = ".fix-proposals-" + os.urandom(12).hex() + ".json"
    with parent_directory_fd(destination, create=True) as directory:
        try:
            fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                         0o600, dir_fd=directory)
            try:
                remaining = memoryview(data)
                while remaining:
                    written = os.write(fd, remaining)
                    if not written:
                        raise OSError("incomplete refinement suggestion write")
                    remaining = remaining[written:]
                os.fsync(fd)
            finally:
                os.close(fd)
            os.replace(temporary, destination.name, src_dir_fd=directory, dst_dir_fd=directory)
        finally:
            try:
                os.unlink(temporary, dir_fd=directory)
            except FileNotFoundError:
                pass
    return {"appended": appended, "total": len(current), "path": str(destination)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--handoff", required=True)
    parser.add_argument("--llm-report", required=True)
    parser.add_argument("--suggestions", required=True)
    args = parser.parse_args()
    print(json.dumps(append_handoffs(args.workspace, args.handoff, args.llm_report, args.suggestions)))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
        raise SystemExit(f"Could not append guideline fix handoffs: {error}")
