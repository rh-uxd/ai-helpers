# Refinement Procedure

Full procedure for iterative prototype improvement. Load this when the user asks to refine a prototype or when running the automated refine-review loop.

## Refinement Steps

### Step 1: Locate the Prototype

Find the existing prototype artifacts:

1. Check `.artifacts/{ID}/workspace-analysis.json` — if present, this is workspace mode. Read workspace path.
2. Check `.artifacts/{ID}/changeset.md` — parse for the list of created/modified files.
3. Check `.artifacts/{ID}/prototype/` — if present, this is standalone mode with HTML files.
4. Read `.artifacts/{ID}/metadata.json` for iteration count and decision history.

If none exist, stop: "I can't find prototype artifacts for {ID}. Run uxd-prototype-create first."

### Step 2: Read Review Feedback

Read `.artifacts/{ID}/reviews/summary.md` from `uxd-prototype-evaluate` output:

- Per-dimension scores (completeness, usability, feasibility) — each 0-2
- Total score (0-6) and verdict (`rubric-pass` or `needs-attention`)
- Specific findings with severity
- Prioritized recommendations

If no review exists, ask: "I don't see review feedback. Run uxd-prototype-evaluate first, or tell me what to change."

### Step 3: Check Iteration Count

Read `iteration` from `metadata.json`. If it equals or exceeds `--max-cycles`:

```
Refinement limit reached (iteration {N} of {max}).
Current score: {score}/6 ({verdict}).
To continue, re-run with --max-cycles {max+2}.
```

### Step 4: Plan Refinements

Categorize findings by dimension:

| Dimension | Typical Refinements |
|-----------|-------------------|
| **Completeness** | Missing screens, unimplemented stories, missing CRUD operations |
| **Usability** | Poor nav flow, unclear CTAs, missing feedback, a11y gaps |
| **Feasibility** | Impossible interactions, non-existent PF6 components |

For each finding determine severity (critical/major/minor), effort (small/medium/large), and specific code changes needed.

Plan 3-7 refinements per iteration, prioritized: critical first, then major, then minor.

### Step 5: Handle Decision Mode

If `--mode=decide` and any refinement involves a non-trivial design choice:

1. Generate a decision page using `${CLAUDE_SKILL_DIR}/templates/decision-pages/decision-template.html`
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

Print a summary showing previous score, findings fixed, remaining issues, and applied changes.

---

## Auto-Refinement Loop (Headless)

With `--headless`, run an automated loop:

```
refine → review → check scores → refine again → ...
```

1. Apply refinements (Steps 1-8 above)
2. Run `uxd-prototype-evaluate` internally to rescore
3. Check exit conditions:
   - **Scores pass**: Total ≥ 5/6 and no zeros → exit success
   - **Max cycles reached**: iteration = `--max-cycles` → exit
   - **Plateau**: Score unchanged for 2 consecutive iterations → exit
4. If no exit condition met, loop back to step 1

Progress output:

```
[Iteration 1] Score: 3/6 → 4/6 (+1) — 4 refinements applied
[Iteration 2] Score: 4/6 → 5/6 (+1) — 2 refinements applied
[Iteration 3] Score: 5/6 — rubric-pass, stopping.
```

---

## Refinement Edge Cases

| Scenario | Handling |
|----------|----------|
| **No metadata.json** | Reconstruct from available artifacts. Set iteration to 0. |
| **Missing screens** | Plan and generate them as new files (mini creation pass). |
| **Conflicting feedback** | Flag conflict to user. In auto mode, prefer usability fixes. |
| **Large prototypes (5+ screens)** | Batch refinements by screen. |
| **No workspace analysis** | Re-run Step 6 (codebase analysis) before refining. |
