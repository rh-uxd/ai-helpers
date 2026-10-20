# uxd-prototype-evaluate

Evaluate a running prototype against a Jira issue's acceptance criteria, optionally fix failures, and run persona usability walkthroughs. Review the results in an HTML evidence report.

## Codex quick start

Enable the available UXD prototype plugin in Codex and open your prototype project. See [Codex setup](../../../../docs/codex-setup.md) if the skill is missing.

Prepare clear, observable acceptance criteria, start the prototype's dev server, and confirm the Jira connection is authenticated. Select `$uxd-prototype-evaluate`:

```text
$uxd-prototype-evaluate PROJ-298 http://localhost:3000 --workspace=/path/to/prototype --max-iterations=1
$uxd-prototype-evaluate PROJ-298 http://localhost:3000 --workspace=/path/to/prototype --no-fix
$uxd-prototype-evaluate review PROJ-298
```

The first example allows one acceptance-criteria fix iteration. The second produces findings without fixes; persona walkthroughs still run. `review` opens an existing report without rerunning evaluation.

Supply the source workspace when you want fixes and source checks. A remote URL without a workspace or MR URL has limited coverage; the skill explains those limits and asks for confirmation.

## Common options

| Option | What it controls |
|--------|------------------|
| `--workspace=<path>` | Prototype source; enables the fix loop. |
| `--max-iterations=N` | Maximum acceptance-criteria fix iterations; defaults to `3`. |
| `--no-iterate` | Run a single acceptance-criteria pass without looping. |
| `--no-fix` | Keep findings without applying fixes; persona walkthroughs still run. |
| `--no-report` | Return a compact chat summary; use `review <KEY>` later for the full report. |
| `--fresh` | Delete this issue's `.artifacts/<KEY>/eval/` before rerunning; preserves create artifacts. |
| `--reset` | Hard-reset the source workspace to origin HEAD before evaluation. This discards workspace changes; use deliberately. |

[Usage and full options](SKILL.md#flags)

## Requirements and setup

| Requirement | When needed |
|-------------|-------------|
| Node.js ≥ 18 and npm | Evaluator scripts and browser automation. |
| Python 3 | Bundled evaluator helpers. |
| Playwright Chromium | Browser evaluation and persona walkthroughs. |
| Jira key and acceptance criteria | Every evaluation; use authenticated Atlassian lookup or provide the issue details. |
| Reachable prototype URL | Browser evaluation; a workspace with a built `dist/` can be served locally. |

In Codex, ask the agent to locate the installed evaluator skill directory and run:

```bash
npm install
npx playwright install chromium
bash scripts/preflight-check.sh
```

These commands run **in the evaluator skill directory**, then the agent returns to your prototype project. Plugin installation alone does not install these dependencies. Stop and resolve a failed preflight before evaluation.

Optional context repositories and product configuration are described in [setup and prerequisites](SKILL.md#prerequisites) and [skill overlays](references/skill-overlays.md).

## Expected output

Evaluation checks acceptance criteria and then runs persona usability walkthroughs. Results are saved in `.artifacts/<KEY>/eval/` in your prototype project, including `evaluation-report.html`, verdicts, screenshots, and iteration evidence.

Review failures and flagged items before sharing. Re-evaluate after significant changes; use `review <KEY>` when you only need to reopen the report. See [artifact locations](SKILL.md#artifact-locations) for details.

## Related guides

- [Evaluation orchestration](references/orchestration.md) — the validation and usability phases.
- [Acceptance-criteria preparation](../../../../docs/prototype-cost-best-practices.md#optimize-prompts-and-acceptance-criteria) — write requirements the evaluator can check.
- [Prototype creation](../uxd-prototype-create/README.md) — build or refine from findings.
- [Prototype export](../uxd-prototype-export/README.md) — open reports through the Prototype Bar.
- [Prototype publishing](../uxd-prototype-publish/README.md) — share after reviewing results.
