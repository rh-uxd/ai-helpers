#!/usr/bin/env python3
# AI-generated script by GPT-6 Luna.
"""Check explicitly selected product policy offline; no baseline or peer audit."""
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import uuid

from artifact_io import local_path, output_path, protect_inputs, write_json
from guideline_sources import load_guidelines, load_manifest
from scoped_sources import read_sources, mask_comments
from report_contract import validate_report

SCHEMA_VERSION = "1.0.0"


class RootHTMLParser(HTMLParser):
    """Read the first actual HTML tag, excluding attribute-value lookalikes."""

    def __init__(self):
        super().__init__()
        self.classes = []
        self.position = None

    def handle_starttag(self, tag, attrs):
        if tag == "html" and self.position is None:
            self.position = self.getpos()
            # HTML attribute names are normalized; class tokens remain case-sensitive.
            self.classes = next((value or "" for name, value in attrs if name == "class"), "").split()


class CustomCSSParser(HTMLParser):
    """Find authored CSS in HTML without depending on tag/attribute casing or quoting."""

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.text = text
        self.matches = []

    def handle_starttag(self, tag, attrs):
        start = self.getpos()
        offset = sum(len(line) for line in self.text.splitlines(keepends=True)[:start[0] - 1]) + start[1]
        markup = self.get_starttag_text()
        names = {name for name, _ in attrs}
        values = {name: value or "" for name, value in attrs}
        if "style" in names or tag == "style":
            self.matches.append((offset, markup))
        if tag == "link" and "stylesheet" in values.get("rel", "").lower().split():
            self.matches.append((offset, markup))


def jsx_style_candidates(text):
    """Bounded opening-tag scan, not a JSX/JS parser. Coverage always incomplete.

    Skip balanced {...} attribute expressions so an arrow's > cannot end a tag.
    Backticks, comments, regex literals and spreads may hide syntax; abstain on
    those constructs. No negative result from JavaScript earns a policy pass.
    """
    matches = []
    style_attribute = re.compile(r'\s+style\s*=')
    for start in re.finditer(r'<[A-Za-z][\w.:-]*\b', text):
        position = start.end()
        depth, quote, escaped = 0, None, False
        while position < len(text):
            char = text[position]
            if quote:
                if escaped:
                    escaped = False
                elif char == '\\':
                    escaped = True
                elif char == quote:
                    quote = None
            elif char in ('"', "'"):
                quote = char
            elif char == '`' or text[position:position + 2] in ('//', '/*'):
                break
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth < 0:
                    break
            elif char == '>' and depth == 0:
                break
            elif depth == 0 and char.isspace():
                attribute = style_attribute.match(text, position)
                if attribute:
                    matches.append((position + len(attribute.group()) - len(attribute.group().lstrip()), attribute.group().strip()))
            position += 1
    return list(dict.fromkeys(matches))


def evaluate(documents, files, changed_lines=None, incomplete=None):
    findings = []
    evaluated = []
    incomplete = {} if incomplete is None else incomplete
    for document in documents:
        check = document.get("check")
        # Unsupported checks remain unevaluated; prose never authorizes execution.
        # Historical baselines are retained as provenance, never active policy.
        if document.get("kind") == "baseline" or check not in {"no-custom-css", "required-html-class"} or not files:
            continue
        # A stylesheet cannot supply a root HTML element.
        suffixes = {"required-html-class": {".html", ".htm"}}.get(check)
        targets = {file: text for file, text in files.items()
                   if suffixes is None or Path(file).suffix.lower() in suffixes}
        if not targets:
            continue
        # Only complete syntax coverage can turn zero matches into a pass.
        finding_start = len(findings)
        incomplete_files = []
        for file, text in targets.items():
            text = mask_comments(text)
            suffix = Path(file).suffix.lower()
            matches = []
            if check == "no-custom-css":
                if suffix in {".css", ".scss"}:
                    matches.append((0, "Authored stylesheet: " + file))
                elif suffix in {'.jsx', '.tsx', '.js', '.ts'}:
                    incomplete_files.append(file)
                    matches = jsx_style_candidates(text)
                else:
                    parser = CustomCSSParser(text)
                    parser.feed(text)
                    parser.close()
                    matches = parser.matches
            elif check == "required-html-class" and suffix in {".html", ".htm"}:
                required = document.get("parameters", {}).get("required_class")
                if not isinstance(required, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", required):
                    raise ValueError("required-html-class needs a required_class scalar")
                root = RootHTMLParser()
                root.feed(text)
                if required not in root.classes:
                    offset = (sum(len(line) for line in text.splitlines(keepends=True)[:root.position[0] - 1])
                              + root.position[1]) if root.position else 0
                    matches = [(offset, "Missing required root HTML class: " + required)]

            for offset, value in matches:
                line = text.count("\n", 0, offset) + 1
                end_line = line + value.count("\n")
                # CSS/SCSS files flag the whole file when they appear in the diff at all (no per-line granularity).
                whole_file = check == "no-custom-css" and suffix in {".css", ".scss"}
                if changed_lines is not None and not (bool(changed_lines.get(file)) if whole_file else any(number in changed_lines.get(file, set()) for number in range(line, end_line + 1))):
                    continue
                candidate = check == 'no-custom-css' and suffix in {'.jsx', '.tsx', '.js', '.ts'}
                severity = 'warning' if candidate else document["severity"]
                findings.append({"guideline_id": document["id"], "guideline_title": document["title"],
                                 "category": document["category"], "severity": severity,
                                 "verdict": "VIOLATION" if severity == "error" else "FLAGGED",
                                 "confidence": 'low' if candidate else "high", "review_candidate": candidate,
                                 "file": file, "line": None if whole_file else line,
                                 "property": document["id"], "value": value,
                                 "description": ('Bounded JSX styling candidate requires review; syntax coverage is incomplete.' if candidate
                                     else "Source does not satisfy the selected guideline's explicit policy."),
                                 "suggestion": document.get('review_text', document["text"].split("## Rule", 1)[-1]).strip(),
                                 "check_method": 'automated_candidate' if candidate else "automated",
                                 "pf_doc_url": document.get("source_url")})
        if incomplete_files:
            incomplete[document['id']] = {'status': 'incomplete', 'files': sorted(incomplete_files),
                'reason': 'Bounded JSX candidate scan; JavaScript/JSX absence is not a deterministic pass.'}
        if not incomplete_files or len(findings) > finding_start:
            evaluated.append(document['id'])
    return findings, evaluated


def guideline_coverage(documents, evaluated, sources):
    def group(kinds):
        source_ids = {identity for source in sources if source["kind"] in kinds for identity in source["document_ids"]}
        selected = [doc["id"] for doc in documents if doc["id"] in source_ids]
        checked = [identity for identity in selected if identity in evaluated]
        return {"status": "evaluated" if checked and len(checked) == len(selected) else "partially_evaluated" if checked else "not_evaluated",
                "selected_rules": selected, "evaluated_rules": checked}
    return {"status": "evaluated" if evaluated and len(evaluated) == len(documents) else "partially_evaluated" if evaluated else "not_evaluated",
            # Legacy baseline provenance remains in the snapshot, never coverage.
            "baseline": {"status": "not_evaluated", "selected_rules": [], "evaluated_rules": []},
            "workspace": group({"workspace", "explicit"})}


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--workspace", "--src", "--source-dir", dest="workspace", required=True)
    parser.add_argument("--design-system", help="Applicability label only; never loads policy")
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
    parser.add_argument('--review-selection', help='approved structured model selection; limits scope collection independently of Git delta')
    args = parser.parse_args()
    workspace = Path(args.workspace).expanduser().resolve()
    if not workspace.is_dir():
        parser.error("workspace must be an existing directory")
    if args.guideline_manifest and args.guidelines:
        parser.error("a frozen manifest cannot be combined with new guidelines")
    approved_scope = None
    proposal = None
    if args.review_selection:
        from guideline_io import read_confined
        from guideline_selection import validate_selection
        selection = json.loads(read_confined(workspace, local_path(args.review_selection, workspace)).decode('utf-8'))
        proposal = validate_selection(workspace, selection)
        if proposal['schema_version'] != '1.1.0' or proposal['method'] != 'model':
            raise ValueError('structured model selection required for review scope collection')
        approved_scope = proposal['review_scope']
        if args.design_system is not None and args.design_system != proposal['design_system']:
            raise ValueError('design system differs from approved applicability label')
        args.design_system = proposal['design_system']
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
    if proposal is not None:
        from review_scope import normalized_text
        documents = [dict(doc) for doc in documents]
        for doc in documents:
            selected = [s for s in proposal['sources'] if s['locator']['kind'] == 'local'
                and str(Path(proposal['index']).parent / s['locator']['path']) in doc['sources']
                and s['material_sha256'] == doc['sha256']]
            if len(selected) != 1:
                raise ValueError('deterministic guideline is outside approved source selection')
            bounds = selected[0]['section_bounds']
            doc['review_text'] = normalized_text(doc['text'])[bounds['start']:bounds['end']]
    files, changed_lines, inputs = read_sources(workspace, args.changed, args.base_ref, args.tracked_only, args.merge_base,
                                                approved_scope=approved_scope)
    # In changed mode, skip files that had no lines in the diff (changed_lines maps to empty set for unchanged files).
    targets = files if changed_lines is None else {file: text for file, text in files.items() if changed_lines.get(file)}
    # "any" is the wildcard design_system sentinel; guidelines with it apply to every design system.
    applicable_documents = [doc for doc in documents if doc.get("design_system") in {args.design_system, "any"}]
    incomplete = {}
    findings, evaluated = evaluate(applicable_documents, targets, changed_lines, incomplete)
    error_ids = {finding["guideline_id"] for finding in findings if finding["severity"] == "error"}
    warning_ids = {finding["guideline_id"] for finding in findings} - error_ids
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:12]
    if args.report_dir and args.json_file:
        parser.error("choose --json-file or --report-dir, not both")
    destination = output_path(args.json_file or str(Path(args.report_dir or ".artifacts/consistency") / run_id / "consistency-report.json"), workspace)
    protected = [source for doc in context["documents"] for source in doc["sources"]]
    if args.guideline_manifest:
        protected.append(str(local_path(args.guideline_manifest, workspace)))
    if args.review_selection:
        protected.append(str(local_path(args.review_selection, workspace)))
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
        "internal_consistency": {"status": "not_evaluated",
                                 "reason": "Peer audits are outside selected product-guideline scope.",
                                 "comparisons": [], "findings": [], "uncompared_targets": []},
        "inputs": inputs,
        "coverage": {"evaluated_rules": evaluated,
                      "unevaluated_rules": [doc["id"] for doc in documents if doc["id"] not in evaluated]},
        "source_mode": {"ran": True, "violations": findings},
        "visual_mode": {"ran": False, "screenshots_checked": 0, "findings": []},
        "summary": {"total_guidelines_checked": len(evaluated), "violations": len(error_ids),
                    "warnings": len(warning_ids), "passes": len(evaluated) - len(error_ids | warning_ids)},
    }
    if incomplete:
        report['coverage']['incomplete_rules'] = incomplete
        report['guideline_consistency']['status'] = 'partially_evaluated'
        report['guideline_consistency']['workspace']['status'] = 'partially_evaluated'
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
