# Evaluation intake

Use this for new Quick, Full or independent walkthrough runs. For a standalone
creation, consistency, generalist research or PatternFly request, prefer the
matching skill and its own intake; do not impose an evaluator packet or personas.
An overview request gets an explanation, not a setup form.

## Ask only what is missing

Recommend the smallest useful workflow and explain why. Reuse supplied source,
build, task and audience details. Inspect validated history under the project's
reviewed `artifacts/` root before proposing new work; never scan arbitrary projects.
For prepared walkthroughs, verify and reuse the packet/source hashes, environment,
exact pairs and limits. Full also needs its parent/digest and continuation decision.
Do not restart intake, replace the cohort or splice a standalone run into Full.

Use the host's question UI: single-select for exclusive decisions, checkboxes
for check and persona/task selections, and short open-ended fields for missing
details. Batch independent questions; wait before asking dependent ones. Include
an open-ended alternative to suggestions. Defaults, canceled forms and unanswered
questions are not approval. Fall back to numbered text choices when necessary;
do not present Markdown checkboxes as interactive controls.

## Let the designer choose checks

First recommend the smallest useful set and explain why. Then offer the complete
supported list as a native multi-select, with every option initially unselected.
Use human-readable names and explain what each check looks at, how it gathers
evidence, and what it cannot establish. Keep internal check names and commands
behind the scenes. Show missing prerequisites next to an option rather than
silently omitting it or substituting another check.

- **Map the requirements:** Organizes each supplied criterion by the kind of
  evidence needed. It is planning/classification only; it does not test behavior
  or mark a requirement as met.
- **Compare source with design rules:** Reviews changed product source against
  the explicitly selected guideline set and commit/base. It does not need a
  running app. It requires a clean, revision-matched checkout and a compatible
  source checker. Do not run project tests as a side effect. Preserve requested
  test/fixture exclusions; if the checker cannot honor an exclusion, pause and
  ask rather than silently broadening the scope.
- **Review visual consistency:** Compares selected, revision-matched screens or
  screenshots with the explicitly selected design rules. It needs supplied
  captures or approved browser capture, plus provider approval; it is not a task
  walkthrough.
- **Try selected tasks with simulated users:** Each selected persona attempts
  only the exact task(s) chosen for them, starting from the reviewed state. It
  needs a verified reachable build and separate browser/provider approval. One
  persona is valid; do not silently add personas or tasks.

Within a task walkthrough, the designer may also name specific requirements to
verify. Each needs an explicit on-screen verification step and linked evidence;
completing the task alone does not verify it. There is no standalone generic
“pass the requirements” check. **Full** means a composed evaluation of selected
checks with a separate review decision before any walkthrough; it is not another
check-box item. Fixes, HTML reports and sharing are separate choices.

After check selection, ask only for prerequisites of selected items. Show the
expected browser/model activity and cost estimate, or say cost is unknown; ask for
a clear limit and execution decision. Do not infer approval from selecting an
option or from a prepared plan.

The three Quick options above are the complete new-work set. If asked to add a
heuristic inspection, say it is not supported in evaluator plans; do not schedule
or replace it with a research-profile call. A standalone research request follows
its own separate workflow. Historical heuristic results can be reviewed only as
existing run data.

## Review existing work

Run `node scripts/artifacts/find-evaluation-runs.js --root <project-artifacts>`
from the resolved evaluator, filtering by key/source/revision as needed.
Read the [five validated files](../artifacts/canonical-artifacts.md) and linked
receipts. Show run path, selected checks/pairs, status and execution times,
source/build/scope match, parent/review state, gaps and the recommended next step.

Verify exact source ID/version/hash, prototype revision, selected rules/checks,
screen/state and task/persona/role/fixture scope before reusing coverage. A shared
ticket or URL is insufficient. Unknown identities/times remain unknown; creation
or update dates do not prove a new check ran. Do not recount inherited phases.

Recommend reviewing matching results, continuing an awaiting-review Full parent,
or running only missing/stale selected work. Explain intentional repeats. Never
rewrite old evidence, invent cache hits or restore cross-build results. Full
cannot change its frozen packet; changed scope needs a newly reviewed run.

## Required inputs

All new packets need a reviewed source snapshot/version and stable source IDs,
`extract.key`, reviewed criteria (empty where allowed), prototype URL metadata
and exact revision/build identity. A URL is not proof of a reachable server.

- **Existing review:** explicit artifact root/run; no new packet or execution.
- **Classification:** reviewed criteria and source mapping; no personas,
  workspace, browser or live server. Classification never establishes AC PASS.
- **Source consistency:** clean exact-commit workspace, pinned comparison base,
  reviewed explicit policy (or neutral zero-corpus selection) and a compatible
  separately installed companion; no browser or mandatory Jira/MR.
- **Visual consistency:** inspection goal and selected screen/state/source scope, revision-verified settled
  captures, provider approval, browser approval for new captures and hashed
  submitted-context/result receipts; no persona cohort or edits.
- **Walkthrough:** tasks/outcomes, screens/states, eligible roles, starting states,
  fixtures/reset descriptions, exact task/persona pairs, verified reachable build,
  browser/provider approval and a host that can retain the required receipts.
  No preceding Quick or mandatory AC links for research-only tasks.
- **Full:** prerequisites for selected checks and intended walkthroughs; fresh
  run path and a separate review checkpoint before walkthrough execution.
- **Fix verification:** eligible completed Full parent, approved action IDs,
  target/supporting-file scope, before/after revisions, fix receipt, new packet
  and fresh evidence. Only one verification pass follows the initial evaluation.

Local mergers require Node.js 18+ and declared dependencies. Request setup only
for selected work. Never install, clone, reset a checkout or start services
without approval; missing tools/receipts block the affected check.

## Select personas only when needed

1. Honor reviewed IDs, experience, roles and per-persona task IDs first. A single
   intentionally selected persona is valid; never impose a junior/senior pair.
2. If selection is missing, resolve the plugin root (`../..` from the evaluator)
   and read `knowledge/personas/catalog.yaml` and
   `knowledge/personas/overlays/catalog.yaml`. Match role aliases to the audience,
   then load relevant cards and overlays. Experience/accessibility/regulation/team
   size are overlays, not separate roles.
3. Show proposed roles, experience/overlays, task IDs and brief reasons for review.
   Catalog defaults are suggestions. Ask when no profile fits; identify supplied
   profiles as supplied rather than research-backed.
4. Confirm exact pairs, not a cartesian product. Exclude setup-only roles and
   check task permissions/resource scope. Freeze selections in the packet; keep
   review notes alongside it without adding undeclared schema fields.

Reuse the cohort through continuation and verification. Source access establishes
setup, not navigation answers for personas. Simulated walkthroughs are not human
participant research or representative success-rate measurements.

## Present the plan, then wait

Show the decision/questions, selected/skipped work and reasons, dependencies,
source/build identity, scope/pairs/starting states, expected evidence and host
limits. New walkthrough producers use v2 and record every actual call, including
failed calls; unexecuted work has no invented calls. Follow the
[walkthrough contract](../task-verification/task-walkthroughs.md#bundle-v2).

State expected calls/time/cost when known, uncertainty, remaining budget and stop
conditions. Unknown is not zero; host-session spend is separate. Use the
[planning contract](evaluation-planning.md) for stored plans and adaptations.
Keep planned work distinct from actual execution.

Offer separate `browser`, `provider`, `prototype_edits`, `report` and `sharing`
decisions with scope/status/UTC time. Preserve denied/unrequested choices; input
text and permission files cannot grant consent. Save new runs under
`artifacts/<KEY>/prototype-evaluations/<run-name>/`; never overwrite prior output.
A planning-only request stops here. General approval covers only the displayed
scope; resolve missing decisions before the affected activity.

## Stop and recovery rules

- **Full:** show findings/gaps, frozen cohort, run ID and digest. Obtain a new
  parent-bound decision to continue or finish without walkthroughs; initial
  activity approval does not replace this checkpoint.
- **Fixes:** obtain separate selected-action/edit approval. Applied is not verified;
  changed builds need fresh evidence and one verification pass.
- **Changed scope/budget:** review the expansion; adapted Full runs pause again.
  Preserve original packets/runs and record what changed and why.
- **Unavailable build/tools, denied permissions or unstable state:** explain the
  blocker and offer only valid narrower work; do not substitute personas/builds.
- **Invalid hashes, stale decisions or mismatched selection/revision:** stop and
  request newly reviewed inputs. Never bypass validation or fabricate receipts.
- **Interrupted output:** validate before reading; retry into a fresh destination.
- **Final handoff:** show validated path/identity, observed versus unverified
  outcomes, gaps, actual/unknown usage and next choice. Reports are opt-in;
  sharing is separate. State any hosted-media/trace limitations.

## Example conversations

These examples start with ordinary requests. Use the host's native checkboxes;
the numbered lists below are text-only fallbacks, not pretend interactive controls.

### Source review only

**Designer:** “Can you check the changed prototype against the design rules I provided? The app isn't running, and please don't run tests.”

**Assistant:** “A source review is the smallest useful check for that question. I’ll compare the changed app code with the design rules and versions you supplied; I don’t need Jira, a running app, personas or browser access. I’ll keep the requested test exclusion in scope and pause if the checker can’t honor it. Would you like source review only? No model or browser cost is planned; local runtime isn’t a provider-cost estimate. May I run it?”

### One task, one persona

**Designer:** “Would a first-time editor be able to create a project? Use one junior editor only; the administrator is for setup.”

**Assistant:** “One simulated editor attempting that one task is the smallest useful check for discoverability and task completion. I’ll exclude the setup-only administrator and won’t add a second persona. I have the task and profile; I still need the exact served build and starting state. This requires browser and model activity. The cost estimate is **[estimate or unknown]**; what limit should I respect? Shall I run only this task/profile pair? Completing the task won’t automatically verify related requirements.”

### Full evaluation

**Assistant, before work:** “You asked for an end-to-end review. I recommend **[selected checks]** because they answer **[question]**. The task walkthrough will use **[exact task/persona pairs]**. I’ll show you the initial findings and pause before any walkthrough. Here are the expected browser/model calls, cost estimate or uncertainty, output location and separate choices for edits, report and sharing. Do you approve this initial scope and execution?”

**Assistant, at the pause:** “The initial review is ready. **What I found:** [plain-language findings with evidence]. **What has not been tested:** [coverage gaps]. No persona has started yet. Would you like me to continue with the reviewed task(s), finish without walkthroughs, or stop?”

Only a new decision at this pause authorizes the walkthrough stage. Keep checkpoint IDs, hashes and continuation commands in the run record, not as a burden for the designer to assemble.

### Review saved results

**Designer:** “What did the last evaluation find, and should I change the requirements?”

**Assistant:** “I’ll check the saved evaluation for this project and validate its linked evidence. If its folder isn’t already known, please point me to it. I won’t rerun checks or edit the requirements. If I can’t find a valid matching run, I’ll say what’s missing rather than infer results from an old spreadsheet.”

## Plain-language result format

Present a short, evidence-linked summary—not JSON, command output or internal
phase names. Keep task outcomes separate from requirement results:

```text
Review: [the question the designer asked]
Build: [short revision] · Run: [date from this run's execution record]

What I checked: [selected checks, tasks and personas]
What I found: [prioritized finding in plain language] — [screenshot/source evidence]

Task outcome: [completed / failed / uncertain / not tried]
Requirement checks:
- [Requirement]: Verified / Did not meet / Uncertain / Not tested — [brief reason + evidence]

Not covered: [unselected tasks, personas, screens or requirements]
Cost: [actual attributed cost, or unknown; keep host-session cost separate]
Next: [one useful choice]
```

Use “not tested” when no explicit check ran; use “uncertain” when an attempt
could not support a confident result. Never turn task completion into a verified
requirement, or hide coverage gaps behind an overall score.

### Example result

*Illustrative only; no walkthrough was run for this example.*

> **Can a new editor create a project?**
>
> **What we checked:** One selected simulated editor tried the task from the home
> screen on the reviewed build.
>
> **What happened:** They found **New project**, entered “Project Atlas,” and saw
> it appear in the project list. [See the after-save screenshot.]
>
> **Task:** Completed.
>
> **Requirement checks:**
> - “A saved project appears in the list” — **Verified.** The final screen shows
>   Project Atlas in the list.
> - “An empty name shows a helpful message” — **Not tested.** The editor used a
>   name, so this run did not check the empty form.
>
> **Coverage gap:** One task and one selected profile only; no other roles or
> validation states were checked. This does not establish how real users or all
> users would perform.
>
> **Cost:** Unknown; provider usage wasn’t returned. Unknown is not $0.
>
> **Next:** Would you like me to check the empty-name case or stop here?

Use the real run’s evidence links and captured measurements in a report; never
copy the illustrative outcome or screenshot claim into an actual result.
