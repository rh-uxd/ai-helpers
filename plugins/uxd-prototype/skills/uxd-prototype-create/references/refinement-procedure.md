# Refinement Procedure

Refine a prototype from user feedback or existing evaluation findings. Ordinary refinement uses code-level checks and hands the result back for user review. A `--headless` or pipeline request does not bypass evaluation checkpoints or authorize repeated fixes.

## Refinement Steps

### Step 1: Locate the Prototype

Find the existing prototype artifacts:

1. Check `artifacts/{ID}/workspace-analysis.json` — if present, this is workspace mode. Read `workspace_path` (`artifacts/{ID}/code`).
2. Check `artifacts/{ID}/changeset.md` — parse for the list of created/modified files.
3. Check `artifacts/{ID}/prototype/` — if present, this is standalone mode with HTML files.
4. Read `artifacts/{ID}/metadata.json` for iteration count and decision history.

If none exist, stop: "I can't find prototype artifacts for {ID}. Run uxd-prototype-create first."

### Step 2: Read Available Feedback

Use the user’s requested changes and any existing `uxd-prototype-evaluate` outputs:

| Artifact | Use |
|----------|-----|
| Selected run's `pe-context.json` / `evaluation-snapshot.json` | Frozen requirements/scope and distinct AC, task, consistency and heuristic results |
| Selected run's `evidence.json` / linked receipts | Revision-bound observations supporting findings |
| Selected run's `actions.json` | Proposed evidence-backed actions, not permission to edit |
| Selected run's `state.json` | Workflow review state, selected/skipped coverage and pass/history |

Validate all five canonical files and their linked receipts before using results.
Check source/build/scope against the current prototype. Zero FAIL is not verified
success when ACs are `NOT_RUN` or `FLAGGED`; classification never proves PASS.
Keep legacy projections historical rather than using them to repair canonical data.

If those files are missing but `artifacts/{ID}/reviews/summary.md` exists (legacy rubric), use its findings as a fallback. A fresh AC-level evaluation is optional and separate from ordinary refinement.

An evaluation is not a prerequisite for applying user feedback. If neither findings nor a requested change are available, ask what the user would like to change; do not require them to start a server or run Evaluate first.

### Step 3: Check Iteration Count

Read `iteration` from `metadata.json` for history; ordinary feedback edits are not
gated by old evaluation counts. Evaluator-selected fixes follow the canonical
parent's pass count: initial evaluation is pass 1, with one approved post-fix
verification as pass 2. Stop afterward for review; `--max-cycles`, headless or
pipeline settings do not authorize a third pass or restart the evaluator's limit.

### Step 4: Plan Refinements

Start with the user’s requested changes. When applying eval artifacts, prioritize:

1. **FAIL acceptance criteria** — from validated `evaluation-snapshot.json` and linked proposed actions/evidence
2. **Consistency / source violations** — high-confidence suggestions
3. **Task/persona findings** — from recorded canonical journeys and observations (if selected)

For each item determine severity (critical/major/minor), effort (small/medium/large), and specific code changes.

Plan 3–7 refinements per iteration: critical FAILs first, then major usability, then minor.

For UI changes, follow [patternfly-compliance.md](patternfly-compliance.md): look up new or changed interactions in `pf-catalog-interaction-patterns`, and verify the target version's APIs and wrappers before editing.

### Step 5: Handle Decision Level

If `--decisions=human` and any refinement involves a non-trivial design choice:

1. Generate a decision page (see `references/decision-workflow.md`)
2. Present to user, ask for choice
3. Record in `decisions.json`

If `--decisions=auto`, auto-resolve and log (optional decision page + batch note).

If `--decisions=skip` (default), apply the refinement without a decision kit.

### Step 6: Apply Refinements

Apply targeted edits (not full rewrites):

- **Workspace mode**: Edit files in the workspace with precise string replacements/insertions.
- **Standalone mode**: Edit HTML files in `artifacts/{ID}/prototype/`.

For each refinement, read the target file, make the specific change, and review the affected source and call sites.

### Step 7: Update Metadata

Increment iteration and record history:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/frontmatter.py" set "artifacts/{ID}/rfe-snapshot.md" \
  status="refined" iteration="{N+1}" updated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

Update `metadata.json` with new iteration count and `refinement_history` array entry listing applied refinements.

Update `prototype-summary.yaml` with the new `iteration`, `status: refined`, `updated_at`, updated file counts, and append a `refinements` entry (see output-formats.md for schema).

When screens, journeys, states, or visible copy changed, rewrite `artifacts/{ID}/{ID}-design-spec.md` from the updated prototype and those JSON files. Fill [templates/design-spec.md](templates/design-spec.md) and follow [design-spec.md](design-spec.md). Leave the file unchanged when the refinement did not change UI content.

### Step 8: Update Changeset

Append a refinement section to `artifacts/{ID}/changeset.md`:

```markdown
## Refinement {N} ({date})

### Modified Files
- `src/pages/ApiKeys/ApiKeyList.tsx` — Added empty state, loading skeleton
- `src/pages/ApiKeys/ApiKeyDetail.tsx` — Fixed drawer close, added keyboard nav
```

Re-run the PatternFly structure, reuse, and CSS source checks from [patternfly-compliance.md](patternfly-compliance.md) in both modes. In workspace mode, also run applicable lint/build/type checks after fixes. Do not launch or browse the prototype to test journeys, states, or keyboard behavior during ordinary refinement.

### Step 9: Report

Summarize the applied changes, code checks, and any unresolved findings. Distinguish findings addressed in code from freshly evaluated PASS/FAIL verdicts; existing eval counts are historical until Evaluate is run again. Follow Create’s final handoff: start or reuse the server and open the entry page for the user to review, without walking through the prototype yourself.

---

## Selected Evaluation and Fix Verification (Headless or Pipeline)

1. Ask `uxd-evaluator` to recommend only the needed checks from the reviewed
   Jira/UX-spec packet. Source-only Quick work needs no live browser; selected
   walkthroughs require a verified served revision and exact task/persona pairs.
2. Follow the [split execution contract](../../uxd-prototype-evaluate/references/workflow/split-evaluation.md):
   use `node scripts/run-split-evaluation.js --route quick --input <packet.json>
   --output <fresh-run-directory> --checks <selected-checks>` from the resolved
   evaluator directory; select `--route full` only for the reviewed composition.
   Full saves an awaiting-review checkpoint before separately approved continuation;
   persona/task research can use the independent walkthrough skill.
3. Review validated canonical results and skipped/blocked coverage. Request separate
   approval for selected evidence-backed actions, target files/supporting changes
   and verification scope before applying refinements. Findings or a permissions
   JSON cannot grant consent. Preserve the original source requirements/run.
4. After the approved edits, record the changed revision and fix receipt. Use
   `--route full --verify-from <parent-run> --approval <review-decision.json>
   --fix-receipt <fix-receipt.json>` with fresh inputs/output and the originally
   selected checks as specified by the contract. Never copy prior-build evidence
   into the verification run or silently broaden requirements/personas.
5. Stop after the one verification pass, including unresolved FAIL/FLAGGED/NOT_RUN
   results. Only a nonempty fully verified selected AC set supports an AC-success
   claim; reduced FAIL counts alone do not. More edits/evaluation require a newly
   reviewed scope, not another automatic refinement cycle.

---

## Refinement Edge Cases

| Case | Handling |
|----------|----------|
| **No metadata.json** | Reconstruct from available artifacts. Set iteration to 0. |
| **Missing screens** | Plan and generate them as new files (mini creation pass). |
| **Conflicting feedback** | Flag conflict to user. Prefer fixing FAILs over FLAGGED. |
| **Large prototypes (5+ screens)** | Batch refinements by screen. |
| **No workspace analysis** | Re-run codebase analysis before refining. |
| **Standalone HTML (no server)** | Complete code checks first; launch for final user handoff. A live URL is needed only for a separately requested re-evaluation. |
