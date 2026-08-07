#!/usr/bin/env python3
"""
mlflow-compare-models.py

Run each eval sub-skill via claude --print (same dispatch as eval-iterate)
with both Sonnet 5 and Opus 4.6, capturing tokens/timing/traces to per-skill
MLflow experiments.

Usage:
  eval "$(make mlflow-poc7)"
  uv run python3 plugins/uxd-workshop/skills/uxd-prototype-evaluate/scripts/mlflow-compare-models.py \
    --key RHAISTRAT-1433 \
    --skills eval-extract eval-classify eval-consistency eval-report \
    --models claude-sonnet-5 claude-opus-4-6

  # Run all skills (requires prototype server at --url):
  uv run python3 plugins/uxd-workshop/skills/uxd-prototype-evaluate/scripts/mlflow-compare-models.py \
    --key RHAISTRAT-1433 --url http://127.0.0.1:9204 --skills all

  # Dry-run (show prompts without executing):
  uv run python3 plugins/uxd-workshop/skills/uxd-prototype-evaluate/scripts/mlflow-compare-models.py --dry-run --skills all
"""

import argparse
import json
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = SKILL_DIR.parents[3]  # ai-helpers root

sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, os.path.expanduser(
    "~/.claude/plugins/cache/opendatahub-skills/agent-eval-harness/1.4.0"))

import mlflow
from agent_eval.agent.stream_capture import (
    extract_usage,
    make_prompt_event,
    inject_timestamp,
)
from agent_eval.mlflow.trace_builder import build_trace, log_trace

PHASES_DIR = SKILL_DIR / "references" / "phases"

SKILL_PROMPTS = {
    "eval-extract": (
        f"Read {PHASES_DIR / 'eval-extract.md'} and execute it with:\n"
        "  Key: {key}\n"
        "  --phase=core\n"
        "  --workspace={workspace}\n"
        "Produce: extract-state.json, mr-delta.json in .artifacts/{key}/"
    ),
    "eval-classify": (
        f"Read {PHASES_DIR / 'eval-classify.md'} and execute it.\n"
        "  Key: {key}\n"
        "  Artifacts dir: .artifacts/{key}/\n"
        "  Input: .artifacts/{key}/extract-state.json\n"
        "Produce: evaluation-report.csv with tier assignments in .artifacts/{key}/"
    ),
    "eval-consistency": (
        f"Read {PHASES_DIR / 'eval-consistency.md'} and execute it with:\n"
        "  --mode=source\n"
        "  Key: {key}\n"
        "  Workspace: {workspace}\n"
        "  Artifacts dir: .artifacts/{key}/\n"
        "Produce: consistency-report.json in .artifacts/{key}/"
    ),
    "eval-journey": (
        f"Read {PHASES_DIR / 'eval-journey.md'} and execute it with:\n"
        "  --mode=informed\n"
        "  Key: {key}\n"
        "  URL: {url}\n"
        "  Workspace: {workspace}\n"
        "  Artifacts dir: .artifacts/{key}/\n"
        "Verify acceptance criteria against the live prototype."
    ),
    "eval-fix": (
        f"Read {PHASES_DIR / 'eval-fix.md'} and execute it.\n"
        "  Key: {key}\n"
        "  Workspace: {workspace}\n"
        "  Artifacts dir: .artifacts/{key}/\n"
        "  Input: .artifacts/{key}/refinement-suggestions.json\n"
        "Apply fixes from refinement-suggestions.json to the workspace."
    ),
    "eval-usability": (
        f"Read {PHASES_DIR / 'eval-usability.md'} and execute it.\n"
        "  Key: {key}\n"
        "  URL: {url}\n"
        "  Workspace: {workspace}\n"
        "  Artifacts dir: .artifacts/{key}/\n"
        "Run per-persona Playwright walkthroughs and score 7 usability dimensions."
    ),
    "eval-report": (
        f"Read {PHASES_DIR / 'eval-report.md'} and execute it with:\n"
        "  Key: {key}\n"
        "  Artifacts dir: .artifacts/{key}/\n"
        '  --note="Phase A: all_pass (1 iteration). Phase B: 17/21"\n'
        "Render the evaluation report HTML from existing artifacts."
    ),
}

SERVER_REQUIRED = {"eval-journey", "eval-usability"}

ALL_SKILLS = list(SKILL_PROMPTS.keys())
DEFAULT_MODELS = ["claude-sonnet-4-6", "claude-sonnet-5", "claude-opus-4-6"]

TESTS_DIR = SKILL_DIR / "tests"

SKILL_VALIDATORS = {
    "eval-extract": ("extract-state.json", None),
    "eval-classify": ("evaluation-report.csv", None),
    "eval-consistency": ("consistency-report.json", None),
    "eval-report": ("evaluation-report.html", str(SCRIPT_DIR / "validate-report-rendering.js")),
    "eval-journey": ("journey-log.json", str(SCRIPT_DIR / "validate-verdicts.js")),
    "eval-usability": ("persona-results.json", str(SCRIPT_DIR / "validate-phase-b-output.js")),
}

import csv
from io import StringIO


def _check_extract(artifacts_dir: str) -> list[tuple[str, bool, str]]:
    checks = []
    p = Path(artifacts_dir) / "extract-state.json"
    if not p.is_file():
        return [("extract-state.json exists", False, "missing")]
    try:
        data = json.loads(p.read_text())
    except (json.JSONDecodeError, OSError) as e:
        return [("extract-state.json valid JSON", False, str(e))]

    checks.append(("has key", bool(data.get("key")), data.get("key", "missing")))
    checks.append(("has title", bool(data.get("title")), data.get("title", "missing")[:60] if data.get("title") else "missing"))

    acs = data.get("ac_list", [])
    checks.append(("ac_list non-empty", len(acs) >= 1, f"{len(acs)} ACs"))
    if acs:
        ac0 = acs[0] if isinstance(acs[0], dict) else {}
        has_fields = all(k in ac0 for k in ("criterion_id", "text"))
        checks.append(("ACs have criterion_id+text", has_fields,
                        f"first AC keys: {list(ac0.keys())[:5]}"))

    ps = data.get("persona_selection", {})
    checks.append(("persona_selection.selected", bool(ps.get("selected")),
                    f"selected: {ps.get('selected', 'missing')}"))
    checks.append(("persona_selection.reasoning", bool(ps.get("reasoning")),
                    "present" if ps.get("reasoning") else "missing"))

    journeys = data.get("journey_definitions", [])
    checks.append(("journey_definitions non-empty", len(journeys) >= 1, f"{len(journeys)} journeys"))
    return checks


def _check_classify(artifacts_dir: str) -> list[tuple[str, bool, str]]:
    checks = []
    p = Path(artifacts_dir) / "evaluation-report.csv"
    if not p.is_file():
        return [("evaluation-report.csv exists", False, "missing")]
    text = p.read_text()
    try:
        lines = [l for l in text.splitlines() if not l.startswith("#")]
        reader = csv.reader(StringIO("\n".join(lines)))
        rows = list(reader)
    except Exception as e:
        return [("CSV parseable", False, str(e))]

    checks.append(("CSV has header + data rows", len(rows) >= 2, f"{len(rows)} rows"))
    if len(rows) >= 2:
        header = rows[0]
        required = {"criterion_id", "tier", "criterion_text"}
        has_cols = required.issubset(set(header))
        checks.append(("has required columns", has_cols,
                        f"columns: {header[:5]}"))
        data_rows = rows[1:]
        tier_idx = header.index("tier") if "tier" in header else -1
        if tier_idx >= 0:
            tiers = {r[tier_idx] for r in data_rows if len(r) > tier_idx}
            valid_tiers = tiers.issubset({"T1", "T2", "T3", "T1a", "T1b"})
            checks.append(("tiers are valid values", valid_tiers, f"tiers found: {tiers}"))
    return checks


def _check_consistency(artifacts_dir: str) -> list[tuple[str, bool, str]]:
    checks = []
    p = Path(artifacts_dir) / "consistency-report.json"
    if not p.is_file():
        return [("consistency-report.json exists", False, "missing")]
    try:
        data = json.loads(p.read_text())
    except (json.JSONDecodeError, OSError) as e:
        return [("consistency-report.json valid JSON", False, str(e))]

    checks.append(("has source_mode", "source_mode" in data, "present" if "source_mode" in data else "missing"))
    sm = data.get("source_mode", {})
    if sm.get("ran"):
        violations = sm.get("violations", [])
        checks.append(("source_mode has violations list", isinstance(violations, list),
                        f"{len(violations)} violations"))
        if violations:
            v0 = violations[0]
            has_fields = all(k in v0 for k in ("guideline_id", "severity"))
            checks.append(("violations have guideline_id+severity", has_fields,
                            f"keys: {list(v0.keys())[:5]}"))

    summary = data.get("summary", {})
    checks.append(("summary present", bool(summary), "present" if summary else "missing"))
    return checks


def _check_usability(artifacts_dir: str) -> list[tuple[str, bool, str]]:
    checks = []
    p = Path(artifacts_dir) / "persona-results.json"
    if not p.is_file():
        return [("persona-results.json exists", False, "missing")]
    try:
        data = json.loads(p.read_text())
    except (json.JSONDecodeError, OSError) as e:
        return [("persona-results.json valid JSON", False, str(e))]

    entries = data if isinstance(data, list) else data.get("personas", [])
    checks.append(("has persona entries", len(entries) >= 1, f"{len(entries)} entries"))
    if not entries:
        return checks

    e0 = entries[0]
    has_pid = "persona_id" in e0
    checks.append(("uses persona_id (not legacy persona)", has_pid,
                    "persona_id" if has_pid else "uses legacy 'persona' key"))
    checks.append(("has persona_name", bool(e0.get("persona_name")),
                    e0.get("persona_name", "missing")[:40] if e0.get("persona_name") else "missing"))
    checks.append(("has task_index (not task_idx)", "task_index" in e0,
                    "task_index" if "task_index" in e0 else ("has task_idx" if "task_idx" in e0 else "missing")))
    checks.append(("has trace array", isinstance(e0.get("trace"), list) and len(e0["trace"]) > 0,
                    f"{len(e0.get('trace', []))} trace steps"))
    checks.append(("has abandoned field", "abandoned" in e0,
                    f"abandoned={e0.get('abandoned')}" if "abandoned" in e0 else "missing"))

    ce = e0.get("confusion_events")
    if ce is not None:
        ce_type = "array" if isinstance(ce, list) else "number" if isinstance(ce, (int, float)) else type(ce).__name__
        checks.append(("confusion_events type", isinstance(ce, (int, float, list)),
                        f"type={ce_type}"))
    return checks


INLINE_VALIDATORS = {
    "eval-extract": _check_extract,
    "eval-classify": _check_classify,
    "eval-consistency": _check_consistency,
    "eval-usability": _check_usability,
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Compare models across eval sub-skills with MLflow tracing")
    parser.add_argument("--key", default="RHAISTRAT-1433",
                        help="Jira key / artifacts directory name")
    parser.add_argument("--url", default="http://127.0.0.1:9204",
                        help="Prototype URL (for server-requiring skills)")
    parser.add_argument("--workspace", default=None,
                        help="Workspace path (auto-detected from artifacts if omitted)")
    parser.add_argument("--skills", nargs="+", default=["eval-extract", "eval-classify",
                                                         "eval-consistency", "eval-report"],
                        choices=ALL_SKILLS + ["all"],
                        help="Which sub-skills to run")
    parser.add_argument("--models", nargs="+", default=DEFAULT_MODELS,
                        help="Models to compare")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print prompts without executing")
    parser.add_argument("--sequential", action="store_true",
                        help="Run skills sequentially (default: parallel per model)")
    return parser.parse_args()


def validate_skill_output(skill: str, artifacts_dir: str) -> dict:
    metrics = {"artifact_exists": 0, "quality_pass": 0,
               "validator_checks_passed": 0, "validator_checks_total": 0}

    entry = SKILL_VALIDATORS.get(skill)
    if not entry:
        metrics.update(artifact_exists=1, quality_pass=1)
        return metrics

    artifact_file, validator_script = entry
    artifact_path = Path(artifacts_dir) / artifact_file
    exists = artifact_path.is_file() and artifact_path.stat().st_size > 10
    metrics["artifact_exists"] = int(exists)
    if not exists:
        print(f"    ✗ artifact missing: {artifact_file}", file=sys.stderr)
        return metrics

    all_pass = True

    inline_fn = INLINE_VALIDATORS.get(skill)
    if inline_fn:
        checks = inline_fn(artifacts_dir)
        passed = sum(1 for _, ok, _ in checks if ok)
        total = len(checks)
        metrics["validator_checks_passed"] = passed
        metrics["validator_checks_total"] = total
        if passed < total:
            all_pass = False
            for name, ok, detail in checks:
                if not ok:
                    print(f"    ✗ {name}: {detail}", file=sys.stderr)
        status = "✓" if passed == total else "✗"
        print(f"    {status} inline checks {passed}/{total}", file=sys.stderr)

    if validator_script and Path(validator_script).is_file():
        try:
            proc = subprocess.run(["node", validator_script, artifacts_dir],
                                  capture_output=True, text=True, timeout=30)
            if proc.returncode != 0:
                all_pass = False
            for line in proc.stdout.strip().splitlines():
                try:
                    obj = json.loads(line)
                    if "pass_count" in obj:
                        metrics["validator_checks_passed"] += obj["pass_count"]
                        metrics["validator_checks_total"] += obj["pass_count"] + obj.get("fail_count", 0)
                        break
                except (json.JSONDecodeError, ValueError):
                    continue
            status = "✓" if proc.returncode == 0 else "✗"
            script_name = Path(validator_script).name
            print(f"    {status} {script_name}", file=sys.stderr)
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            print(f"    ✗ validator error: {e}", file=sys.stderr)
            all_pass = False

    metrics["quality_pass"] = int(all_pass)
    return metrics


def resolve_prompt(skill_name: str, key: str, url: str, workspace: str) -> str:
    template = SKILL_PROMPTS[skill_name]
    return template.format(key=key, url=url, workspace=workspace)


def run_claude_trace(prompt: str, model: str, experiment: str,
                     trace_dir: Path, project_dir: str) -> dict:
    cmd = [
        "claude", "--print", "--model", model,
        "--output-format", "stream-json", "--verbose",
    ]

    trace_dir.mkdir(parents=True, exist_ok=True)

    print(f"  → Running {experiment} with {model}...", file=sys.stderr)
    start = time.monotonic()
    stdout_lines = []
    resolved_model = None

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=project_dir,
    )

    stderr_lines = []
    def _drain_stderr():
        for line in proc.stderr:
            stderr_lines.append(line)
    stderr_thread = threading.Thread(target=_drain_stderr, daemon=True)
    stderr_thread.start()

    proc.stdin.write(prompt)
    proc.stdin.close()

    stdout_lines.append(make_prompt_event(prompt))

    for line in proc.stdout:
        line = line.rstrip("\n")
        if not line.strip():
            stdout_lines.append(line)
            continue
        try:
            line = inject_timestamp(line)
            obj = json.loads(line)
            if (not resolved_model
                    and obj.get("type") == "system"
                    and obj.get("subtype") == "init"):
                resolved_model = obj.get("model")
            if obj.get("type") == "result":
                cost = obj.get("total_cost_usd", 0)
                turns = obj.get("num_turns", 0)
                print(f"    done ({turns} turns, ${cost:.2f})", file=sys.stderr)
        except (json.JSONDecodeError, ValueError):
            pass
        stdout_lines.append(line)

    proc.wait()
    stderr_thread.join(timeout=5)

    duration = time.monotonic() - start

    stdout_text = "\n".join(stdout_lines)
    (trace_dir / "stdout.log").write_text(stdout_text)

    (token_usage, cost_usd, num_turns, stream_ids, models_seen,
     per_model_usage, _) = extract_usage(stdout_lines)

    run_result = {
        "exit_code": proc.returncode,
        "duration_s": round(duration, 1),
        "token_usage": token_usage,
        "cost_usd": cost_usd,
        "per_model_usage": per_model_usage,
        "num_turns": num_turns,
        "model": resolved_model or model,
        "agent": "claude-code",
    }
    with open(trace_dir / "run_result.json", "w") as f:
        json.dump(run_result, f, indent=2)

    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://127.0.0.1:5000")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment)
    exp = mlflow.get_experiment_by_name(experiment)
    experiment_id = exp.experiment_id if exp else "0"

    try:
        run_id = trace_dir.name
        trace_name = f"{experiment}/{model} ({run_id})"
        trace_dict = build_trace(
            stdout_path=trace_dir / "stdout.log",
            run_result=run_result,
            run_id=run_id,
            experiment_id=experiment_id,
            trace_name=trace_name,
        )
        if trace_dict:
            trace_id = log_trace(trace_dict)
            num_spans = len(trace_dict["data"]["spans"])
            print(f"    trace {trace_id} ({num_spans} spans) → {tracking_uri}",
                  file=sys.stderr)
    except Exception as e:
        print(f"    trace push failed: {e}", file=sys.stderr)

    return run_result


def log_comparison_run(experiment: str, model: str, result: dict,
                       validation: dict | None = None):
    mlflow.set_experiment(experiment)
    resolved = result.get("model", model)
    with mlflow.start_run(run_name=f"{experiment}/{model}"):
        mlflow.set_tag("model", resolved)
        mlflow.set_tag("skill", experiment)
        mlflow.set_tag("comparison_run", "true")
        mlflow.log_param("model", resolved)
        mlflow.log_param("skill", experiment)

        tokens = result.get("token_usage") or {}
        input_tok = tokens.get("input_tokens", 0) or tokens.get("input", 0)
        output_tok = tokens.get("output_tokens", 0) or tokens.get("output", 0)
        cache_read = tokens.get("cache_read_input_tokens", 0) or tokens.get("cache_read", 0)
        if input_tok or output_tok:
            mlflow.log_metric("input_tokens", input_tok)
            mlflow.log_metric("output_tokens", output_tok)
            mlflow.log_metric("total_tokens", input_tok + output_tok)
            mlflow.log_metric("cache_read_tokens", cache_read)
        if result.get("cost_usd"):
            mlflow.log_metric("cost_usd", result["cost_usd"])
        mlflow.log_metric("duration_s", result.get("duration_s", 0))
        mlflow.log_metric("num_turns", result.get("num_turns") or 0)
        mlflow.log_metric("exit_code", result.get("exit_code", -1))

        if validation:
            for k, v in validation.items():
                mlflow.log_metric(k, v)


def main():
    args = parse_args()

    project_dir = str(PROJECT_ROOT)
    workspace = args.workspace or os.path.join(
        project_dir, ".artifacts", args.key, "workspace")

    skills = args.skills
    if "all" in skills:
        skills = ALL_SKILLS

    if not args.dry_run:
        server_skills = [s for s in skills if s in SERVER_REQUIRED]
        if server_skills:
            import urllib.request
            reachable = False
            for attempt in range(2):
                try:
                    urllib.request.urlopen(args.url, timeout=5)
                    reachable = True
                    break
                except Exception:
                    if attempt == 0:
                        import time as _time
                        _time.sleep(2)
            if not reachable:
                print(f"⚠ Prototype server not reachable at {args.url}", file=sys.stderr)
                print(f"  Skipping: {', '.join(server_skills)}", file=sys.stderr)
                print(f"  Start it with: cd .artifacts/{args.key}/workspace && "
                      f"npm run build && npx sirv dist --port 9204", file=sys.stderr)
                skills = [s for s in skills if s not in SERVER_REQUIRED]

    print(f"╔══════════════════════════════════════════════════════════╗", file=sys.stderr)
    print(f"║  MLflow Model Comparison: {' vs '.join(args.models)}", file=sys.stderr)
    print(f"║  Skills: {', '.join(skills)}", file=sys.stderr)
    print(f"║  Key: {args.key}", file=sys.stderr)
    print(f"╚══════════════════════════════════════════════════════════╝", file=sys.stderr)

    if args.dry_run:
        for skill in skills:
            prompt = resolve_prompt(skill, args.key, args.url, workspace)
            print(f"\n{'='*60}")
            print(f"SKILL: {skill}")
            print(f"{'='*60}")
            for model in args.models:
                print(f"\n  Model: {model}")
                print(f"  Experiment: {skill}")
                print(f"  Prompt:\n    {prompt.replace(chr(10), chr(10) + '    ')}")
            print()
        return

    results = {}
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    trace_base = Path(project_dir) / "tmp" / "trace-runs" / f"compare-{ts}"

    for skill in skills:
        prompt = resolve_prompt(skill, args.key, args.url, workspace)
        results[skill] = {}

        artifacts_dir = os.path.join(project_dir, ".artifacts", args.key)
        for model in args.models:
            model_safe = model.replace("/", "-")
            trace_dir = trace_base / f"{skill}_{model_safe}"
            result = run_claude_trace(
                prompt=prompt,
                model=model,
                experiment=skill,
                trace_dir=trace_dir,
                project_dir=project_dir,
            )
            validation = validate_skill_output(skill, artifacts_dir)
            log_comparison_run(skill, model, result, validation)
            result["validation"] = validation
            results[skill][model] = result

    print(f"\n{'='*70}", file=sys.stderr)
    print(f"  COMPARISON RESULTS", file=sys.stderr)
    print(f"{'='*70}", file=sys.stderr)
    print(f"{'Skill':<20} {'Model':<20} {'Tokens':<12} {'Cost':<8} {'Time':<8} {'Quality':<8}",
          file=sys.stderr)
    print(f"{'-'*76}", file=sys.stderr)

    for skill, model_results in results.items():
        for model, result in model_results.items():
            tokens = result.get("token_usage", {})
            input_tok = (tokens.get("input_tokens", 0) or tokens.get("input", 0))
            output_tok = (tokens.get("output_tokens", 0) or tokens.get("output", 0))
            total_tokens = input_tok + output_tok
            cost = result.get("cost_usd") or 0
            duration = result.get("duration_s", 0)
            v = result.get("validation", {})
            quality = "PASS" if v.get("quality_pass") else "FAIL"
            if v.get("validator_checks_total"):
                quality += f" ({v['validator_checks_passed']}/{v['validator_checks_total']})"
            model_short = model.replace("claude-", "")
            print(f"{skill:<20} {model_short:<20} {total_tokens:<12} "
                  f"${cost:<7.2f} {duration:<7.0f}s {quality:<8}",
                  file=sys.stderr)

    print(f"\n  Traces logged to MLflow: {os.environ.get('MLFLOW_TRACKING_URI', 'http://127.0.0.1:5000')}",
          file=sys.stderr)
    print(f"  Each skill is its own experiment. Compare runs by 'model' param.",
          file=sys.stderr)


if __name__ == "__main__":
    main()
