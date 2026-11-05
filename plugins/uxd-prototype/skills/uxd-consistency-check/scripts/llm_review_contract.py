"""Validate LLM product-guideline judgments against frozen rules and MR evidence."""
from __future__ import annotations

import hashlib
from pathlib import Path, PurePosixPath, PureWindowsPath
import re
from typing import Any

from artifact_io import local_path
from guideline_sources import validate_manifest
from guideline_snapshot import validate_readme_snapshot, bind_manifest_selection
from scoped_sources import read_sources
from review_scope import heading_sections, normalized_text, in_code_scope
from guideline_io import read_confined

STATUSES = {"violation", "no_issue_found", "uncertain", "not_applicable", "unsupported", "unavailable"}
CONFIDENCE = {"high", "medium", "low"}
PROMPT_VERSION = "llm-review-contract-v1.1"
CHECKER_VERSION = "consistency-checker-llm-v1.1"


def _nonempty(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def _heading_and_quote(document: dict[str, Any], citation: Any, root: Path) -> tuple[str, str, str, str, str]:
    if not isinstance(citation, dict) or set(citation) != {"path", "heading", "quote", "sha256", "ref"}:
        raise ValueError("guideline citation has missing or unsupported fields")
    path = _nonempty(citation["path"], "guideline path")
    heading = _nonempty(citation["heading"], "guideline heading")
    quote = _nonempty(citation["quote"], "guideline quote")
    if citation["sha256"] != document["sha256"]:
        raise ValueError("guideline citation hash differs from the frozen rule")
    if citation['ref'] != document['provenance']['ref']:
        raise ValueError('guideline ref is not established by frozen provenance')
    sources = {Path(value).as_posix() for value in document["sources"]}
    if document.get("path"):
        sources.add(Path(document["path"]).as_posix())
    if path not in sources:
        raise ValueError("guideline path is not an exact selected source")
    text, headings = heading_sections(document['text'])
    candidates = [entry for entry in headings if entry['heading'] == heading]
    bounds = document['section_bounds']
    candidates = [entry for entry in candidates if bounds['start'] <= entry['start'] < bounds['end']]
    if len(candidates) != 1:
        raise ValueError("guideline heading is not present in the frozen source")
    selected_heading = candidates[0]
    if normalized_text(quote) not in text[selected_heading['start']:min(selected_heading['end'], bounds['end'])]:
        raise ValueError("guideline quote is not an exact excerpt under the cited heading")
    source_path = Path(path)
    if source_path.is_absolute():
        try:
            href_path = source_path.resolve().relative_to(root).as_posix()
        except ValueError as error:
            raise ValueError("guideline citation path is outside the review workspace") from error
    else:
        if ".." in source_path.parts:
            raise ValueError("guideline citation path escapes the review workspace")
        href_path = source_path.as_posix()
    return path, heading, quote, href_path, selected_heading['anchor']


def _source_evidence(evidence: Any, *, workspace: Path, inputs: dict[str, Any], approved_scope) -> dict[str, Any] | None:
    if evidence is None:
        return None
    if not isinstance(evidence, dict) or set(evidence) != {"file", "line_start", "line_end", "excerpt"}:
        raise ValueError("source evidence has missing or unsupported fields")
    name = _nonempty(evidence["file"], "source file")
    relative = PurePosixPath(name.replace("\\", "/"))
    if (relative.is_absolute() or ".." in relative.parts or PureWindowsPath(name).drive
            or name not in inputs.get("target_files", [])):
        raise ValueError("source evidence must cite a file in the changed MR scope")
    if not in_code_scope(name, approved_scope):
        raise ValueError('source evidence is outside approved code-path scope')
    target = local_path(workspace / Path(*relative.parts), workspace)
    if not target.is_file():
        raise ValueError("source evidence file is missing")
    content = read_confined(workspace, target)
    expected_hash = inputs.get("files", {}).get(name)
    if not isinstance(expected_hash, str) or hashlib.sha256(content).hexdigest() != expected_hash:
        raise ValueError("source file differs from the pinned MR scope")
    view = normalized_text(content.decode('utf-8'))
    lines = view.splitlines(keepends=True)
    start, end = evidence["line_start"], evidence["line_end"]
    if type(start) is not int or type(end) is not int or not 1 <= start <= end <= len(lines):
        raise ValueError("invalid source line range")
    changed_lines = inputs.get("changed_lines")
    if not isinstance(changed_lines, dict) or not isinstance(changed_lines.get(name), list):
        raise ValueError("pinned MR changed-line evidence is required")
    if not any(start <= line <= end for line in changed_lines[name]):
        raise ValueError("source evidence does not intersect a changed line")
    excerpt = normalized_text(_nonempty(evidence["excerpt"], "source excerpt"))
    region = ''.join(lines[start - 1:end])
    occurrences = []
    position = region.find(excerpt)
    while position != -1:
        occurrences.append(position)
        position = region.find(excerpt, position + 1)
    if not occurrences:
        raise ValueError("source excerpt does not match the pinned file and line range")
    if len(occurrences) != 1:
        raise ValueError('ambiguous repeated source excerpt; narrow the cited range')
    offset = sum(len(line) for line in lines[:start - 1]) + occurrences[0]
    actual_start = view.count('\n', 0, offset) + 1
    actual_end = view.count('\n', 0, offset + len(excerpt) - 1) + 1
    if not any(actual_start <= line <= actual_end for line in changed_lines[name]):
        raise ValueError('source excerpt location does not intersect a changed line')
    column = offset - (view.rfind('\n', 0, offset) + 1) + 1
    return {"file": name, "line_start": actual_start, "line_end": actual_end, "excerpt": excerpt,
            "column_start": column, "evidence_type": "source_excerpt",
            "href": f"{name}#L{actual_start}-L{actual_end}", "sha256": expected_hash}


def validate_llm_review(raw: Any, *, manifest: dict[str, Any], workspace: Path,
                         scope_report: dict[str, Any], expected_prompt_sha256: str | None = None,
                         review_selection=None
                         ) -> tuple[dict[str, Any], dict[str, Any]]:
    """Return a validated semantic report and a separate non-applied fix handoff."""
    if not isinstance(manifest, dict):
        raise ValueError('guideline manifest must be an object')
    if manifest.get('schema_version') in ('1.0.0', '1.1.0'):
        if review_selection is None:
            raise ValueError('legacy manifest needs an approved structured review selection')
        manifest = bind_manifest_selection(workspace, manifest, review_selection)
    validate_readme_snapshot(manifest, workspace)
    if manifest['schema_version'] != 'readme-guideline-snapshot-2.0.0':
        raise ValueError('legacy snapshot is replay-only; renewed structured selection required')
    approved_scope = manifest['review_scope']
    if (not isinstance(raw, dict) or set(raw) != {"schema_version", "status", "method", "model",
            "checker_version", "run_id", "prompt_version", "prompt_sha256", "guideline_ref", "reviews"}
            or raw.get("schema_version") != "1.1.0"):
        raise ValueError("unsupported LLM review schema")
    if raw.get("status") != "completed" or raw.get("method") != "llm":
        raise ValueError("review must be a completed LLM review")
    model = _nonempty(raw.get("model"), "model")
    if raw.get("checker_version") != CHECKER_VERSION:
        raise ValueError("unsupported checker version")
    run_id = _nonempty(raw.get("run_id"), "run ID")
    prompt_version = _nonempty(raw.get("prompt_version"), "prompt version")
    if prompt_version != PROMPT_VERSION:
        raise ValueError("unsupported prompt version")
    prompt_hash = raw.get("prompt_sha256")
    if not isinstance(prompt_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", prompt_hash):
        raise ValueError("prompt SHA-256 is required")
    if expected_prompt_sha256 is not None and prompt_hash != expected_prompt_sha256:
        raise ValueError("prompt hash differs from the selected review prompt file")
    refs = {doc['provenance']['ref'] for doc in manifest['documents']}
    guideline_ref = next(iter(refs)) if len(refs) == 1 else None
    if raw.get('guideline_ref') != guideline_ref:
        raise ValueError('guideline ref is not established by frozen provenance')
    if not isinstance(scope_report, dict):
        raise ValueError("pinned scope report must be an object")
    inputs = scope_report.get("inputs", {})
    for review in raw.get('reviews', []):
        evidence = review.get('source_evidence') if isinstance(review, dict) else None
        if isinstance(evidence, dict) and isinstance(evidence.get('file'), str) and not in_code_scope(evidence['file'], approved_scope):
            raise ValueError('source evidence is outside approved code-path scope')
    if inputs.get('hash_basis') != 'original_bytes' or inputs.get('approved_scope') != approved_scope:
        raise ValueError('scope report lacks the approved code-path scope/original-byte hash contract')
    if scope_report.get("run_id") != run_id:
        raise ValueError("LLM review run ID differs from the pinned scope report")
    if inputs.get("scope") != "changed" or not inputs.get("head") or not inputs.get("base"):
        raise ValueError("LLM review requires an MR changed-file/diff scope")
    if not isinstance(inputs.get("changed_lines"), dict):
        raise ValueError("scope report lacks pinned changed-line evidence")
    tracked_only = inputs.get("tracked_only", False)
    if type(tracked_only) is not bool or inputs.get("merge_base", False) is not False:
        raise ValueError("unsupported or ambiguous MR scope options")
    _, _, current_inputs = read_sources(Path(workspace).resolve(), changed=True,
        base_ref=inputs["base"], tracked_only=tracked_only, merge_base=False, approved_scope=approved_scope)
    for field in ("head", "base", "source_sha256", "files", "target_files", "changed_lines"):
        if inputs.get(field) != current_inputs.get(field):
            raise ValueError("scope report differs from the current pinned MR delta: " + field)
    documents = {document['id']: document for document in manifest['documents']}
    reviews = raw.get("reviews")
    if not isinstance(reviews, list):
        raise ValueError("reviews must be an array with one result per selected rule")
    if len(reviews) != len(documents):
        raise ValueError("every selected rule must have exactly one review result")
    seen = set()
    normalized = []
    handoffs = []
    root = Path(workspace).resolve()
    for review in reviews:
        if not isinstance(review, dict):
            raise ValueError("each rule review must be an object")
        required = {"guideline_id", "status", "severity", "confidence", "guideline", "source_evidence",
                    "rationale", "limitations", "suggested_fix", "side_effects", "test_suggestion",
                    "acceptance_condition", "verifier"}
        if set(review) != required:
            raise ValueError("rule review has missing or unsupported fields")
        identity = _nonempty(review["guideline_id"], "guideline ID")
        if identity not in documents or identity in seen:
            raise ValueError("unknown or duplicate selected guideline ID")
        seen.add(identity)
        status = review["status"]
        if status not in STATUSES:
            raise ValueError("unsupported rule review status")
        if review["confidence"] not in CONFIDENCE:
            raise ValueError("invalid confidence")
        if review["severity"] not in (None, "error", "warning"):
            raise ValueError("invalid severity")
        document = documents[identity]
        applicable = document['design_system'] in (manifest['design_system'], 'any')
        if not applicable and status != 'not_applicable':
            raise ValueError('trusted applicability metadata requires not_applicable')
        guideline_path, heading, quote, guideline_href_path, anchor = _heading_and_quote(document, review["guideline"], root)
        evidence = _source_evidence(review["source_evidence"], workspace=root, inputs=inputs, approved_scope=approved_scope)
        if status in {"violation", "no_issue_found", "uncertain"} and evidence is None:
            raise ValueError("evaluated judgments require exact changed-source evidence")
        rationale = _nonempty(review["rationale"], "rationale")
        limitations = review["limitations"]
        if not isinstance(limitations, list) or any(not isinstance(item, str) or not item.strip() for item in limitations):
            raise ValueError("limitations must be an array of non-empty strings")
        verifier = review["verifier"]
        normalized_verifier = None
        disagreement = None
        if verifier is None:
            if review["severity"] == "error" or review["confidence"] == "low":
                raise ValueError("high-impact or low-confidence judgments require an independent verifier")
        else:
            if (not isinstance(verifier, dict) or set(verifier) != {"model", "status", "agrees", "rationale"}
                    or verifier["status"] not in STATUSES or type(verifier["agrees"]) is not bool
                    or not isinstance(verifier["model"], str) or not verifier["model"].strip()
                    or verifier["model"] == model):
                raise ValueError("independent verifier must use a different model and the exact verdict contract")
            verifier_rationale = _nonempty(verifier["rationale"], "verifier rationale")
            if verifier["agrees"] != (verifier["status"] == status):
                raise ValueError("verifier agreement flag contradicts its verdict")
            normalized_verifier = {"model": verifier["model"], "status": verifier["status"],
                                   "agrees": verifier["agrees"], "rationale": verifier_rationale}
            if not verifier["agrees"]:
                disagreement = {"reviewer_status": status, "verifier_status": verifier["status"],
                               "resolution": "unresolved; primary reviewer verdict retained"}
                limitations = [*limitations, "Independent verifier disagreed; judgment remains unresolved."]
        entry = {"guideline_id": identity, "method": "llm", "status": status,
                 "severity": review["severity"], "confidence": review["confidence"],
                 "applicability": {'selected': manifest['design_system'], 'document': document['design_system'],
                                   'outcome': 'applicable' if applicable else 'not_applicable'},
                 "guideline": {"path": guideline_href_path, "heading": heading, "anchor": anchor,
                               "href": f"{guideline_href_path}#{anchor}",
                               "quote": quote, "sha256": document["sha256"], "ref": document['provenance']['ref'],
                               "ref_status": document['provenance']['status'], 'selected_scope': document['guideline_scope']},
                 "source_evidence": evidence, "rationale": rationale, "limitations": limitations,
                 "verifier": normalized_verifier, "disagreement": disagreement}
        if status == "violation":
            if review["severity"] not in ("error", "warning"):
                raise ValueError("violations require an explicit severity")
            suggested = _nonempty(review["suggested_fix"], "suggested fix")
            side_effects = _nonempty(review["side_effects"], "side effects/unknowns")
            test_suggestion = _nonempty(review["test_suggestion"], "test suggestion")
            acceptance = _nonempty(review["acceptance_condition"], "acceptance condition")
            finding_id = "finding-" + hashlib.sha256(
                f"{identity}\0{document['sha256']}\0{evidence['file']}\0{evidence['sha256']}\0{evidence['line_start']}\0{evidence['column_start']}\0{quote}".encode()).hexdigest()[:20]
            entry["finding_id"] = finding_id
            entry["suggested_fix"] = suggested
            handoffs.append({"finding_id": finding_id, "guideline_id": identity,
                "status": status, "severity": review["severity"],
                "confidence": review["confidence"], "guideline": entry["guideline"],
                "source_evidence": evidence, "proposed_change": suggested,
                "why_it_satisfies_rule": rationale, "side_effects_or_unknowns": side_effects,
                "smallest_safe_file_scope": [evidence["file"]], "test_suggestion": test_suggestion,
                "acceptance_condition": acceptance, "applied": False, "approval_state": "pending_human_approval"})
        else:
            for field in ("suggested_fix", "side_effects", "test_suggestion", "acceptance_condition"):
                if review[field] not in (None, ""):
                    raise ValueError("only violation results may propose a fix")
        normalized.append(entry)

    if seen != set(documents):
        raise ValueError("review coverage omitted selected rules")
    counts = {status: sum(item["status"] == status for item in normalized) for status in sorted(STATUSES)}
    deterministic_coverage = scope_report.get("coverage") if isinstance(scope_report, dict) else None
    if not isinstance(deterministic_coverage, dict):
        deterministic_coverage = {"status": "not_run", "evaluated_rules": [], "unevaluated_rules": []}
    deterministic_status = (scope_report.get("guideline_consistency", {}).get("status")
                            if isinstance(scope_report.get("guideline_consistency"), dict) else None)
    deterministic_status = deterministic_status or deterministic_coverage.get("status") or "not_run"
    manifest_fingerprint = manifest.get("snapshot_sha256") or str(manifest.get("version", "")).removeprefix("sha256:")
    report = {"schema_version": "1.1.0", "report_type": "product_guideline_llm_review",
        "status": "completed", "method": "llm", "checker_version": CHECKER_VERSION,
        "run_id": run_id, "model": model, "prompt_version": prompt_version,
        "prompt_sha256": prompt_hash, "guideline_ref": guideline_ref, "workspace": str(root),
        "guideline_manifest_sha256": manifest_fingerprint,
        'approved_scope': approved_scope, 'selection_sha256': manifest['selection_sha256'],
        "scope": {key: inputs[key] for key in ("scope", "head", "base", "source_sha256", "target_files",
                                                  "tracked_only", "merge_base", "changed_lines")},
        "coverage": {"selected_rules": sorted(documents), "llm_reviewed_rules": sorted(seen),
                     "statuses": counts, "llm": {"status": "completed", "reviewed_rules": sorted(seen)},
                     "deterministic": {"status": deterministic_status,
                          "evaluated_rules": list(deterministic_coverage.get("evaluated_rules", [])),
                          "unevaluated_rules": list(deterministic_coverage.get("unevaluated_rules", [])),
                          'incomplete_rules': deterministic_coverage.get('incomplete_rules', {})},
                     "manual": {"status": "not_run", "rules": []}},
        "reviews": normalized,
        "summary": {"violations": counts["violation"], "no_issue_found": counts["no_issue_found"],
                    "uncertain": counts["uncertain"],
                    "disagreements": sum(item["disagreement"] is not None for item in normalized),
                    "nonpassing_rules": sum(counts[key] for key in ("uncertain", "unsupported", "unavailable"))}}
    handoff = {"schema_version": "1.1.0", "artifact_type": "guideline_rooted_fix_proposals",
               'approved_scope': approved_scope, 'selection_sha256': manifest['selection_sha256'],
               "guideline_ref": guideline_ref, "applied": False,
               "approval_state": "pending_human_approval", "proposals": handoffs}
    return report, handoff
