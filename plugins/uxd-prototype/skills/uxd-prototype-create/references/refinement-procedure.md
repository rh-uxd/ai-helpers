# Refinement Procedure

Refine a prototype from user feedback or existing evaluation findings. Ordinary refinement uses code-level checks and hands the result back for user review. The refine→evaluate loop runs only when explicitly requested with `--headless` or pipeline mode.

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
| `artifacts/{ID}/eval/evaluation-report.csv` | AC verdicts (PASS / FAIL / FLAGGED) and usability scores |
| `artifacts/{ID}/eval/refinement-suggestions.json` | Actionable fix suggestions from Phase A / consistency |
| `artifacts/{ID}/eval/iteration-log.json` | Prior fix-loop history |
| `artifacts/{ID}/eval/usability-thinkaloud-*.md` | Phase B persona findings (optional) |

**For the explicit evaluation loop only, pass condition for stopping refinement:** zero `FAIL` verdicts in Section 1 of `evaluation-report.csv`. `FLAGGED` items need human review but do not block the loop by themselves.

If those files are missing but `artifacts/{ID}/reviews/summary.md` exists (legacy rubric), use its findings as a fallback. A fresh AC-level evaluation is optional and separate from ordinary refinement.

An evaluation is not a prerequisite for applying user feedback. If neither findings nor a requested change are available, ask what the user would like to change; do not require them to start a server or run Evaluate first.

### Step 3: Check Iteration Count

Read `iteration` from `metadata.json` for history. For each explicitly requested automated evaluation loop, initialize a separate cycle counter to zero and increment it once per completed refine→evaluate pass. Apply `--max-cycles` to that counter; ordinary feedback edits are not gated by old evaluation counts. If the loop reaches its cycle limit:

```
Refinement limit reached (automated cycle {cycle} of {max}).
Current: {pass}/{total} PASS, {fail} FAIL, {flagged} FLAGGED.
To continue, re-run with --max-cycles {max+2}.
```

### Step 4: Plan Refinements

Start with the user’s requested changes. When applying eval artifacts, prioritize:

1. **FAIL acceptance criteria** — from CSV + matching entries in `refinement-suggestions.json`
2. **Consistency / source violations** — high-confidence suggestions
3. **Phase B usability** — S1/S2 issues from think-aloud or journey log (if present)

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

## Auto-Refinement Loop (Headless)

Only with an explicit `--headless` or pipeline request, run an automated loop (requires a live prototype URL and workspace for evaluate):

```
refine → uxd-prototype-evaluate → check FAIL count → refine again → ...
```

Initialize the automated cycle counter to zero when starting this loop, independently of the historical `metadata.json` iteration count.

1. Apply refinements (Steps 1–8 above)
2. Ensure the prototype is serving at `{URL}` (start/restart if needed)
3. Run `uxd-prototype-evaluate {ID} {URL} [--workspace=…] --no-fix` (or with fix disabled so create owns edits)
4. Increment the automated cycle counter once, then check exit conditions:
   - **Pass**: zero FAIL in `evaluation-report.csv` → exit success
   - **Max cycles**: automated cycle count >= `--max-cycles` → exit
   - **Plateau**: FAIL count unchanged for 2 consecutive cycles in this loop → exit
5. If no exit condition met, loop back to step 1

Progress output:

```
[Cycle 1] FAIL: 3 → 1 (−2) — 4 refinements applied
[Cycle 2] FAIL: 1 → 0 (−1) — 2 refinements applied; AC pass, stopping.
```

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
