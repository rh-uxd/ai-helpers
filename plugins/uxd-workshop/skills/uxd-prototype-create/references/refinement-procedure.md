# Refinement Procedure

Full procedure for iterative prototype improvement after `uxd-prototype-evaluate`. Load this when the user asks to refine a prototype or when running the automated refine→eval loop.

## Refinement Steps

### Step 1: Locate the Prototype

Find the existing prototype artifacts:

1. Check `.artifacts/{ID}/workspace-analysis.json` — if present, this is workspace mode. Read workspace path.
2. Check `.artifacts/{ID}/changeset.md` — parse for the list of created/modified files.
3. Check `.artifacts/{ID}/prototype/` — if present, this is standalone mode with HTML files.
4. Read `.artifacts/{ID}/metadata.json` for iteration count and decision history.

If none exist, stop: "I can't find prototype artifacts for {ID}. Run uxd-prototype-create first."

### Step 2: Read Eval Feedback

Prefer Playwright eval outputs from `uxd-prototype-evaluate`:

| Artifact | Use |
|----------|-----|
| `.artifacts/{ID}/evaluation-report.csv` | AC verdicts (PASS / FAIL / FLAGGED) and usability scores |
| `.artifacts/{ID}/refinement-suggestions.json` | Actionable fix suggestions from Phase A / consistency |
| `.artifacts/{ID}/iteration-log.json` | Prior fix-loop history |
| `.artifacts/{ID}/usability-thinkaloud-*.md` | Phase B persona findings (optional) |

**Pass condition for stopping refinement:** zero `FAIL` verdicts in Section 1 of `evaluation-report.csv`. `FLAGGED` items need human review but do not block the loop by themselves.

If those files are missing but `.artifacts/{ID}/reviews/summary.md` exists (legacy rubric), use its findings as a fallback and tell the user to re-run `uxd-prototype-evaluate` with a live prototype URL for AC-level feedback.

If no eval exists at all, ask: "I don't see evaluation feedback. Start the prototype and run `uxd-prototype-evaluate {ID} <URL> [--workspace=…]` first, or tell me what to change."

### Step 3: Check Iteration Count

Read `iteration` from `metadata.json`. If it equals or exceeds `--max-cycles`:

```
Refinement limit reached (iteration {N} of {max}).
Current: {pass}/{total} PASS, {fail} FAIL, {flagged} FLAGGED.
To continue, re-run with --max-cycles {max+2}.
```

### Step 4: Plan Refinements

Prioritize from eval artifacts:

1. **FAIL acceptance criteria** — from CSV + matching entries in `refinement-suggestions.json`
2. **Consistency / source violations** — high-confidence suggestions
3. **Phase B usability** — S1/S2 issues from think-aloud or journey log (if present)

For each item determine severity (critical/major/minor), effort (small/medium/large), and specific code changes.

Plan 3–7 refinements per iteration: critical FAILs first, then major usability, then minor.

### Step 5: Handle Decision Mode

If `--mode=decide` and any refinement involves a non-trivial design choice:

1. Generate a decision page (see `references/decision-workflow.md`)
2. Present to user, ask for choice
3. Record in `decisions.json`

If `--mode=auto`, auto-resolve and log.

### Step 6: Apply Refinements

Apply targeted edits (not full rewrites):

- **Workspace mode**: Edit files in the workspace with precise string replacements/insertions.
- **Standalone mode**: Edit HTML files in `.artifacts/{ID}/prototype/`.

For each refinement: read target file, make the specific change, verify it doesn't break other parts.

### Step 7: Update Metadata

Increment iteration and record history:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/frontmatter.py" set ".artifacts/{ID}/rfe-snapshot.md" \
  status="refined" iteration="{N+1}" updated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

Update `metadata.json` with new iteration count and `refinement_history` array entry listing applied refinements.

Update `prototype-summary.yaml` with the new `iteration`, `status: refined`, `updated_at`, updated file counts, and append a `refinements` entry (see output-formats.md for schema).

### Step 8: Update Changeset

Append a refinement section to `.artifacts/{ID}/changeset.md`:

```markdown
## Refinement {N} ({date})

### Modified Files
- `src/pages/ApiKeys/ApiKeyList.tsx` — Added empty state, loading skeleton
- `src/pages/ApiKeys/ApiKeyDetail.tsx` — Fixed drawer close, added keyboard nav
```

For workspace mode, re-run post-change verification (lint + build).

### Step 9: Report

Print a summary showing previous FAIL count, findings fixed, remaining FAILs/FLAGGED, and applied changes.

---

## Auto-Refinement Loop (Headless)

With `--headless`, run an automated loop (requires a live prototype URL and workspace for evaluate):

```
refine → uxd-prototype-evaluate → check FAIL count → refine again → ...
```

1. Apply refinements (Steps 1–8 above)
2. Ensure the prototype is serving at `{URL}` (start/restart if needed)
3. Run `uxd-prototype-evaluate {ID} {URL} [--workspace=…] --no-fix` (or with fix disabled so create owns edits)
4. Check exit conditions:
   - **Pass**: zero FAIL in `evaluation-report.csv` → exit success
   - **Max cycles**: iteration = `--max-cycles` → exit
   - **Plateau**: FAIL count unchanged for 2 consecutive iterations → exit
5. If no exit condition met, loop back to step 1

Progress output:

```
[Iteration 1] FAIL: 3 → 1 (−2) — 4 refinements applied
[Iteration 2] FAIL: 1 → 0 (−1) — 2 refinements applied
[Iteration 3] FAIL: 0 — AC pass, stopping.
```

---

## Refinement Edge Cases

| Scenario | Handling |
|----------|----------|
| **No metadata.json** | Reconstruct from available artifacts. Set iteration to 0. |
| **Missing screens** | Plan and generate them as new files (mini creation pass). |
| **Conflicting feedback** | Flag conflict to user. Prefer fixing FAILs over FLAGGED. |
| **Large prototypes (5+ screens)** | Batch refinements by screen. |
| **No workspace analysis** | Re-run codebase analysis before refining. |
| **Standalone HTML (no server)** | Tell user to serve `.artifacts/{ID}/prototype/` (e.g. `npx serve`) before re-eval. |
