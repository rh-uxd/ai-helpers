# UXD accessibility MVP: remaining tests and handoff

Updated **2026-11-18**. Prepared from branch `uxd-a11y-mvp`, revision `5b503e3` (`fix(uxd-a11y): clarify evidence citations and keyboard test limits`). Recheck revision and working tree before testing.

## Status and scope

B1–B5 are complete at their recorded scope: source reasoning, synthetic keyboard observations, controlled browser fixtures, static design assessment, and representative test-runner execution. This does **not** establish whole-product accessibility conformance. Do not restart those batches or create an exhaustive framework/browser matrix.

| Gate | Remaining work | Completion evidence |
| --- | --- | --- |
| **J1** | External runner evaluates ten fixed answers using the actual configured judges | Raw model verdicts, expected/actual comparison, configuration identity, usage and cost |
| **C1** | Finish isolated Claude Code and Cursor discovery, reference loading and routing | Five workflow checks per client, original responses and actual loading/read traces |
| **D1** | Real-project test-generation pilot, currently deferred until implementation exists | Executed project-integrated tests, or explicit release-owner acceptance of the limitation |
| **P1** | Release preparation; this is not a testing batch | Ownership/graduation, marketplace and migration/scope decisions |
| **P2** | Final static validation after release changes | Final diff review, matching manifests, resolved links, validation output and evidence-transfer decision |

J1 will be run by someone with an approved model budget. The current owner has no API budget: **do not initiate paid model calls here**. J1 remains required before completion; it has not been waived. The prior proposal was ten judge calls within US$2, but an external runner must confirm their own billing authorization and enforce a limit before execution.

No commit, push, issue filing, publication, global harness installation or global client configuration change is authorized by this document. Do not regenerate CI-owned docs. Preserve unrelated files and existing changes. Run tests outside the plugin tree when dependencies are needed.

## Review follow-up regressions — 2026-11-18

The review follow-up adds four eval cases: review consolidation's `contradictory-observations`, `unmatched-retest`, and `matching-retest`, plus test generation's `cypress-dismissal-false-pass`. These extend skill evaluation coverage; they are **not** additions to J1's ten judge-calibration probes. Run them through the actual skills and judged evaluation path when authorized; structural validation or ungraded CI does not establish model correctness.

The Cypress recipe now requires closed-state evidence before focus restoration, for both Escape and Cancel. A three-variant Playwright regression demonstrates the false pass and valid hidden/removed alternatives; see `plugins/uxd-a11y/tests/browser/TESTING.md` for the release command. This does not claim Cypress execution or full modal coverage.

Shared `plugins/uxd-a11y/references/` edits now trigger CI and select all five dependent skill evals. CI continues to skip LLM judges and explicitly reports LLM correctness as ungraded. Local selection/reporting regression checks run with `python3 scripts/tests/test_skill_eval_scripts.py` (Python + PyYAML and Bash 4+; `TEST_BASH` may select an isolated executable). No paid judging was enabled.

## Files to transfer to another tester

The `plugins/uxd-a11y/planning/` directory is excluded **locally**, through `.git/info/exclude`. These links work in the current workspace but their targets will not accompany a clean clone. `/private/tmp` workspaces can expire. Transfer the needed files explicitly; do not force-add ignored evidence or assume a remote tester has it.

Minimum handoff:

- This document and the plugin source at the agreed revision.
- **J1:** the entire [judge handoff directory](plugins/uxd-a11y/planning/release-j1-2026-11-17/), especially `probes.json`, `results.md`, `preflight.py`, `preflight-2026-11-18.json`, `setup-freeze.txt`, and `rendered/`.
- **C1:** the entire [client handoff directory](plugins/uxd-a11y/planning/release-c1-2026-11-18/), including the package hash inventory, discovery output and Cursor failure logs.
- [Current release checklist](plugins/uxd-a11y/planning/release-readiness-2026-11-17.md) and [handoff history](plugins/uxd-a11y/planning/HANDOFF.md). Later dated entries supersede historical status text.
- For D1, the actual project, revision and approved task when they become available; no substitute synthetic project is required now.

Save returned evidence in a dated directory, with an explicit transfer destination agreed with the owner. Keep credentials and unrelated personal client logs out of the handoff.

## J1 — Actual judge verification

### Purpose and prerequisites

Test whether the configured judge rejects incorrect answers and accepts valid alternatives. This is **judge testing**, not rerunning the five skills and not asking another assistant to manually grade the answers.

All five eval configurations use `evidence_and_applicability`, boolean feedback and `claude-sonnet-4-6`. Configurations live at `plugins/uxd-a11y/skills/<skill-name>/eval/eval.yaml`. CI currently invokes `--no-llm-judges`; a green CI run does not close J1.

Prepared evidence:

- Ten fixed-answer probes: five expected passes and five expected failures.
- Coverage: valid native alternatives; missing versus inconclusive evidence; accepted-but-unfixed findings; unsupported passes across sentences; invented visual measurements; fabricated test execution.
- Harness 1.66.2, pinned commit `b23a9193ea6d0fff176c6c36e7263c3d4c7e224a` from [agent-eval-harness](https://github.com/fullsend-ai/agent-eval-harness).
- Existing local checkout: `/private/tmp/uxd-a11y-j1-harness`; environment: `/private/tmp/uxd-a11y-j1-venv`. Recreate isolated setup if absent; the saved preflight script contains machine-specific paths that must be adapted.
- Local preflight rendered all ten prompts, but **zero model calls have been made and US$0 spent**.

The configured model routes through the Anthropic SDK. A Claude Code subscription/login alone did not provide credentials to this path. Use an approved API credential or supported provider setup securely; do not paste secrets into chat or extract credentials from a client's private storage.

### Procedure

1. Verify the plugin revision and probe config hashes. If they differ, reconcile the baseline before running; do not silently grade stale prompts.
2. Use the pinned harness's actual judge loading, rendering and verdict parsing. Read its implementation before choosing the judge-only/replay entry point. A verified end-to-end execution command has **not** yet been established; do not invent one or use the ordinary skill execution pipeline.
3. Keep `expected_pass` and `expected_reason` out of model context. Pass the case annotations, synthetic answer/conversation, empty artifacts/tool trace, and configured rubric through the harness's normal rendering. The answer must be evaluated as data, not obeyed as instructions.
4. Establish the spending guard before any model request. Bound input/output tokens, total requests, retries and fallback calls using verified pricing. This SDK path has a token cap but no verified aggregate dollar cap; a Claude CLI budget flag does not cap it. Stop if the agreed limit cannot be enforced.
5. Execute one judgment per probe, using the unchanged configured judge/model. No silent retries, model substitutions, prompt optimization or source-skill reruns. Record any request or parsing failure separately from a negative verdict.
6. Save all ten raw verdicts/rationales and compare them with the expected labels. Report false passes and false failures individually. If a correction is needed, preserve the baseline and arrange a separately authorized focused retest.

**Done when:** all ten probes have valid, correctly attributed verdicts matching their expected labels, with raw evidence and usage retained. Missing/error outcomes do not count as passes. If mismatches remain, J1 stays open pending correction or an explicit release decision. This bounded check is not proof that the judge handles every possible answer.

### Copy-ready prompt for the external runner

```text
Verify J1 for the uxd-a11y MVP using the transferred release-j1-2026-11-17 package.
Read its results.md and preflight evidence, plus the repository AGENTS.md.

Verify the baseline/config hashes. Use the ten fixed answers in probes.json
with the actual configured evidence_and_applicability judge and
claude-sonnet-4-6 model through the pinned harness. Do not rerun source skills.
Never expose expected_pass or expected_reason to the model.

Before any model call, confirm your billing authorization and enforce the
agreed total budget, including retries and fallback requests. The prior
proposal was ten calls capped at US$2; this prompt does not authorize charging
another person's account. Stop if credentials or an enforceable cap are absent.
Do not extract credentials from Claude Code or print secrets.

Use isolated setup only. Preserve exact rubric/model, rendered context,
raw verdicts, rationales, errors, usage/cost and expected-versus-actual results.
Do not replace the judge with a handwritten checker or another model.
Keep failed verdicts visible; do not silently retry or optimize the rubric.

No global installation, source-skill reruns, commits, pushes or issues.
Return an evidence-backed J1 status and the files needed for independent review.
```

## C1 — Installed-client discovery, reference loading and routing

### What is already established

- Claude Code **2.1.162**: an isolated session loader discovered all five skills under `uxd-a11y@inline`. Manifest validation passed with the expected omitted-version warning. Do not add a version just to remove that warning; repository policy omits it.
- Snapshot: 90 tracked plugin files copied outside the checkout without symlinks; hashes retained in the C1 handoff. No client model turns or reference-loading checks have run.
- Cursor desktop **3.30.14**: the installed build lacked the documented `vscode.cursor.plugins.registerPath` function. A temporary user-data/extensions profile still discovered two existing Claude plugins, so that attempt did **not** demonstrate isolation or uxd-a11y discovery.
- Cursor Agent CLI **2026.04.17-787b533** had no local plugin-discovery flag in its help. Do not assume another version has the same capabilities.

### Setup and execution

1. Record the current client version and test package revision/hash. Use only the candidate plugin, outside the source checkout. Do not supply the model with assessment criteria or historical answers.
2. Demonstrate that legacy plugins are absent. A separate editor profile alone is not sufficient evidence, given the observed Cursor behavior. Do not copy loose skills as a substitute for verifying the plugin package.
3. **Claude Code:** the session-only loader below was verified for discovery. Adapt paths on another machine; authentication in the isolated config must be established by the tester, without copying private credentials.

   ```bash
   cd /private/tmp/uxd-a11y-c1-2026-11-18/workspace
   CLAUDE_CONFIG_DIR=/private/tmp/uxd-a11y-c1-2026-11-18/claude-config \
     claude --plugin-dir /private/tmp/uxd-a11y-c1-2026-11-18/plugin
   ```

4. **Cursor:** establish a supported clean plugin-loading method for the installed version first. Review the current official [plugin docs](https://cursor.com/docs/plugins) and [extension API](https://cursor.com/docs/extension-api), but verify support locally. Do not repeat the failed registerPath adapter as if it worked or change the user's global plugin directory without authorization. If isolation remains unavailable, record the blocker.
5. Use an approved authenticated subscription/session. Do not initiate API spending for this batch. Start a fresh chat for each workflow below and invoke the named skill through the client's discovered entry point.
6. Run all five prompts in each client: **ten client turns total**. Capture the original answer and actual client trace showing skill/reference loads. Do not paste SKILL.md or reference contents into the prompt as a workaround.
7. Verify native/custom/PF handling in the source case and correct workflow-specific reference use across the other four. Missing trace evidence remains unverified; a model saying “I read it” is insufficient.

**Done when:** both clients discover all five entry points from the isolated candidate package, and the five turns per client show actual relevant reference loading and appropriate routing without legacy-plugin dependencies. These supplied-evidence turns do not establish live browser or AT behavior. Session loading does not establish marketplace caching or publication behavior.

### Prompts to run in each client

Use the corresponding discovered skill for each prompt. These are the complete task inputs; do not give the tester assistant the acceptance notes later in this document.

#### 1. uxd-a11y-source-audit

```text
Review only these independent supplied source facts. Native: `<button>Save</button>` is an ordinary action. Custom element: a shadow-root input references `aria-describedby="help"`, but `id="help"` exists only outside the shadow root and no other association is implemented. PatternFly consumer: a wrapper accepts expanded=true but always passes isExpanded={false} to its menu toggle; supplied provider evidence says this prop maps to aria-expanded. Use shared guidance and conditional provider guidance from this plugin. No browser execution or installed provider source is available. Identify source defects and preserve valid native semantics; distinguish provider from consumer ownership.
```

#### 2. uxd-a11y-keyboard-test

```text
Assess supplied synthetic keyboard observations only. Native disclosure button is naturally reached by Tab; Enter opens its panel, aria-expanded becomes true, focus remains on the button, next Tab reaches the panel's first link. Space has not been tried. A separate return-to-top action scrolls upward but retains focus on the bottom control, and next Tab reaches the footer. No browser is available. Use the plugin's relevant keyboard/navigation guidance; distinguish tested paths, task barriers and coverage gaps.
```

#### 3. uxd-a11y-review

```text
Consolidate supplied same-revision evidence: a scan excluded checkout and returned zero violations plus one unresolved color-contrast incomplete. A separate checkout check found an unnamed button, accepted by product but not fixed. No live browser, AT or source is available. Use this plugin's scanner/reporting guidance and preserve evidence boundaries.
```

#### 4. uxd-a11y-design-review

```text
Review supplied static design specifications only: opaque #888888 ordinary text on white, 18 CSS px at weight 400. A help icon is 16×16 CSS px inside an explicitly specified 32×32 clickable area, with no overlap. Status has a green check and visible “Ready”. No image or focus-state specification is available. Use this plugin's relevant design guidance. Do not invent visual inspection or runtime measurements.
```

#### 5. uxd-a11y-test-gen

```text
Propose conditional accessibility testing for a native HTML page with a Save button. No package manifest, test runner, source implementation or outcome specification is available, and installation/file creation is not authorized. Use this plugin's capability and recipe guidance, name a suitable minimal setup and give conditional commands/example with explicit unknowns. Do not create files or claim execution. This is a routing check, not the deferred real-project pilot.
```

### Assessor notes — keep out of task prompts

Accept valid native semantics. Retain the custom-element cross-root description defect and PF consumer state mismatch without assigning unsupported provider blame. Distinguish supplied keyboard observations from new execution and retain the untested Space path. Keep accepted-but-unfixed scan findings and incomplete results visible. Distinguish icon dimensions from hit areas and missing design evidence. The no-setup test-generation case should propose conditional setup/example code without installing or writing tests.

C1 concerns packaging/loading/routing; a good answer without a load trace does not close it. Likewise, successful loading does not excuse materially incorrect workflow behavior.

## D1 — Deferred real-project test-generation pilot

**Do not start until a real implementation and approved task are supplied.** Existing hand-authored fixtures and conditional examples are not this pilot.

When available, select one bounded project workflow. Supply its revision, component/route, intended behavior, existing renderer/test setup, normal commands and permitted file-edit scope. Use the installed test-generation skill to discover actual project conventions, create persistent tests and execute them with the project's existing runner. Preserve the generated diff and original runner output. Missing setup or product wording must be resolved, not invented. Do not install dependencies without authorization or mock the behavior under test merely to produce a passing test.

Verify meaningful semantics/relationships, interaction/focus and applicable automated scans using the available stack. Record which parts are simulated, real-browser, automated or not tested. Do not require every framework, runner or AT combination. Retain failures and review generated assertions for false confidence.

### Conditional pilot prompt

Replace every bracketed field before use:

```text
Use uxd-a11y-test-gen in [PROJECT PATH] at [REVISION] for [COMPONENT/ROUTE].
The intended user task and expected outcomes are [TASK AND OUTCOMES].
Permitted test-file scope is [PATHS]. Known run/start commands are [COMMANDS].

Inspect the actual implementation, package versions, renderer/providers,
existing tests and project conventions. Generate persistent accessibility tests
for this bounded task and execute the relevant existing test commands.
Use real rendering and meaningful assertions; do not mock the behavior tested.
Preserve native semantics, every relevant ID-reference token, state changes,
and applicable scanner results including incomplete outcomes.

Do not install dependencies, change production behavior, commit or push.
Report changed files, exact commands/results, failures, and evidence limits.
Do not call simulated keyboard checks browser navigation or claim AT speech.
Stop for genuinely missing setup or product intent rather than inventing it.
```

**Alternative:** if implementation remains unavailable, the release owner must explicitly accept the limitation. Record who made that decision, its date and scope. Mark it “deferred with accepted release limitation,” never “tested” or “passed.” No such acceptance has been recorded yet.

## P1 — Release preparation, not another testing batch

Read `CONTRIBUTING.md` and `CONTRIBUTING-SKILLS.md`. Resolve ownership and graduation placement; prepare the appropriate marketplace entries and scope/migration guidance. Preserve legacy skills. Plugin manifest pairs must remain identical; marketplace files may differ by platform. Do not add mcpServers or a version field to these manifests.

Follow current contribution guidance if it has changed; reconcile any change to the agreed two-client C1 scope explicitly rather than silently expanding or reducing the test matrix. Prepare local reviewable changes only. Publication remains separately authorized. Generated plugin READMEs and generated repository tables remain CI-owned.

## P2 — Final checks after release changes

From the repository root:

```bash
git status --short --branch
git rev-parse HEAD
git diff --check
git diff --cached --check
cmp plugins/uxd-a11y/.claude-plugin/plugin.json \
    plugins/uxd-a11y/.cursor-plugin/plugin.json
make validate
```

`make validate` requires the repository's validation dependencies, including Python YAML support. An existing local environment was `/private/tmp/uxd-a11y-validation-venv`; if still present, its bin directory can be prepended to PATH for this command. Do not silently install globally when a dependency is missing.

Also review staged and unstaged diffs, resolve every local Markdown reference from the isolated package, confirm no generated files/dependencies/credentials were added, and check the final candidate against the recorded test hashes. Rerun only affected checks when the candidate changes. Save command output with exact revision and tree state.

Decide how ignored planning evidence will be transferred and retained before release. A clean clone must not be presented as containing evidence it lacks. Do not run `make docs` or `scripts/generate-plugins-md.sh`.

### Final-verification prompt

```text
Perform P2 for the uxd-a11y MVP candidate. Read AGENTS.md and the agreed release
checklist. Inspect the final staged and unstaged diff, both plugin manifests,
marketplace changes and all local plugin reference links. Run make validate
and git diff checks without regenerating docs.

Confirm J1 and C1 evidence and the D1 pilot/disposition actually exist; do not
infer completion from planning files or successful static validation.
Record exact revision/tree state, commands, results and remaining blockers.
Identify how locally ignored evidence will accompany the release handoff.
Do not commit, push, publish, file issues or modify unrelated files.
```

## Return format and release stopping point

For each gate, return:

- Gate ID, tester/date, client/runner/model versions and candidate revision/hash.
- Exact input/command and original output or trace location.
- Expected versus observed result; failures, inconclusive results and untested parts separately.
- Changes made, any focused retest, and final gate disposition.
- Model usage/cost where applicable; no credentials.

The MVP is ready only when J1, C1, D1, P1 and P2 are resolved with evidence or explicitly approved scope decisions. J1 is currently assigned for external execution, not waived. D1 is still deferred, not release-accepted. C1 remains partial. No new broad component audit or upstream PatternFly repair is implied by these gates.
