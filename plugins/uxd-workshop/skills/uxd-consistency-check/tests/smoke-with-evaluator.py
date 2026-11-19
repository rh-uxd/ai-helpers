#!/usr/bin/env python3
# Documentation comments are AI-generated.
"""Test the checker/evaluator boundary offline using tiny Git fixtures.

Quick Checks must preserve unevaluated coverage and use the Workshop checker
from the checkout or a host-resolved plugin. Other checks need no Workshop.
Run from a repository checkout with the evaluator's Node dependencies installed.
"""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


CHECKER = Path(__file__).resolve().parents[1]
EVALUATOR = CHECKER.parents[2] / "uxd-prototype" / "skills" / "uxd-prototype-evaluate"
ENV = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}


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
    evaluator = root / "plugins" / "uxd-prototype" / "skills" / EVALUATOR.name
    shutil.copytree(EVALUATOR, evaluator, ignore=shutil.ignore_patterns("node_modules"))
    if (EVALUATOR / "node_modules").is_dir():
        (evaluator / "node_modules").symlink_to(EVALUATOR / "node_modules", target_is_directory=True)

    def install_workshop(plugin):
        manifest = Path(".claude-plugin/plugin.json")
        (plugin / manifest.parent).mkdir(parents=True)
        shutil.copyfile(CHECKER.parents[1] / manifest, plugin / manifest)
        location = plugin / "skills" / CHECKER.name
        shutil.copytree(CHECKER / "scripts", location / "scripts")
        shutil.copyfile(CHECKER / "VERSION", location / "VERSION")
        return location

    installed = root / "host-cache" / "plugin-revision"
    installed_skill = install_workshop(installed)
    # A leftover checker in the old layout must not satisfy a Workshop check.
    shutil.copytree(installed_skill, evaluator.parent / CHECKER.name)
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

    def quick(output, check, *, workshop=None, route="quick"):
        args = ["node", str(evaluator / "scripts/run-split-evaluation.js"),
                "--route", route, "--input", str(packet), "--output", str(output),
                "--checks", check]
        if check == "consistency-source":
            args.extend(["--workspace", str(workspace), "--base-ref", base])
        if workshop is not None:
            args.extend(["--workshop-plugin-dir", str(workshop)])
        return subprocess.run(args, cwd=root, env=ENV, capture_output=True, text=True)

    def evaluate(name, guidelines, **options):
        packet.write_text(json.dumps({
            "source": {"kind": "ux-spec", "id": "SMOKE-SPEC", "revision": "v1", "snapshot_path": "requirements.md"},
            "prototype": {"url": "http://localhost:3000", "revision": run(workspace, "git", "rev-parse", "HEAD")},
            "extract": {"key": "SMOKE-1", "title": "Consistency smoke test", "ac_list": []},
            "consistency": {"guidelines": guidelines},
        }))
        output = root / name
        result = quick(output, "consistency-source", **options)
        assert result.returncode == 0, result.stderr
        return json.loads((output / "pe-evaluation-snapshot.json").read_text())["consistency"]

    def state(name):
        return json.loads((root / name / "pe-state.json").read_text())

    guidelines = ["repo=style.md", f"upload={upload}"]
    cited = evaluate("repo-and-upload", guidelines, workshop=installed, route="full")
    raw = cited["source_analysis"]
    assert raw["coverage"]["unevaluated_rules"] == ["upload:uploaded-guide"]
    assert raw["internal_consistency"]["status"] == "not_evaluated"
    assert [(item["file"], item["line"]) for item in raw["source_mode"]["violations"]] == [("index.html", 3)]
    assert cited["status"] == "failed"
    full_state = state("repo-and-upload")
    assert full_state["workflow"]["status"] == "awaiting-review"

    missing_output = root / "missing-checker"
    missing = quick(missing_output, "consistency-source")
    assert missing.returncode != 0, "consistency-source ran without the companion"
    assert "Selected consistency-source requires uxd-workshop:uxd-consistency-check" in missing.stderr, missing.stderr
    assert not missing_output.exists()

    classify_packet = json.loads(packet.read_text())
    del classify_packet["consistency"]
    classify_packet["extract"]["ac_list"] = [{
        "criterion_id": "AC-1", "source_id": "SMOKE-SPEC#AC-1", "text": "The page shows a heading.",
    }]
    packet.write_text(json.dumps(classify_packet))
    classify_output = root / "classify-without-checker"
    classified = quick(classify_output, "classify")
    assert classified.returncode == 0, classified.stderr
    assert (classify_output / "checks/classify.json").is_file()

    install_workshop(root / "plugins" / "uxd-workshop")
    assert evaluate("checkout-workshop", guidelines)["status"] == "failed"
    implementation = full_state["identity"]["evaluator_key"]
    assert state("checkout-workshop")["identity"]["evaluator_key"] == implementation
    with (installed_skill / "scripts/uxd_consistency/source/scoped_sources.py").open("a") as script:
        script.write("\n# Test a change to a transitive analyzer dependency.\n")
    assert evaluate("updated-workshop", guidelines, workshop=installed, route="full")["status"] == "failed"
    assert state("updated-workshop")["identity"]["evaluator_key"] != implementation

    prose = evaluate("prose-only", [f"upload={upload}"])
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

    (workspace / "root-class.md").write_text(
        "---\nid: root\ncheck: required-html-class\nrequired_class: must-have\nseverity: error\n---\n"
        "The root must have class `must-have`.\n"
    )
    initial = '<!doctype html>\n<html\n  class="must-have"\n  lang="en">\n<body>Before</body>\n</html>\n'
    html.write_text(initial)
    run(workspace, "git", "add", "index.html", "root-class.md")
    run(workspace, *git, "commit", "-qm", "Add multiline root policy")
    base = run(workspace, "git", "rev-parse", "HEAD")
    for name, content, expected_line in [
        ("replace-class", initial.replace('class="must-have"', 'dir="ltr"'), 3),
        ("delete-class", initial.replace('  class="must-have"\n', ""), 2),
        ("delete-root", initial.replace('<html\n  class="must-have"\n  lang="en">\n', ""), None),
    ]:
        html.write_text(content)
        run(workspace, *git, "commit", "-qam", name)
        result = evaluate(name, ["repo=root-class.md"])
        assert result["status"] == "failed", result
        assert [f["line"] for f in result["source_analysis"]["source_mode"]["violations"]] == [expected_line]
    html.write_text(initial.replace("Before", "After"))
    run(workspace, *git, "commit", "-qam", "Keep root unchanged from the base")
    assert evaluate("untouched-root", ["repo=root-class.md"])["status"] == "degraded"

print("Passed: checkout and host-resolved Workshop, missing Workshop, classification without checker, "
      "repo/upload, delta, prose and JSX coverage, multiline root changes and deletions")
