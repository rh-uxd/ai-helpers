# eval-fix

Applies fixes to the prototype based on evaluation findings. Does NOT re-evaluate — that is eval-iterate's job after fixes are applied.

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `.artifacts/<KEY>/eval/refinement-suggestions.json` | Fix suggestions from eval-journey + eval-usability + eval-consistency | Yes |
| `.artifacts/<KEY>/eval/consistency-report.json` | PatternFly violations with file/line references | No |
| `--workspace` | Path to the prototype source code | Yes |
| `.artifacts/<KEY>/eval/extract-state.json` | AC context for understanding fix intent | No |
| `.artifacts/<KEY>/decisions/decisions.json` | Decision context (prevents undoing deliberate choices) | No |

## Outputs

| File | Description |
|------|-------------|
| Modified prototype files in `--workspace` | The actual code fixes |
| `.artifacts/<KEY>/eval/fix-log.json` | Record of what was fixed and why |

## Procedure

### Step 1: Read suggestions and prioritize

Read `.artifacts/<KEY>/eval/refinement-suggestions.json`. Suggestions have three types, applied in this order:

1. **Consistency violations** (`type: "consistency"`) — Deterministic fixes with explicit file paths and line numbers. Apply directly. These are guaranteed correct (PatternFly docs are the reference).
2. **AC failures** (`type: "ac_failure"`) — Code changes to make failing acceptance criteria pass. Require reading the verdict rationale.
3. **Usability gaps** (`type: "usability"`, score 0-1) — Design improvements from persona scoring.

**Skip already-applied suggestions:** If a suggestion has `"applied": true`, skip it entirely — it was fixed in a previous iteration.

Confidence filtering:
- `confidence: "high"` — Apply directly
- `confidence: "medium"` — Apply but note in fix-log as "medium confidence"
- `confidence: "low"` — Log but do NOT apply. These are flagged for human review.

### Step 2: Check decision context

If `.artifacts/<KEY>/decisions/decisions.json` exists, cross-reference each suggestion against design decisions. If a suggestion would undo a deliberate decision (e.g., "Decision 4 explicitly de-scoped multi-provider routing"), skip it and log:

```json
{
  "suggestion": "<description>",
  "action": "skipped",
  "reason": "Conflicts with Decision 4: explicitly de-scoped for low fidelity"
}
```

### Step 3: Apply consistency fixes

For each `type: "consistency"` suggestion:

1. Read the file at the specified path
2. Apply the fix (usually a single import change or prop modification)
3. Verify the fix doesn't break the file (basic syntax check)

### Step 4: Apply AC failure fixes

For each `type: "ac_failure"` suggestion:

1. Read the `fix_action` and `fix_file` fields from the suggestion
2. Read the current file content
3. Determine the minimum change needed to satisfy the AC
4. Apply the fix
5. If the fix requires a new file (e.g., missing route registration), create it following existing codebase patterns

### Step 4b: Attempt FLAGGED item fixes

For each AC with verdict FLAGGED in the CSV, check if a fix is feasible within the prototype scope:

| FLAGGED reason | Fix approach |
|---|---|
| Feature state can't be toggled (hardcoded flag) | Add a mock disabled state or a toggle in the prototype's feature flags UI |
| Wrong interaction pattern (e.g., expandable row instead of tooltip) | Change the component to match the AC specification |
| Source-code-only verification | Add visual indicator that demonstrates the feature |
| Cannot test in prototype | Skip — log as "deferred_to_human" with reason |

For each fixable FLAGGED item:
1. Read the AC text and FLAGGED rationale from the CSV
2. Determine if a prototype-level fix exists (not a backend change)
3. If fixable: apply the change and log in fix-log as `"type": "flagged_fix"`
4. If not fixable in prototype scope: log in fix-log `"skipped"` array with reason

This step allows the fix loop to resolve FLAGGED items that are actually fixable at the prototype level (like changing a component from expandable row to tooltip), while correctly deferring items that genuinely need human judgment or backend work.

### Step 5: Apply usability fixes (high/medium confidence only)

For each `type: "usability"` suggestion with `confidence != "low"`:

1. Read the `suggested_fix` and `affected_files`
2. Apply the change (usually label text, layout adjustment, or navigation link)
3. For `confidence: "medium"`, prefix the fix-log entry with "[MEDIUM]"

### Step 6: Write fix-log.json and mark applied suggestions

After writing the fix-log, update `refinement-suggestions.json` to mark each successfully applied suggestion so it is not re-attempted on subsequent iterations:

For each entry in fix-log.json where `applied == true`, find the matching suggestion in `refinement-suggestions.json` (match by `criterion_id` or `guideline_id` + `type`) and set:
```json
{ "applied": true, "applied_in_iteration": <current iteration number> }
```

fix-log.json format — a flat array where each entry includes BOTH the semantic
fields (type, criterion_id, file, change) AND the scorer-required fields
(description, applied, timestamp). The MLflow scorer `Fix Log Entry Schema`
validates that each entry has `description`, `applied`, and `timestamp` — without
them the scorer fails even though the fix data is present.

```json
[
  {
    "type": "consistency",
    "criterion_id": "icon-style-consistency",
    "file": "src/pages/AgentCatalog/AgentCatalog.tsx",
    "change": "Replaced FolderIcon with OutlinedFolderIcon",
    "confidence": "high",
    "description": "Replaced FolderIcon with OutlinedFolderIcon for icon-style-consistency",
    "applied": true,
    "timestamp": "2026-07-01T15:00:00.000Z"
  },
  {
    "type": "ac_failure",
    "criterion_id": "AC-7",
    "file": null,
    "change": null,
    "confidence": "low",
    "description": "AC-7: Conflicts with Decision 4 — skipped",
    "applied": false,
    "timestamp": "2026-07-01T15:00:00.000Z"
  }
]
```

Key rules for each entry:
- `description`: human-readable summary of what was done (or why it was skipped)
- `applied`: boolean — `true` if the fix was applied, `false` if skipped/deferred
- `timestamp`: ISO 8601 string when the fix was applied or skipped
- `type`, `criterion_id`, `file`, `change`, `confidence`: the semantic detail fields

### Step 7: PatternFly compliance validation (static checks only)

After all fixes are applied, read each modified file and verify the fixes didn't introduce PatternFly violations. These are **source-code-only checks** — no rendering or viewport verification.

**Import completeness:**
- Every PatternFly component used in the file has a corresponding import from `@patternfly/react-core` or `@patternfly/react-table`
- Icon components (`*Icon`) are imported from `@patternfly/react-icons`

**Label/status patterns:**
- Non-interactive `<Label>` components use `variant="outline"` (filled variant implies onClick)
- Tooltips use `<Tooltip content={...}>` wrapper, not inline `title` attributes

**Table structure (static tables only — skip for `.map()`-rendered dynamic tables):**
- If columns were added/removed in literal JSX, verify `<Thead>` column count matches `<Tbody>` rows
- Expandable rows have correct `colSpan` on the expanded `<Td>`

**If any check fails:** Fix the issue before writing fix-log.json.

**Note:** Viewport-level rendering validation (column truncation, responsive layout) cannot be verified from source alone. That's what eval-consistency `--mode=visual` handles post-journey.

## Rules

- Never fix something that was deliberately de-scoped by a design decision
- Never apply low-confidence usability suggestions automatically
- Apply consistency fixes FIRST (they reduce noise for subsequent iterations)
- Each fix should be minimal — change the least amount of code needed
- Do not refactor or restructure — only fix the specific issue
- Every applied fix MUST trace back to a `criterion_id` or `guideline_id` — no speculative improvements
- Do NOT make changes that aren't backed by a specific suggestion in refinement-suggestions.json
- Do NOT add features, polish, or enhancements beyond what the failing AC or violated guideline requires
- **Single-pass file reading:** When multiple suggestions target the same file, read it once, apply all matching fixes in a single pass, then run Step 7 validation. Do not read-fix-read-fix the same file repeatedly.
