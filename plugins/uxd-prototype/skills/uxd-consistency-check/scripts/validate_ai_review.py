#!/usr/bin/env python3
# AI-generated script by GPT-6 Luna.
"""Ground local supplemental review JSON; never execute a model or merge reports."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any, NoReturn

from artifact_io import local_path, output_path, write_json
from guideline_sources import validate_manifest

def _load_manifest(path: Path | None) -> dict[str, dict[str, Any]]:
    if path is None:
        raise ValueError("guideline findings require a frozen guideline manifest")
    if not Path(path).is_file():
        raise ValueError("guideline manifest must be a regular file")
    manifest = json.loads(Path(path).read_text(encoding="utf-8"))
    validate_manifest(manifest, manifest.get("design_system") if isinstance(manifest, dict) else None)
    # Supplemental judgments share deterministic applicability, not its coverage.
    return {document["id"]: document for document in manifest["documents"]
            if document["design_system"] in {manifest["design_system"], "any"}}


def _workspace_file(value: Any, root: Path, *, absolute: bool = False) -> Path:
    if not isinstance(value, str) or not value or "\x00" in value:
        raise ValueError("file must be a non-empty workspace path")
    relative = PurePosixPath(value.replace("\\", "/"))
    if ".." in relative.parts or PureWindowsPath(value).drive or (relative.is_absolute() and not absolute):
        raise ValueError(f"path escapes workspace: {value}")
    target = (root / Path(*relative.parts)).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        raise ValueError(f"file is missing or outside workspace: {value}")
    return target


def _excerpt(finding: dict[str, Any], root: Path) -> dict[str, Any]:
    if not isinstance(finding, dict):
        raise ValueError("source evidence must be an object")
    target = _workspace_file(finding.get("file"), root)
    start, end = finding.get("line_start"), finding.get("line_end")
    lines = target.read_text(encoding="utf-8").splitlines()
    if type(start) is not int or type(end) is not int or not 1 <= start <= end <= len(lines):
        raise ValueError("invalid source line range")
    evidence = finding.get("evidence")
    if not isinstance(evidence, str) or not evidence.strip() or evidence not in "\n".join(lines[start - 1:end]):
        raise ValueError("evidence does not match source line range")
    return {"file": finding["file"], "line_start": start, "line_end": end, "evidence": evidence}


def validate_review(raw: Any, *, mode: str, source_root: Path,
                    guideline_manifest: Path | None = None, model: str | None = None,
                    screenshots: list[str] | None = None) -> dict[str, Any]:
    """Return an independent supplemental report from frozen local evidence."""
    if not isinstance(raw, dict) or raw.get("status") != "completed":
        raise ValueError("review must be a completed JSON object")
    if mode not in ("source", "visual", "internal") or raw.get("mode") != mode:
        raise ValueError("review mode must match requested mode")
    if model is not None and raw.get("model") != model:
        raise ValueError("review model must match requested model")
    if raw.get("non_deterministic") is not True:
        raise ValueError("review must declare non_deterministic=true")
    if not isinstance(raw.get("findings"), list):
        raise ValueError("review findings must be an array")
    for finding in raw["findings"]:
        if not isinstance(finding, dict):
            raise ValueError("each finding must be an object")
        for field in ("rationale", "suggestion"):
            if not isinstance(finding.get(field), str) or not finding[field].strip():
                raise ValueError(f"finding requires non-empty {field}")
        if finding.get("confidence") not in ("high", "medium", "low"):
            raise ValueError("invalid finding confidence")
    if mode == "internal":
        findings = []
        seen = set()
        root = Path(source_root).resolve()
        for finding in raw["findings"]:
            item = _excerpt(finding, root)
            item.update({field: finding[field] for field in ("rationale", "suggestion", "confidence")})
            if not isinstance(finding.get("peers"), list):
                raise ValueError("internal findings require a peers array (may be empty)")
            path = _workspace_file(item["file"], root)
            stat = path.stat()
            key = (stat.st_dev, stat.st_ino, item["line_start"], item["line_end"])
            if key in seen:
                raise ValueError("duplicate internal finding")
            seen.add(key)
            peers = [_excerpt(peer, root) for peer in finding["peers"]]
            previous = [item]
            for peer in peers:
                path = _workspace_file(peer["file"], root)
                for other in previous:
                    if (path.samefile(_workspace_file(other["file"], root))
                            and peer["line_start"] <= other["line_end"]
                            and other["line_start"] <= peer["line_end"]):
                        raise ValueError("internal evidence ranges overlap (self or repeated peer evidence)")
                previous.append(peer)
            item.update(peers=peers,
                        severity="warning", review_candidate=True, verdict="FLAGGED",
                        check_method="internal_comparison")
            item["comparison_state"] = "review_candidate" if peers else "insufficient_comparable_examples"
            if not peers:
                item["confidence"] = "low"
            findings.append(item)
        return {"schema_version": "1.0.0", "source_basis": "current_workspace",
                "status": "completed", "report_type": "supplemental_review", "mode": mode,
                "model": model or raw.get("model"), "non_deterministic": True,
                "guideline_compliance": "not_evaluated",
                "coverage": "reviewed" if findings and all(item["peers"] for item in findings)
                            else "insufficient_comparable_examples", "findings": findings,
                "summary": {"finding_count": len(findings), "error_count": 0, "warning_count": len(findings)}}
    guidelines = _load_manifest(guideline_manifest)
    root = Path(source_root).resolve()
    allowed = screenshots or []
    if mode == "visual":
        if not allowed:
            raise ValueError("visual review requires supplied screenshots")
        for screenshot in allowed:
            _workspace_file(screenshot, root, absolute=True)
    findings = []
    seen = set()
    for finding in raw["findings"]:
        if not isinstance(finding.get("guideline_id"), str) or finding["guideline_id"] not in guidelines:
            raise ValueError("unknown guideline_id or guideline not applicable to the selected design system")
        item = {field: finding[field] for field in ("guideline_id", "rationale", "suggestion", "confidence")}
        if mode == "visual":
            screenshot = finding.get("screenshot")
            if not isinstance(screenshot, str) or screenshot not in allowed:
                raise ValueError("visual finding references an unreviewed screenshot")
            seen_on = finding.get("seen_on", [screenshot])
            if (not isinstance(seen_on, list) or not seen_on
                    or any(not isinstance(path, str) or path not in allowed for path in seen_on)):
                raise ValueError("seen_on requires exact supplied screenshot references")
            item["seen_on"] = list(dict.fromkeys(seen_on))
            item["screenshot"] = screenshot
            key = (item["guideline_id"], screenshot)
        else:
            item.update(_excerpt(finding, root))
            key = (item["guideline_id"], item["file"], item["line_start"], item["line_end"])
        if key in seen:
            raise ValueError("duplicate finding")
        seen.add(key)
        item["guideline_title"] = guidelines[item["guideline_id"]]["title"]
        item["guideline_sources"] = guidelines[item["guideline_id"]]["sources"]
        guideline = guidelines[item["guideline_id"]]
        item["category"] = guideline["category"]
        check = guideline.get("check")
        candidate = check in ("candidate", "review_candidate")
        if isinstance(check, dict):
            candidate = bool(check.get("review_candidate")) or any(
                check.get(field) in ("candidate", "review_candidate")
                for field in ("automation_result", "result", "verdict"))
        candidate = candidate or any(finding.get(field) == "review_candidate" for field in ("severity", "verdict"))
        violation = (finding["confidence"] == "high" and not candidate
                     and not finding.get("review_candidate") and guideline["severity"] == "error")
        item.update(severity="error" if violation else "warning", review_candidate=not violation,
                    verdict="VIOLATION" if violation else "FLAGGED", check_method="model_review")
        findings.append(item)
    return {"schema_version": "1.0.0", "source_basis": "current_workspace",
            "status": "completed", "report_type": "supplemental_review", "mode": mode,
            "model": model or raw.get("model"), "non_deterministic": True,
            "findings": findings, "summary": {"finding_count": len(findings),
                "error_count": sum(item["severity"] == "error" for item in findings),
                "warning_count": sum(item["severity"] == "warning" for item in findings)}}


class _JsonParser(argparse.ArgumentParser):
    def error(self, message: str) -> NoReturn:
        raise ValueError(message)

    def print_help(self, file: Any = None) -> None:
        print(json.dumps({"help": self.format_help()}), file=file or sys.stdout)


def _main(argv: list[str] | None = None) -> int:
    parser = _JsonParser(description=__doc__)
    parser.add_argument("--mode", choices=("source", "visual", "internal"), required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", help="Workspace JSON output; defaults to .artifacts/consistency-MODE-review.json")
    parser.add_argument("--source-root", "--workspace", dest="source_root", required=True)
    parser.add_argument("--model")
    parser.add_argument("--screenshot", action="append", default=[])
    parser.add_argument("--guideline-manifest", type=Path)
    args = parser.parse_args(argv)
    root = Path(args.source_root).resolve()
    args.input = local_path(args.input, root)
    if not args.input.is_file():
        raise ValueError("review input must be a regular file")
    if args.guideline_manifest:
        args.guideline_manifest = local_path(args.guideline_manifest, root)
    output_value = args.output if args.output is not None else f".artifacts/consistency-{args.mode}-review.json"
    output = output_path(output_value, root)
    for protected in (Path(args.input), args.guideline_manifest):
        if protected is not None and (output == protected.resolve()
                or (output.exists() and output.samefile(protected))):
            raise ValueError("output cannot overwrite review input or guideline manifest")
    if output.exists():
        try:
            previous = json.loads(output.read_text(encoding="utf-8"))
        except (ValueError, UnicodeError) as error:
            raise ValueError("output cannot replace source evidence or an unrelated artifact") from error
        if (not isinstance(previous, dict) or previous.get("report_type") != "supplemental_review"
                or previous.get("non_deterministic") is not True):
            raise ValueError("output cannot replace a deterministic report or unrelated artifact")
    raw = json.loads(Path(args.input).read_text(encoding="utf-8"))
    result = validate_review(raw, mode=args.mode, source_root=Path(args.source_root),
                             guideline_manifest=args.guideline_manifest, model=args.model,
                             screenshots=args.screenshot)
    write_json(output, result)
    print(json.dumps({"status": result["status"], "mode": args.mode, **result["summary"]}))
    return 0


def main(argv: list[str] | None = None) -> int:
    try:
        return _main(argv)
    except (OSError, ValueError) as error:
        print(json.dumps({"status": "error", "error": str(error)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
