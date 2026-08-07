#!/usr/bin/env python3
"""
mlflow-trace-eval.py

Runs eval scorers with full MLflow tracing (spans per check).
Each run gets:
  - A unique eval_run_id (for linking to report generation)
  - prototype_key tag (e.g., RHAISTRAT-1433)
  - model tag (which LLM produced the artifacts)

Usage:
  eval "$(make mlflow-poc7)"
  uv run python3 plugins/uxd-workshop/skills/uxd-prototype-evaluate/scripts/mlflow-trace-eval.py \
    .artifacts/RHAISTRAT-1433/ --model claude-opus-4-6 --prototype-key RHAISTRAT-1433

  # Smoke test shortcut:
  make mlflow-smoke KEY=RHAISTRAT-432
"""

import argparse
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path

import mlflow

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
TESTS_DIR = SKILL_DIR / "tests"
SKILL_MAP_PATH = SKILL_DIR / "config" / "mlflow-skill-map.json"


SKILL_MODEL_DEFAULTS = {
    "eval-extract": "claude-sonnet-5",
    "eval-classify": "claude-sonnet-5",
    "eval-journey": "claude-opus-4-6",
    "eval-fix": "claude-opus-4-6",
    "eval-usability": "claude-opus-4-6",
    "eval-consistency": "claude-opus-4-6",
    "eval-report": "claude-sonnet-5",
}


def parse_args():
    parser = argparse.ArgumentParser(description="Run eval scorers with MLflow tracing")
    parser.add_argument("artifacts_dir", help="Path to artifacts directory")
    parser.add_argument("--model", default="recommended-mix",
                        help="Model override for ALL subskills, or 'recommended-mix' to use per-subskill defaults from orchestration.md")
    parser.add_argument("--prototype-key", default=None, help="Jira key (auto-detected from dir name if omitted)")
    parser.add_argument("--experiment", default="uxd-prototype-evaluate", help="MLflow umbrella experiment name")
    parser.add_argument("--scorers", nargs="+", default=["pipeline-output", "report-rendering", "script-tests"],
                        choices=["pipeline-output", "report-rendering", "script-tests", "all"],
                        help="Which scorers to run")
    parser.add_argument("--skills", nargs="+", default=None,
                        help="Optional: only log these skill experiments (e.g. eval-report eval-usability)")
    parser.add_argument("--judge", action="store_true",
                        help="Run LLM judges to grade subskill outputs based on next-stage expectations")
    parser.add_argument("--judge-model", default="sonnet",
                        help="Model to use for LLM judge calls (default: sonnet)")
    return parser.parse_args()


def resolve_model(skill_name: str, model_override: str) -> str:
    """Return the model for a given subskill. Uses per-subskill defaults unless overridden."""
    if model_override != "recommended-mix":
        return model_override
    return SKILL_MODEL_DEFAULTS.get(skill_name, "claude-opus-4-6")


def detect_prototype_key(artifacts_dir: str) -> str:
    dirname = Path(artifacts_dir).resolve().name
    if "-" in dirname and dirname[0].isalpha():
        return dirname
    return "unknown"


def run_scorer(script_path: str, artifacts_dir: str) -> dict:
    cmd = ["node", script_path, artifacts_dir]
    if "validate-artifact-schemas" in script_path:
        cmd.append("--json")
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)


def run_script_tests() -> dict:
    script = TESTS_DIR / "run-script-tests.sh"
    if not script.is_file():
        return {"results": [], "pass_count": 0, "fail_count": 0, "all_pass": True}

    result = subprocess.run(
        ["bash", str(script)],
        capture_output=True, text=True,
        cwd=str(SKILL_DIR)
    )

    output_lines = result.stdout.strip().split("\n")
    results = []
    current_test = None

    for line in output_lines:
        if line.startswith("Test "):
            raw = line.rstrip(": \t")
            current_test = raw[5:] if raw.startswith("Test ") else raw
        elif line.strip().startswith("PASS") or line.strip().startswith("FAIL"):
            verdict = line.strip()
            passed = verdict == "PASS"
            results.append({
                "scorer": current_test or "unknown",
                "pass": passed,
                "detail": verdict if passed else verdict,
            })

    pass_count = sum(1 for r in results if r["pass"])
    fail_count = sum(1 for r in results if not r["pass"])

    return {
        "results": results,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "all_pass": fail_count == 0,
    }


def _load_skill_map() -> tuple[dict, list[str], str]:
    """Load check-to-subskill routing from config/mlflow-skill-map.json."""
    with open(SKILL_MAP_PATH) as f:
        cfg = json.load(f)
    return cfg["map"], cfg["_all_skills"], cfg["default_skill"]


SKILL_MAP, ALL_SKILLS, DEFAULT_SKILL = _load_skill_map()


def _get_pipeline_version() -> str:
    """Get short git SHA for pipeline_version tag."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, cwd=str(SKILL_DIR),
        )
        return result.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


PREFIX_RULES = [
    ("journey ", "eval-journey"),
    ("depth ", "eval-journey"),
    ("prototype_url ", "eval-journey"),
    ("evaluated_at ", "eval-journey"),
    ("dimensions ", "eval-usability"),
    ("overall_score ", "eval-usability"),
    ("max_score ", "eval-usability"),
    ("personas_evaluated ", "eval-usability"),
    ("persona_overlays ", "eval-usability"),
    ("persona_selection ", "eval-usability"),
    ("persona result ", "eval-usability"),
    ("persona traces ", "eval-usability"),
    ("is array", "eval-usability"),
    ("screenshots ", "eval-journey"),
    ("exit_reason ", "eval-journey"),
    ("loop integrity", "eval-journey"),
    ("source_mode ", "eval-consistency"),
    ("visual_mode ", "eval-consistency"),
    ("summary present", "eval-consistency"),
    ("summary fields", "eval-consistency"),
    ("summary math", "eval-consistency"),
    ("key present", "eval-journey"),
    ("title present", "eval-journey"),
    ("ac_list ", "eval-classify"),
    ("tier-overrides ", "eval-classify"),
    ("overrides ", "eval-classify"),
    ("override ", "eval-classify"),
    ("forced_tier ", "eval-classify"),
    ("fix-log ", "eval-fix"),
    ("fix entries ", "eval-fix"),
    ("action values ", "eval-fix"),
    ("result values ", "eval-fix"),
    ("iterations ", "eval-fix"),
    ("no fixes ", "eval-fix"),
    ("regression ", "eval-fix"),
    ("consistency-report ", "eval-consistency"),
    ("source field ", "eval-consistency"),
    ("degraded ", "eval-consistency"),
    ("checked_at ", "eval-consistency"),
    ("violation ", "eval-consistency"),
]


def _classify_one(scorer_name: str) -> str:
    if scorer_name in SKILL_MAP:
        return SKILL_MAP[scorer_name]
    lower = scorer_name.lower()
    for prefix, skill in PREFIX_RULES:
        if lower.startswith(prefix):
            return skill
    return DEFAULT_SKILL


def classify_checks(all_checks: list[dict]) -> dict[str, list[dict]]:
    buckets: dict[str, list[dict]] = {skill: [] for skill in ALL_SKILLS}
    for check in all_checks:
        skill = _classify_one(check["scorer"])
        buckets[skill].append(check)
    return buckets


@mlflow.trace(name="scorer-execution")
def run_traced_scorer(skill_name: str, checks: list[dict], eval_run_id: str,
                      artifacts_dir: str = ""):
    span = mlflow.get_current_active_span()
    if span:
        span.set_attributes({"skill.name": skill_name, "check_count": len(checks)})

    mlflow.update_current_trace(tags={"skill": skill_name, "eval_run_id": eval_run_id})

    for check in checks:
        run_traced_check(check, skill_name)

    pass_count = sum(1 for c in checks if c["pass"])
    fail_count = sum(1 for c in checks if not c["pass"])

    # Add insights extraction as child span of scorer-execution
    insights = None
    if artifacts_dir:
        insights = run_traced_insights(skill_name, artifacts_dir)

    return {
        "results": checks,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "all_pass": fail_count == 0,
        "_insights": insights,
    }


@mlflow.trace(name="check")
def run_traced_check(check: dict, skill_name: str):
    span = mlflow.get_current_active_span()
    if span:
        span.set_attributes({
            "check.name": check["scorer"],
            "check.pass": check["pass"],
            "check.detail": check["detail"],
            "check.skill": skill_name,
        })
    return check


@mlflow.trace(name="insights-extraction")
def run_traced_insights(skill_name: str, artifacts_dir: str) -> dict:
    """Extract rich insights from artifacts and log as a traced span."""
    span = mlflow.get_current_active_span()
    insights = extract_skill_insights(skill_name, artifacts_dir)

    if span:
        span.set_attributes({
            "skill.name": skill_name,
            "insight.metrics_count": len(insights["metrics"]),
            "insight.has_content": bool(insights["insight"]),
        })
        for k, v in insights["metrics"].items():
            span.set_attributes({f"metric.{k}": v})

    return insights


PHASE_A_SKILLS = {"eval-classify", "eval-journey", "eval-fix"}
PHASE_B_SKILLS = {"eval-usability", "eval-consistency", "eval-report"}


# ── Rich insight extractors ──────────────────────────────────────────────────

def _safe_read_json(path: str) -> dict | list | None:
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _extract_consistency(artifacts_dir: str) -> dict:
    data = _safe_read_json(os.path.join(artifacts_dir, "eval", "consistency-report.json"))
    if not data:
        data = _safe_read_json(os.path.join(artifacts_dir, "consistency-report.json"))
    if not data:
        return {"metrics": {}, "params": {}, "tags": {}, "artifacts": [], "insight": ""}

    summary = data.get("summary", {})
    violations = summary.get("violations", 0)
    warnings = summary.get("warnings", 0)
    passes = summary.get("passes", 0)
    guidelines = summary.get("total_guidelines_checked", 0)

    visual = data.get("visual_mode", {})
    screenshots_checked = visual.get("screenshots_checked", 0)
    findings = visual.get("findings", [])
    finding_categories = sorted(set(f.get("category", "unknown") for f in findings))

    source_mode = data.get("source_mode", {})
    source_violations = source_mode.get("violations", [])
    source_notes = source_mode.get("notes", "")

    # Build rich markdown note
    note_lines = [f"## Consistency Check Results", ""]
    note_lines.append(f"**Source:** {data.get('source', 'unknown')} | **Degraded:** {data.get('degraded', False)}")
    note_lines.append(f"**Checked at:** {data.get('checked_at', 'unknown')}")
    note_lines.append("")
    note_lines.append(f"### Summary: {violations} violations, {warnings} warnings, {passes}/{guidelines} pass")
    note_lines.append("")

    if source_notes:
        note_lines.append(f"### Source Mode Notes")
        note_lines.append(source_notes[:500])
        note_lines.append("")

    if source_violations:
        note_lines.append("### Source Violations")
        for v in source_violations[:10]:
            note_lines.append(f"- **{v.get('severity', '?')}**: {v.get('finding', v.get('message', '?'))}")
            if v.get("file"):
                note_lines.append(f"  - File: `{v['file']}:{v.get('line', '?')}`")
        note_lines.append("")

    if findings:
        note_lines.append("### Visual Mode Findings")
        for f in findings[:10]:
            note_lines.append(f"- **{f.get('severity', '?')}** [{f.get('category', '?')}]: {f.get('finding', '?')}")
            if f.get("detail"):
                note_lines.append(f"  - {f['detail'][:200]}")
        note_lines.append("")

    artifact_path = os.path.join(artifacts_dir, "eval", "consistency-report.json")
    if not os.path.isfile(artifact_path):
        artifact_path = os.path.join(artifacts_dir, "consistency-report.json")

    return {
        "metrics": {
            "violations_count": violations,
            "warnings_count": warnings,
            "passes_count": passes,
            "guidelines_checked": guidelines,
            "screenshots_checked": screenshots_checked,
        },
        "params": {
            "source": data.get("source", "unknown"),
            "degraded": str(data.get("degraded", False)),
            "prototype_source": data.get("prototype_source", "")[:250],
        },
        "tags": {
            "finding_categories": ",".join(finding_categories) if finding_categories else "none",
        },
        "artifacts": [artifact_path] if os.path.isfile(artifact_path) else [],
        "insight": "\n".join(note_lines),
    }


def _extract_usability(artifacts_dir: str) -> dict:
    summary = _safe_read_json(os.path.join(artifacts_dir, "eval", "evaluation-summary.json"))
    if not summary:
        summary = _safe_read_json(os.path.join(artifacts_dir, "evaluation-summary.json"))
    if not summary:
        return {"metrics": {}, "params": {}, "tags": {}, "artifacts": [], "insight": ""}

    usability = summary.get("usability", {})
    overall_score = usability.get("overall_score", 0)
    max_score = usability.get("max_score", 0)
    personas = usability.get("personas_evaluated", [])
    dimensions = usability.get("dimensions", [])

    metrics = {
        "usability_score": overall_score,
        "max_score": max_score,
        "persona_count": len(personas),
        "dimension_count": len(dimensions),
    }

    worst_dim = None
    best_dim = None
    worst_score = float("inf")
    best_score = float("-inf")

    for dim in dimensions:
        score = dim.get("composite_score", 0)
        dim_id = dim.get("id", "unknown")
        metrics[f"dim/{dim_id}"] = score
        if score < worst_score and score > 0:
            worst_score = score
            worst_dim = dim.get("name", dim_id)
        if score > best_score:
            best_score = score
            best_dim = dim.get("name", dim_id)

    persona_results = _safe_read_json(os.path.join(artifacts_dir, "eval", "persona-results.json"))
    if not persona_results:
        persona_results = _safe_read_json(os.path.join(artifacts_dir, "persona-results.json"))

    confusion_total = 0
    abandoned_count = 0
    task_count = 0
    if isinstance(persona_results, list):
        task_count = len(persona_results)
        for pr in persona_results:
            confusion_total += pr.get("confusion_events", 0)
            if pr.get("abandoned", False):
                abandoned_count += 1

    metrics["confusion_events"] = confusion_total
    metrics["abandoned_count"] = abandoned_count
    metrics["task_count"] = task_count

    # Build rich markdown note
    note_lines = [f"## Usability Evaluation: {overall_score}/{max_score}", ""]
    note_lines.append(f"**Personas:** {', '.join(personas) if personas else 'none'}")
    note_lines.append(f"**Tasks evaluated:** {task_count} | **Confusion events:** {confusion_total} | **Abandoned:** {abandoned_count}")
    note_lines.append("")

    if dimensions:
        note_lines.append("### Dimension Scores")
        note_lines.append("| Dimension | Score |")
        note_lines.append("|-----------|-------|")
        for dim in sorted(dimensions, key=lambda d: d.get("composite_score", 0)):
            name = dim.get("name", dim.get("id", "?"))
            score = dim.get("composite_score", 0)
            marker = " ⚠️" if score == worst_score and worst_score > 0 else ""
            note_lines.append(f"| {name} | {score}{marker} |")
        note_lines.append("")

    if isinstance(persona_results, list) and persona_results:
        note_lines.append("### Persona Walkthrough Results")
        for pr in persona_results:
            persona_name = pr.get("persona_name", pr.get("persona", "?"))
            task = pr.get("task", "?")
            outcome = pr.get("outcome", "?")
            confusion = pr.get("confusion_events", 0)
            patience_end = pr.get("patience_end", "?")
            note_lines.append(f"**{persona_name}** — Task: {task[:80]}")
            note_lines.append(f"  - Outcome: `{outcome}` | Confusion: {confusion} | Patience: {patience_end}")
            trace = pr.get("trace", [])
            if trace:
                last_step = trace[-1]
                note_lines.append(f"  - Last thinking: _{last_step.get('what_im_thinking', '?')[:150]}_")
            note_lines.append("")

    artifact_path = os.path.join(artifacts_dir, "eval", "persona-results.json")
    if not os.path.isfile(artifact_path):
        artifact_path = os.path.join(artifacts_dir, "persona-results.json")

    return {
        "metrics": metrics,
        "params": {
            "personas_evaluated": ",".join(personas),
            "persona_count": str(len(personas)),
            "task_count": str(task_count),
        },
        "tags": {
            "worst_dimension": worst_dim or "n/a",
            "best_dimension": best_dim or "n/a",
        },
        "artifacts": [artifact_path] if os.path.isfile(artifact_path) else [],
        "insight": "\n".join(note_lines),
    }


def _extract_journey(artifacts_dir: str) -> dict:
    iteration_log = _safe_read_json(os.path.join(artifacts_dir, "eval", "iteration-log.json"))
    if not iteration_log:
        iteration_log = _safe_read_json(os.path.join(artifacts_dir, "iteration-log.json"))
    if not iteration_log:
        return {"metrics": {}, "params": {}, "tags": {}, "artifacts": [], "insight": ""}

    summary = _safe_read_json(os.path.join(artifacts_dir, "eval", "evaluation-summary.json"))
    if not summary:
        summary = _safe_read_json(os.path.join(artifacts_dir, "evaluation-summary.json"))

    iterations = iteration_log.get("iterations", [])
    exit_reason = iteration_log.get("exit_reason", "unknown")
    max_iterations = iteration_log.get("max_iterations", 3)

    latest = iterations[-1] if iterations else {}
    pass_count = latest.get("pass_count", 0)
    fail_count = latest.get("fail_count", 0)
    flagged_count = latest.get("flagged_count", 0)
    total_criteria = latest.get("total_criteria", 0)

    failing_acs = []
    details = latest.get("details", {})
    for ac_id, info in details.items():
        if info.get("verdict") == "FAIL":
            failing_acs.append(ac_id)

    journey_coverage = latest.get("journey_coverage", {})
    journey_count = len(journey_coverage)
    steps_total = sum(
        v.get("steps_completed", 0) for v in journey_coverage.values()
    )

    fix_mode = "unknown"
    if summary:
        iter_info = summary.get("iteration", {})
        fix_mode = "none" if iter_info.get("exit_reason") == "no_fix" else "iterate"

    # Build rich markdown note
    note_lines = [f"## AC Journey Results: {pass_count}/{total_criteria} Pass", ""]
    note_lines.append(f"**Exit reason:** {exit_reason} | **Iterations:** {len(iterations)}/{max_iterations} | **Fix mode:** {fix_mode}")
    note_lines.append("")

    if details:
        note_lines.append("### AC Verdicts")
        note_lines.append("| AC | Verdict | Tier |")
        note_lines.append("|----|---------|------|")
        for ac_id in sorted(details.keys(), key=lambda x: int(x.split("-")[1]) if "-" in x else 0):
            info = details[ac_id]
            verdict = info.get("verdict", "?")
            tier = info.get("tier", "?")
            icon = "✅" if verdict == "PASS" else "❌" if verdict == "FAIL" else "⚠️"
            note_lines.append(f"| {ac_id} | {icon} {verdict} | T{tier} |")
        note_lines.append("")

    if journey_coverage:
        note_lines.append("### Journey Coverage")
        seen_journeys = {}
        for ac_id, jinfo in journey_coverage.items():
            jid = jinfo.get("journey_id", "?")
            if jid not in seen_journeys:
                seen_journeys[jid] = {
                    "title": jinfo.get("journey_title", "?"),
                    "acs": [],
                    "steps": jinfo.get("steps_completed", 0),
                }
            seen_journeys[jid]["acs"].append(f"{ac_id}={jinfo.get('verdict', '?')}")

        for jid, jdata in seen_journeys.items():
            note_lines.append(f"- **{jid}**: {jdata['title']} ({jdata['steps']} steps)")
            note_lines.append(f"  - ACs: {', '.join(jdata['acs'])}")
        note_lines.append("")

    # Include AC verdicts from evaluation-summary if available
    if summary and summary.get("ac_verdicts"):
        note_lines.append("### AC Rationale (from evaluation-summary)")
        for ac in summary["ac_verdicts"][:10]:
            verdict = ac.get("verdict", "?")
            note_lines.append(f"**{ac.get('id', '?')}** [{verdict}]: {ac.get('text', '?')[:100]}")
            if ac.get("rationale"):
                note_lines.append(f"  > {ac['rationale'][:200]}")
            note_lines.append("")

    artifact_path = os.path.join(artifacts_dir, "eval", "iteration-log.json")
    if not os.path.isfile(artifact_path):
        artifact_path = os.path.join(artifacts_dir, "iteration-log.json")

    return {
        "metrics": {
            "ac_pass_count": pass_count,
            "ac_fail_count": fail_count,
            "ac_flagged_count": flagged_count,
            "total_criteria": total_criteria,
            "journey_count": journey_count,
            "steps_total": steps_total,
            "iterations_ran": len(iterations),
        },
        "params": {
            "fix_mode": fix_mode,
            "exit_reason": exit_reason,
            "max_iterations": str(max_iterations),
            "iterations_ran": str(len(iterations)),
        },
        "tags": {
            "failing_acs": ",".join(failing_acs) if failing_acs else "none",
            "exit_reason": exit_reason,
        },
        "artifacts": [artifact_path] if os.path.isfile(artifact_path) else [],
        "insight": "\n".join(note_lines),
    }


def _extract_classify(artifacts_dir: str) -> dict:
    overrides = _safe_read_json(os.path.join(artifacts_dir, "eval", "tier-overrides.json"))
    if not overrides:
        overrides = _safe_read_json(os.path.join(artifacts_dir, "tier-overrides.json"))

    extract = _safe_read_json(os.path.join(artifacts_dir, "eval", "extract-state.json"))
    if not extract:
        extract = _safe_read_json(os.path.join(artifacts_dir, "extract-state.json"))

    if not overrides and not extract:
        return {"metrics": {}, "params": {}, "tags": {}, "artifacts": [], "insight": ""}

    override_count = len(overrides) if isinstance(overrides, list) else 0

    ac_list = extract.get("ac_list", []) if extract else []
    total_acs = len(ac_list)

    t1_count = sum(1 for o in (overrides or []) if o.get("forced_tier") == "T1")
    t2_count = sum(1 for o in (overrides or []) if o.get("forced_tier") == "T2")
    t3_count = sum(1 for o in (overrides or []) if o.get("forced_tier") == "T3")

    # Build rich markdown note
    note_lines = [f"## AC Classification: {total_acs} Criteria", ""]
    note_lines.append(f"**Overrides:** {override_count} | **Distribution:** T1:{t1_count} T2:{t2_count} T3:{t3_count}")
    note_lines.append("")

    if ac_list:
        note_lines.append("### Acceptance Criteria")
        note_lines.append("| ID | Text (truncated) |")
        note_lines.append("|----|-----------------|")
        for ac in ac_list[:15]:
            text = ac.get("text", "?")[:80]
            note_lines.append(f"| {ac.get('criterion_id', '?')} | {text} |")
        note_lines.append("")

    if isinstance(overrides, list) and overrides:
        note_lines.append("### Tier Overrides")
        for o in overrides:
            note_lines.append(f"- **{o.get('criterion_id', '?')}** → {o.get('forced_tier', '?')}: {o.get('reason', '?')[:120]}")
        note_lines.append("")

    if extract and extract.get("feature_context"):
        ctx = extract["feature_context"]
        note_lines.append("### Feature Context")
        if ctx.get("problem_statement"):
            note_lines.append(f"**Problem:** {ctx['problem_statement'][:200]}")
        if ctx.get("ui_enhancements"):
            note_lines.append(f"**UI:** {ctx['ui_enhancements'][:200]}")
        note_lines.append("")

    artifact_path = os.path.join(artifacts_dir, "eval", "tier-overrides.json")
    if not os.path.isfile(artifact_path):
        artifact_path = os.path.join(artifacts_dir, "tier-overrides.json")

    return {
        "metrics": {
            "override_count": override_count,
            "t1_count": t1_count,
            "t2_count": t2_count,
            "t3_count": t3_count,
            "total_acs": total_acs,
        },
        "params": {
            "ac_count": str(total_acs),
            "tier_distribution": f"T1:{t1_count} T2:{t2_count} T3:{t3_count}",
        },
        "tags": {},
        "artifacts": [artifact_path] if os.path.isfile(artifact_path) else [],
        "insight": "\n".join(note_lines),
    }


def _extract_fix(artifacts_dir: str) -> dict:
    fix_log = _safe_read_json(os.path.join(artifacts_dir, "eval", "fix-log.json"))
    if not fix_log:
        fix_log = _safe_read_json(os.path.join(artifacts_dir, "fix-log.json"))

    iteration_log = _safe_read_json(os.path.join(artifacts_dir, "eval", "iteration-log.json"))
    if not iteration_log:
        iteration_log = _safe_read_json(os.path.join(artifacts_dir, "iteration-log.json"))

    if not fix_log and not iteration_log:
        return {"metrics": {}, "params": {}, "tags": {}, "artifacts": [], "insight": "no fix-log (single-iteration or no-fix run)"}

    if not isinstance(fix_log, list):
        fix_log = []

    fixes_applied = sum(1 for f in fix_log if f.get("result") == "applied")
    fixes_failed = sum(1 for f in fix_log if f.get("result") == "failed")
    fixes_skipped = sum(1 for f in fix_log if f.get("result") == "skipped")
    regressions = iteration_log.get("total_regressions", 0) if iteration_log else 0
    iterations_ran = len(iteration_log.get("iterations", [])) if iteration_log else 0
    exit_reason = iteration_log.get("exit_reason", "unknown") if iteration_log else "unknown"
    criteria_fixed = iteration_log.get("total_criteria_fixed", 0) if iteration_log else 0

    fixed_acs = sorted(set(f.get("ac_id", "") for f in fix_log if f.get("result") == "applied"))

    # Build rich markdown note
    note_lines = [f"## Fix Loop Results", ""]
    note_lines.append(f"**Iterations:** {iterations_ran} | **Exit:** {exit_reason} | **Criteria fixed:** {criteria_fixed}")
    note_lines.append(f"**Applied:** {fixes_applied} | **Failed:** {fixes_failed} | **Skipped:** {fixes_skipped} | **Regressions:** {regressions}")
    note_lines.append("")

    if fix_log:
        note_lines.append("### Fix Attempts")
        note_lines.append("| AC | Action | Result | Iteration |")
        note_lines.append("|----|--------|--------|-----------|")
        for f in fix_log[:20]:
            ac = f.get("ac_id", "?")
            action = f.get("action", f.get("description", "?"))[:60]
            result = f.get("result", "?")
            iteration = f.get("iteration", "?")
            icon = "✅" if result == "applied" else "❌" if result == "failed" else "⏭️"
            note_lines.append(f"| {ac} | {action} | {icon} {result} | {iteration} |")
        note_lines.append("")

    if iteration_log and iterations_ran > 1:
        note_lines.append("### Iteration Progression")
        for it in iteration_log.get("iterations", []):
            p = it.get("pass_count", 0)
            f = it.get("fail_count", 0)
            fl = it.get("flagged_count", 0)
            t = it.get("total_criteria", 0)
            note_lines.append(f"- Iter {it.get('iteration', '?')}: {p}/{t} pass, {f} fail, {fl} flagged")
        note_lines.append("")

    artifacts = []
    for fname in ["fix-log.json", "iteration-log.json"]:
        path = os.path.join(artifacts_dir, "eval", fname)
        if not os.path.isfile(path):
            path = os.path.join(artifacts_dir, fname)
        if os.path.isfile(path):
            artifacts.append(path)

    return {
        "metrics": {
            "fixes_applied": fixes_applied,
            "fixes_failed": fixes_failed,
            "fixes_skipped": fixes_skipped,
            "regressions": regressions,
            "iterations_ran": iterations_ran,
            "criteria_fixed_total": criteria_fixed,
        },
        "params": {
            "max_iterations": str(iteration_log.get("max_iterations", 3)) if iteration_log else "3",
            "exit_reason": exit_reason,
        },
        "tags": {
            "fixed_acs": ",".join(fixed_acs) if fixed_acs else "none",
        },
        "artifacts": artifacts,
        "insight": "\n".join(note_lines),
    }


def _extract_report(artifacts_dir: str) -> dict:
    summary = _safe_read_json(os.path.join(artifacts_dir, "eval", "evaluation-summary.json"))
    if not summary:
        summary = _safe_read_json(os.path.join(artifacts_dir, "evaluation-summary.json"))

    report_path = os.path.join(artifacts_dir, "eval", "evaluation-report.html")
    if not os.path.isfile(report_path):
        report_path = os.path.join(artifacts_dir, "evaluation-report.html")

    report_size_kb = 0
    if os.path.isfile(report_path):
        report_size_kb = round(os.path.getsize(report_path) / 1024, 1)

    screenshots_dir = os.path.join(artifacts_dir, "eval", "screenshots")
    if not os.path.isdir(screenshots_dir):
        screenshots_dir = os.path.join(artifacts_dir, "screenshots")
    screenshots_count = 0
    if os.path.isdir(screenshots_dir):
        screenshots_count = len([f for f in os.listdir(screenshots_dir) if f.endswith(".png")])

    status = summary.get("status", "unknown") if summary else "unknown"
    personas = summary.get("usability", {}).get("personas_evaluated", []) if summary else []
    counts = summary.get("counts", {}) if summary else {}

    # Build rich markdown note
    note_lines = [f"## Report Generation", ""]
    note_lines.append(f"**Status:** {status} | **Size:** {report_size_kb}KB | **Screenshots:** {screenshots_count}")
    note_lines.append(f"**Personas in report:** {', '.join(personas) if personas else 'none'}")
    note_lines.append("")

    if counts:
        note_lines.append("### Verdict Summary (from evaluation-summary.json)")
        note_lines.append(f"- Pass: {counts.get('pass', 0)}")
        note_lines.append(f"- Fail: {counts.get('fail', 0)}")
        note_lines.append(f"- Flagged: {counts.get('flagged', 0)}")
        note_lines.append(f"- Total: {counts.get('total', 0)}")
        note_lines.append("")

    if summary and summary.get("iteration"):
        it = summary["iteration"]
        note_lines.append("### Pipeline State")
        note_lines.append(f"- Current iteration: {it.get('current', '?')}/{it.get('max', '?')}")
        note_lines.append(f"- Exit reason: {it.get('exit_reason', '?')}")
        note_lines.append("")

    if summary and summary.get("suggestions_pending"):
        note_lines.append(f"**Suggestions pending:** {summary['suggestions_pending']}")
        note_lines.append("")

    summary_path = os.path.join(artifacts_dir, "eval", "evaluation-summary.json")
    if not os.path.isfile(summary_path):
        summary_path = os.path.join(artifacts_dir, "evaluation-summary.json")

    return {
        "metrics": {
            "report_size_kb": report_size_kb,
            "screenshots_count": screenshots_count,
            "personas_in_report": len(personas),
        },
        "params": {
            "report_status": status,
        },
        "tags": {},
        "artifacts": [summary_path] if os.path.isfile(summary_path) else [],
        "insight": "\n".join(note_lines),
    }


def extract_skill_insights(skill_name: str, artifacts_dir: str) -> dict:
    """Read actual artifact content and extract meaningful findings."""
    extractors = {
        "eval-consistency": _extract_consistency,
        "eval-usability": _extract_usability,
        "eval-journey": _extract_journey,
        "eval-classify": _extract_classify,
        "eval-fix": _extract_fix,
        "eval-report": _extract_report,
    }
    extractor = extractors.get(skill_name)
    if not extractor:
        return {"metrics": {}, "params": {}, "tags": {}, "artifacts": [], "insight": ""}
    try:
        return extractor(artifacts_dir)
    except Exception as e:
        return {"metrics": {}, "params": {}, "tags": {}, "artifacts": [], "insight": f"extraction failed: {e}"}


# ═══════════════════════════════════════════════════════════════════
# LLM JUDGES — Grade subskill outputs for next-stage readiness
# ═══════════════════════════════════════════════════════════════════

PIPELINE_STAGE_CONTEXT = {
    "eval-extract": {
        "produces": "extract-state.json (AC list, metadata, prototype URL, feature context)",
        "next_stage": "eval-classify AND eval-consistency (source-mode)",
        "next_needs": (
            "Two immediate consumers run after extract-core: "
            "(1) eval-classify needs a complete AC list where each criterion has a clear criterion_id, "
            "descriptive text explaining the WHAT and the MEASURED-BY, and source attribution. "
            "Ambiguous AC text leads to wrong tier assignments. "
            "(2) eval-consistency (source-mode) needs prototype_url, "
            "feature_context.affected_components, and workspace path to run deterministic "
            "token checks against the correct files. Missing feature_context means consistency "
            "scans the entire codebase instead of targeted components."
        ),
        "grade_dimensions": [
            "AC text specificity (vague 'shows status' vs precise 'Status column displays Kueue-specific state')",
            "Measurability clause present (how to verify the AC programmatically)",
            "Feature context completeness (affected_components, ui_enhancements listed for consistency)",
            "Source traceability (each AC linked to source ticket)",
            "Prototype URL validity (resolvable URL for both journey and consistency to use)",
        ],
    },
    "eval-classify": {
        "produces": "tier-overrides.json (AC tier assignments with justifications)",
        "next_stage": "eval-journey",
        "next_needs": (
            "Clear T1/T2/T3 tier assignments where T1 means 'testable via Playwright in the UI'. "
            "eval-journey ONLY writes Playwright tests for T1 ACs. A wrong tier means: "
            "T1 incorrectly assigned → wasted Playwright test that will fail; "
            "T1 missed → AC never gets tested. Justifications help journey understand the scope."
        ),
        "grade_dimensions": [
            "T1 accuracy (are UI-visible criteria correctly identified?)",
            "Justification quality (explains WHY, not just restates the AC)",
            "Distribution sanity (not all T1 or all T3 — reflects real AC mix)",
            "Edge cases handled (RBAC, error states, feature flags → T1 or T2?)",
        ],
    },
    "eval-journey": {
        "produces": "journey-log.json (AC verdicts with Playwright evidence)",
        "next_stage": "eval-fix",
        "next_needs": (
            "Clear PASS/FAIL/FLAGGED verdicts for each T1 AC with: "
            "root cause analysis for FAILs (what's missing/wrong in the code), "
            "screenshots as visual evidence, step-by-step actions taken. "
            "eval-fix reads FAIL root causes to know WHAT to fix and WHERE in the code."
        ),
        "grade_dimensions": [
            "Verdict accuracy (does the evidence support the verdict?)",
            "Root cause specificity for FAILs (vague 'not working' vs precise 'tooltip missing data-testid')",
            "Screenshot coverage (visual proof at key decision points)",
            "Actionability for fix stage (can a developer act on this without re-investigating?)",
        ],
    },
    "eval-fix": {
        "produces": "fix-log.json (code changes applied per AC)",
        "next_stage": "eval-journey (re-run)",
        "next_needs": (
            "A clear record of what was changed, why, and the expected outcome. "
            "The re-run of eval-journey uses the fixed code. If fixes introduce regressions, "
            "the iteration log needs to track what broke. Fix entries should be atomic "
            "(one fix per AC) and reversible."
        ),
        "grade_dimensions": [
            "Fix specificity (targeted change vs broad rewrite)",
            "Root cause alignment (fix addresses the journey's identified root cause)",
            "Regression risk assessment (does the fix touch shared code?)",
            "Completeness (all FAIL ACs have attempted fixes or skip justification)",
        ],
    },
    "eval-usability": {
        "produces": "persona-results.json (persona walkthroughs with scores)",
        "next_stage": "eval-report (via journey-log.json consolidation)",
        "next_needs": (
            "Structured persona walkthrough results with: per-dimension scores, "
            "confusion events with context, task completion outcomes, thinking traces. "
            "eval-usability must ALSO consolidate usability_dimensions into journey-log.json "
            "(Step 8) — the schema validator and report both read dimensions from journey-log, "
            "not persona-results directly. eval-report renders these into the usability section "
            "with dimension breakdowns, persona comparison tables, and refinement suggestions."
        ),
        "grade_dimensions": [
            "Persona differentiation (junior vs senior behave differently)",
            "Dimension scoring consistency (scores reflect observed behavior)",
            "Thinking trace quality (realistic cognitive friction, not generic)",
            "Suggestion actionability (specific enough for a designer to act on)",
            "Journey-log consolidation readiness (dimensions structured for Step 8 merge)",
        ],
    },
    "eval-consistency": {
        "produces": "consistency-report.json (design token audit findings)",
        "next_stage": "eval-fix (via refinement-suggestions.json)",
        "next_needs": (
            "Actionable fix suggestions with: exact file path, line number, violation category, "
            "current hardcoded value, and the correct PF design token replacement. "
            "eval-fix reads refinement-suggestions.json to decide what to fix in each iteration. "
            "Vague suggestions like 'use a token' waste fix iterations because the agent must "
            "re-investigate the file. Each suggestion must be specific enough to apply as a "
            "one-line code change without additional context gathering."
        ),
        "grade_dimensions": [
            "Fix actionability (can eval-fix apply this without re-investigating the file?)",
            "File path + line specificity (exact location vs vague 'in the codebase')",
            "Token suggestion accuracy (correct PF token for the context and value)",
            "Category coverage (colors, spacing, typography, shadows all checked)",
            "Severity signal (which violations matter most for the fix loop vs informational)",
        ],
    },
    "eval-report": {
        "produces": "evaluation-report.html (final rendered report)",
        "next_stage": "human review / publish",
        "next_needs": (
            "A complete, readable report that a designer or PM can review without "
            "needing to parse JSON. Must include: AC verdict table, usability scores, "
            "persona walkthroughs, consistency findings, screenshots, and actionable summary."
        ),
        "grade_dimensions": [
            "Data completeness (all pipeline outputs represented in the report)",
            "Visual clarity (tables, scores, and findings are scannable)",
            "Narrative coherence (summary matches the details)",
            "Actionability (reader knows what to fix next without reading raw artifacts)",
        ],
    },
}


def _call_llm_judge(skill_name: str, artifact_content: str, judge_model: str) -> dict:
    """Call claude CLI to grade a subskill's output."""
    ctx = PIPELINE_STAGE_CONTEXT.get(skill_name)
    if not ctx:
        return {"score": 0, "reasoning": "no judge context defined", "gaps": []}

    prompt = f"""You are an evaluation pipeline quality judge. Grade the following subskill output.

## Context
- **Subskill:** {skill_name}
- **Produces:** {ctx['produces']}
- **Next stage:** {ctx['next_stage']}
- **What next stage needs:** {ctx['next_needs']}

## Grading Dimensions
{chr(10).join(f'- {d}' for d in ctx['grade_dimensions'])}

## Output to Grade
```json
{artifact_content[:8000]}
```

## Instructions
Grade this output on a scale of 1-5:
- 5: Excellent — next stage can proceed without any ambiguity
- 4: Good — minor gaps but next stage can work around them
- 3: Adequate — next stage will need to make assumptions
- 2: Poor — significant gaps that will cause next-stage failures
- 1: Unusable — next stage cannot proceed

Respond in this exact JSON format (no markdown fences):
{{"score": <1-5>, "reasoning": "<2-3 sentences>", "gaps": ["<specific gap 1>", "<specific gap 2>"], "strengths": ["<strength 1>"]}}"""

    try:
        result = subprocess.run(
            ["claude", "--print", "--model", judge_model, prompt],
            capture_output=True, text=True, timeout=60,
        )
        output = result.stdout.strip()
        # Extract JSON from response (may have surrounding text)
        start = output.find("{")
        end = output.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(output[start:end])
        return {"score": 0, "reasoning": f"unparseable response: {output[:200]}", "gaps": []}
    except subprocess.TimeoutExpired:
        return {"score": 0, "reasoning": "judge call timed out", "gaps": []}
    except (json.JSONDecodeError, Exception) as e:
        return {"score": 0, "reasoning": f"judge error: {e}", "gaps": []}


def _get_artifact_for_judge(skill_name: str, artifacts_dir: str) -> str:
    """Get the primary artifact content for a subskill."""
    artifact_map = {
        "eval-extract": "extract-state.json",
        "eval-classify": "tier-overrides.json",
        "eval-journey": "journey-log.json",
        "eval-fix": "fix-log.json",
        "eval-usability": "persona-results.json",
        "eval-consistency": "consistency-report.json",
        "eval-report": "evaluation-summary.json",
    }
    fname = artifact_map.get(skill_name, "")
    if not fname:
        return ""

    for base in [os.path.join(artifacts_dir, "eval"), artifacts_dir]:
        path = os.path.join(base, fname)
        if os.path.isfile(path):
            try:
                with open(path) as f:
                    return f.read()
            except Exception:
                pass
    return ""


def run_llm_judges(skill_results: dict, artifacts_dir: str, eval_run_id: str,
                   prototype_key: str, tracking_uri: str, judge_model: str,
                   pipeline_version: str):
    """Run LLM judges for each subskill and log grades to MLflow."""
    mlflow.set_tracking_uri(tracking_uri)

    judge_results = {}
    for skill_name in skill_results:
        artifact_content = _get_artifact_for_judge(skill_name, artifacts_dir)
        if not artifact_content:
            print(f"  ⚠ {skill_name}: no artifact found for judge")
            continue

        print(f"  🧑‍⚖️ Judging {skill_name}...", end=" ", flush=True)
        grade = _call_llm_judge(skill_name, artifact_content, judge_model)
        judge_results[skill_name] = grade
        print(f"score={grade.get('score', '?')}/5")

        # Log judge result to the subskill's experiment
        mlflow.set_experiment(skill_name)
        with mlflow.start_run(run_name=f"{eval_run_id}/{skill_name}/judge"):
            mlflow.set_tag("prototype_key", prototype_key)
            mlflow.set_tag("eval_run_id", eval_run_id)
            mlflow.set_tag("skill", skill_name)
            mlflow.set_tag("run_type", "llm-judge")
            mlflow.set_tag("judge_model", judge_model)
            mlflow.set_tag("pipeline_version", pipeline_version)
            mlflow.set_tag("team", "uxd")
            mlflow.set_tag("pipeline", "prototype-evaluator")

            ctx = PIPELINE_STAGE_CONTEXT.get(skill_name, {})
            mlflow.log_param("next_stage", ctx.get("next_stage", "unknown"))
            mlflow.log_param("judge_model", judge_model)

            score = grade.get("score", 0)
            mlflow.log_metric("judge_score", score)
            mlflow.log_metric("judge_pass", 1.0 if score >= 4 else 0.0)

            # Build judge note
            note_lines = [
                f"## LLM Judge: {skill_name} → {ctx.get('next_stage', '?')}",
                f"**Score:** {score}/5 | **Model:** {judge_model}",
                "",
                f"**Reasoning:** {grade.get('reasoning', 'n/a')}",
                "",
            ]
            gaps = grade.get("gaps", [])
            if gaps:
                note_lines.append("### Gaps (next stage will struggle with)")
                for g in gaps:
                    note_lines.append(f"- {g}")
                note_lines.append("")
            strengths = grade.get("strengths", [])
            if strengths:
                note_lines.append("### Strengths")
                for s in strengths:
                    note_lines.append(f"- {s}")
                note_lines.append("")

            note_lines.append("### What Next Stage Needs")
            note_lines.append(ctx.get("next_needs", ""))

            mlflow.set_tag("mlflow.note.content", "\n".join(note_lines))

    return judge_results


def run_skill_in_experiment(skill_name: str, checks: list[dict], eval_run_id: str,
                            prototype_key: str, model_override: str, tracking_uri: str,
                            pipeline_version: str, artifacts_dir: str = "") -> dict:
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(skill_name)

    phase = "a" if skill_name in PHASE_A_SKILLS else "b"
    model = resolve_model(skill_name, model_override)

    with mlflow.start_run(run_name=f"{eval_run_id}/{skill_name}"):
        mlflow.set_tag("prototype_key", prototype_key)
        mlflow.set_tag("model", model)
        mlflow.set_tag("eval_run_id", eval_run_id)
        mlflow.set_tag("skill", skill_name)
        mlflow.set_tag("pipeline_version", pipeline_version)
        mlflow.set_tag("team", "uxd")
        mlflow.set_tag("pipeline", "prototype-evaluator")
        mlflow.set_tag("parent_eval_run_id", eval_run_id)
        mlflow.set_tag("phase", phase)

        mlflow.log_param("prototype_key", prototype_key)
        mlflow.log_param("model", model)
        mlflow.log_param("skill", skill_name)
        mlflow.log_param("check_count", len(checks))

        output = run_traced_scorer(skill_name, checks, eval_run_id, artifacts_dir)

        mlflow.log_metric("pass_count", output["pass_count"])
        mlflow.log_metric("fail_count", output["fail_count"])
        mlflow.log_metric("pass_rate", output["pass_count"] / max(len(output["results"]), 1))
        mlflow.log_metric("all_pass", 1.0 if output["all_pass"] else 0.0)

        # Build combined note: rich insights + check summary
        note_parts = []
        insights = output.get("_insights")
        if insights:
            for k, v in insights["metrics"].items():
                mlflow.log_metric(k, v)
            for k, v in insights["params"].items():
                try:
                    mlflow.log_param(k, v)
                except mlflow.exceptions.MlflowException:
                    pass
            for k, v in insights["tags"].items():
                mlflow.set_tag(k, v)
            for artifact_path in insights["artifacts"]:
                if os.path.isfile(artifact_path):
                    try:
                        mlflow.log_artifact(artifact_path)
                    except (OSError, mlflow.exceptions.MlflowException):
                        pass
            if insights["insight"]:
                note_parts.append(insights["insight"])

        # Append check results summary so it's visible in Notes when traces fail
        note_parts.append(f"\n---\n## Schema Checks ({output['pass_count']}/{len(output['results'])} pass)\n")
        failures = [c for c in checks if not c["pass"]]
        if failures:
            note_parts.append("### Failures")
            for f in failures:
                note_parts.append(f"- **{f['scorer']}**: {f['detail']}")
            note_parts.append("")
        passes = [c for c in checks if c["pass"]]
        if passes:
            note_parts.append(f"<details><summary>{len(passes)} passing checks</summary>\n")
            for p in passes:
                note_parts.append(f"- {p['scorer']}: {p['detail']}")
            note_parts.append("</details>")

        combined_note = "\n".join(note_parts)
        mlflow.set_tag("mlflow.note.content", combined_note)

    return output


def main():
    args = parse_args()
    artifacts_dir = os.path.abspath(args.artifacts_dir)
    prototype_key = args.prototype_key or detect_prototype_key(artifacts_dir)
    eval_run_id = f"eval-{prototype_key}-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    pipeline_version = _get_pipeline_version()

    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://127.0.0.1:5000")

    scorers = args.scorers
    if "all" in scorers:
        scorers = ["pipeline-output", "report-rendering", "script-tests"]

    all_checks = []
    for scorer_name in scorers:
        if scorer_name == "script-tests":
            output = run_script_tests()
        else:
            script_map = {
                "pipeline-output": "scripts/validate-artifact-schemas.js",
                "report-rendering": "scripts/validate-report-rendering.js",
            }
            script_rel = script_map[scorer_name]
            script_path = str(SKILL_DIR / script_rel)
            try:
                output = run_scorer(script_path, artifacts_dir)
            except json.JSONDecodeError as e:
                print(f"ERROR: scorer {scorer_name} returned non-JSON: {e}", file=sys.stderr)
                sys.exit(2)
        all_checks.extend(output["results"])

    skill_buckets = classify_checks(all_checks)
    skill_order = list(ALL_SKILLS)
    if args.skills:
        wanted = set(args.skills)
        unknown = wanted - set(ALL_SKILLS)
        if unknown:
            print(f"ERROR: unknown --skills {sorted(unknown)}. Valid: {ALL_SKILLS}", file=sys.stderr)
            sys.exit(2)
        skill_order = [s for s in ALL_SKILLS if s in wanted]

    results = {}
    for skill_name in skill_order:
        checks = skill_buckets[skill_name]
        if not checks:
            continue
        results[skill_name] = run_skill_in_experiment(
            skill_name, checks, eval_run_id,
            prototype_key, args.model, tracking_uri,
            pipeline_version, artifacts_dir
        )

    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(args.experiment)
    exp = mlflow.get_experiment_by_name(args.experiment)
    experiment_id = exp.experiment_id if exp else "0"

    total_pass = sum(r["pass_count"] for r in results.values())
    total_checks = sum(len(r["results"]) for r in results.values())
    all_pass = bool(results) and all(r["all_pass"] for r in results.values())

    with mlflow.start_run(run_name=eval_run_id) as run:
        mlflow.set_tag("prototype_key", prototype_key)
        mlflow.set_tag("model", args.model)
        mlflow.set_tag("eval_run_id", eval_run_id)
        mlflow.set_tag("skill", "uxd-prototype-evaluate")
        mlflow.set_tag("pipeline_version", pipeline_version)
        mlflow.set_tag("team", "uxd")
        mlflow.set_tag("pipeline", "prototype-evaluator")
        mlflow.set_tag("skills", ",".join(results.keys()))
        mlflow.set_tag("scorers", ",".join(scorers))
        if args.model == "recommended-mix":
            models_used = sorted(set(
                resolve_model(s, args.model) for s in results.keys()
            ))
            mlflow.set_tag("models_used", ",".join(models_used))

        mlflow.log_param("prototype_key", prototype_key)
        mlflow.log_param("model", args.model)
        mlflow.log_param("skill", "uxd-prototype-evaluate")
        mlflow.log_param("skill_count", len(results))

        for skill_name, output in results.items():
            prefix = skill_name.replace("-", "_")
            mlflow.log_metric(f"{prefix}/pass_count", output["pass_count"])
            mlflow.log_metric(f"{prefix}/fail_count", output["fail_count"])
            mlflow.log_metric(f"{prefix}/pass_rate", output["pass_count"] / max(len(output["results"]), 1))

        mlflow.log_metric("total/pass_count", total_pass)
        mlflow.log_metric("total/check_count", total_checks)
        mlflow.log_metric("total/pass_rate", total_pass / max(total_checks, 1))
        mlflow.log_metric("total/all_pass", 1.0 if all_pass else 0.0)
        umbrella_run_id = run.info.run_id

    base = tracking_uri.rstrip("/")
    print(f"✓ eval_run_id: {eval_run_id}")
    print(f"  prototype_key: {prototype_key}")
    if args.model == "recommended-mix":
        print(f"  model: recommended-mix (per-subskill defaults from orchestration.md)")
        for s in sorted(results.keys()):
            print(f"    {s}: {resolve_model(s, args.model)}")
    else:
        print(f"  model: {args.model} (override — all subskills)")
    print(f"  total: {total_pass}/{total_checks} ({'ALL PASS' if all_pass else 'FAILURES'})")
    print(f"  experiments: {', '.join(results.keys()) or '(none)'}")
    print(f"  OPEN: {base}/#/experiments/{experiment_id}/runs/{umbrella_run_id}")

    for skill_name, output in results.items():
        failures = [r for r in output["results"] if not r["pass"]]
        status = "✓" if output["all_pass"] else "✗"
        print(f"    {status} {skill_name}: {output['pass_count']}/{len(output['results'])}")
        if failures:
            for f in failures[:3]:
                print(f"      - {f['scorer']}: {f['detail']}")

    # Run LLM judges if requested
    if args.judge:
        print(f"\n🧑‍⚖️ Running LLM judges (model: {args.judge_model})...")
        judge_results = run_llm_judges(
            results, artifacts_dir, eval_run_id,
            prototype_key, tracking_uri, args.judge_model,
            pipeline_version,
        )
        print(f"\n  Judge Summary:")
        for skill, grade in judge_results.items():
            score = grade.get("score", 0)
            icon = "✓" if score >= 4 else "⚠" if score >= 3 else "✗"
            print(f"    {icon} {skill}: {score}/5 — {grade.get('reasoning', '')[:80]}")

    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
