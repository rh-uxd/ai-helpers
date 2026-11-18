#!/usr/bin/env python3
"""Offline seam check; install sibling evaluator's Node dependencies first."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


CHECKER = Path(__file__).resolve().parents[1]
EVALUATOR = CHECKER.parent / "uxd-prototype-evaluate"
ENV = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
ENV.pop("UXD_CONSISTENCY_CHECKER_DIR", None)


def run(cwd, *args):
    result = subprocess.run(args, cwd=cwd, env=ENV, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


with tempfile.TemporaryDirectory() as directory:
    root = Path(directory).resolve()
    workspace = root / "prototype"
    workspace.mkdir()
    policy = workspace / "style.md"
    policy.write_text("---\nid: styling\ncheck: no-custom-css\nseverity: error\n---\nUse library styles.\n")
    upload = root / "uploaded-guide.md"
    upload.write_text("# Button labels\nDescribe the outcome of the action.\n")
    installed = root / "separately-installed-checker"
    shutil.copytree(CHECKER / "scripts", installed / "scripts")
    shutil.copyfile(CHECKER / "VERSION", installed / "VERSION")
    html = workspace / "index.html"
    html.write_text('<html>\n<div style="margin:0">Existing</div>\n<div>Before</div>\n</html>\n')
    (workspace / "app.jsx").write_text("export const label = 'Before';\n")
    run(workspace, "git", "init", "-q")
    run(workspace, "git", "add", ".")
    git = ("git", "-c", "user.name=Smoke test", "-c", "user.email=test@example.invalid")
    run(workspace, *git, "commit", "-qm", "Base")
    base = run(workspace, "git", "rev-parse", "HEAD")
    html.write_text('<html>\n<div style="margin:0">Existing</div>\n<div style="margin:1px">After</div>\n</html>\n')
    run(workspace, *git, "commit", "-qam", "Changed HTML")
    (root / "requirements.md").write_text("Review changed source against selected policy.\n")
    packet = root / "packet.json"

    def evaluate(name, guidelines, *, explicit_checker=False):
        packet.write_text(json.dumps({
            "source": {"kind": "ux-spec", "id": "SMOKE-SPEC", "revision": "v1", "snapshot_path": "requirements.md"},
            "prototype": {"url": "http://localhost:3000", "revision": run(workspace, "git", "rev-parse", "HEAD")},
            "extract": {"key": "SMOKE-1", "title": "Consistency smoke test", "ac_list": []},
            "consistency": {"guidelines": guidelines},
        }))
        output = root / name
        if explicit_checker:
            ENV["UXD_CONSISTENCY_CHECKER_DIR"] = str(installed)
        try:
            run(root, "node", str(EVALUATOR / "scripts/run-split-evaluation.js"),
                "--route", "quick", "--input", str(packet), "--output", str(output),
                "--checks", "consistency-source", "--workspace", str(workspace), "--base-ref", base)
        finally:
            ENV.pop("UXD_CONSISTENCY_CHECKER_DIR", None)
        return json.loads((output / "pe-evaluation-snapshot.json").read_text())["consistency"]

    cited = evaluate("repo-and-upload", ["repo=style.md", f"upload={upload}"])
    raw = cited["source_analysis"]
    assert raw["coverage"]["unevaluated_rules"] == ["upload:uploaded-guide"]
    assert raw["internal_consistency"]["status"] == "not_evaluated"
    assert [(item["file"], item["line"]) for item in raw["source_mode"]["violations"]] == [("index.html", 3)]
    assert cited["status"] == "failed"

    prose = evaluate("prose-only", [f"upload={upload}"], explicit_checker=True)
    assert prose["source_analysis"]["coverage"]["evaluated_rules"] == []
    assert prose["status"] == "degraded"

    html.write_text('<html>\n<div style="margin:0">Existing</div>\n<div>After</div>\n</html>\n')
    run(workspace, *git, "commit", "-qam", "Remove the changed violation")
    assert evaluate("clean-html", ["repo=style.md"])["status"] == "passed"

    (workspace / "app.jsx").write_text("export const label = 'After';\n")
    run(workspace, *git, "commit", "-qam", "Change JSX")
    partial = evaluate("partial-jsx", ["repo=style.md"])
    assert partial["source_analysis"]["coverage"]["incomplete_rules"]["repo:styling"]["files"] == ["app.jsx"]
    assert partial["status"] == "degraded"

print("Passed: selected repo/upload, delta, no automatic prose pass, clean HTML, partial JSX")
