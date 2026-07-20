# eval-classify

Phase 2a of the eval pipeline. Classifies each acceptance criterion into a tier that determines *how* to evaluate it, and initializes the evaluation CSV with headers and tier assignments.

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `.artifacts/<KEY>/extract-state.json` | AC list with references and feature_context, from eval-extract | Yes |
| `config/csv-schema.yaml` | CSV section/column definitions | Yes |

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/evaluation-report.csv` | Section 1 initialized with headers + tier assignments (no verdicts yet) |

## Tier Definitions

These prototypes are **functional TypeScript applications** built with Cursor -- they have real navigation, clickable UI, forms, data tables, modals, and often simulated API responses. The tier system should reflect what is actually testable from this kind of prototype, not from a static wireframe.

**Guiding principle:** Minimize FLAGGEDs. A FLAGGED verdict that cannot be resolved triggers fix loop iterations that waste time. Only flag what genuinely requires a human designer's judgment. Everything else should get a clear PASS or FAIL.

| Tier | What it means | Verdict options | When to use |
|------|---------------|-----------------|-------------|
| **T1** | Verifiable from the prototype UI | PASS or FAIL | Any AC where the answer is visible: elements exist, flows work, text appears, interactions respond. This is the default tier -- most ACs in a functional prototype are T1. |
| **T2** | Needs external reference to compare against | PASS, FAIL, or FLAGGED | AC explicitly references another product, design system doc, or standard that must be compared side-by-side. Rare in practice. |
| **T3** | Backend-only with no UI surface | PASS (noted) | AC describes purely backend behavior with zero UI manifestation (e.g., "BFF validates request size", "API rate limits"). These auto-PASS with a note -- the prototype's job is to demonstrate UX, not implement backends. |
| **T4** | Subjective -- needs human designer judgment | FLAGGED with evidence | AC requires qualitative assessment: "user-friendly", "intuitive", "appropriate language", "clear hierarchy". Provide screenshot evidence and flag for human review. This is the ONLY tier that should routinely produce FLAGGEDs. |

**T5 is removed.** Headed-browser limitations (microphone, camera, geolocation, WebRTC) are edge cases that auto-PASS with a note: "Hardware API -- verified code exists, cannot demonstrate in headless." These do not trigger the fix loop and do not need human review. If a prototype has a microphone button, the button exists (T1); whether it actually records audio is a hardware concern that doesn't affect UX evaluation.

## Procedure

### Step 1: Read extract-state.json

Load the AC list, criterion-to-reference map, and `feature_context` from `.artifacts/<KEY>/extract-state.json`.

If `feature_context.ui_enhancements` exists, use it as supplementary signal for tier decisions -- it describes what the prototype is supposed to visually demonstrate.

### Step 2: Classify each criterion

For each AC in the list, determine its tier. **Default to T1 unless there is a strong reason not to.** These are functional prototypes -- if it's about UI, it's testable.

**Tier 1 — Verifiable from prototype (DEFAULT):**
- Criteria about UI elements, forms, components, flows, visibility, navigation, interactions
- Criteria about conditional rendering ("when X, show Y" / "when X, hide Y")
- Criteria about data display (tables, lists, status indicators, labels, tooltips)
- Criteria about real-time updates -- if the prototype renders from state, re-renders are testable even without a real backend
- Criteria about error states -- if the prototype shows error UI, that's testable
- Criteria mentioning backend concepts BUT whose observable effect is a UI change -- **still T1**. Examples:
  - "validates inputs" → T1 if the prototype shows validation UI (red borders, error messages)
  - "updates within 5 seconds" → T1 if the prototype re-renders from state (timing is a backend concern, but the UI update is visible)
  - "RBAC prevents access" → T1 if the prototype shows a graceful degradation state
  - "covers both InferenceService and LLMInferenceService" → T1 if the prototype renders both in mock data

**Use `feature_context.ui_enhancements` to confirm T1:** If the UI enhancements section describes specific visual elements (columns, tooltips, labels, panels) that an AC references, the AC is T1 regardless of backend language in the AC text.

**Tier 2 — Needs external reference:**
- ONLY when an AC explicitly says "align with [other product]", "match [external system]'s behavior", or references a specific external design doc that must be fetched and compared
- Check the reference map: does this AC have a fetchable URL to compare against?
- Rare in practice -- most ACs describe what the prototype should do, not what it should match externally

**Tier 3 — Backend-only, no UI surface:**
- ONLY for ACs that describe purely backend/infrastructure behavior with zero observable UI effect
- Examples: "BFF accepts 50MB request bodies", "catalog YAML schema validates", "API returns 429 after rate limit"
- These auto-PASS with note: "Backend-only -- no UI component to evaluate. Noted for engineering."
- If the AC has ANY UI manifestation (error message, loading state, empty state, disabled button), it is NOT T3 -- it is T1

**Tier 4 — Subjective, needs human judgment:**
- Criteria about quality, readability, appropriateness, user-friendliness that cannot be objectively verified
- Keywords: "user-friendly", "intuitive", "clear", "appropriate", "natural language"
- Provide evidence (screenshots) and FLAGGED for the designer to judge
- This is the only tier that should routinely produce FLAGGEDs that might trigger attention

**Classification bias: When in doubt, choose T1.** A T1 that gets a PASS moves the pipeline forward. A T3/T4 that gets FLAGGED may stall it. Since these are real functional apps, err toward testable.

### Step 3: Write evaluation-report.csv (Section 1 header + tier rows)

```
# ACCEPTANCE CRITERIA
criterion_id,source,tier,criterion_text,verdict,rationale,evidence,fix_action,fix_file,human_action
AC-1,jira,T1,"Kueue status displays scheduling state in Status column",,,,,,
AC-2,jira,T1,"No Kueue indicators when feature disabled",,,,,,
AC-3,jira,T3,"BFF validates request body size",,Backend-only -- no UI component to evaluate. Noted for engineering.,,,,
AC-4,jira,T4,"User-friendly terminology for scheduling states",,,,,,Assess whether status labels use appropriate plain language
```

All 10 columns are required per `config/csv-schema.yaml`. Leave `verdict`, `rationale`, `evidence`, `fix_action`, `fix_file`, `human_action` empty for T1 and T2 — eval-journey fills those in. For T3 (backend-only), set verdict to PASS immediately with a rationale note. For T4, leave verdict empty but populate `human_action` with what the designer should assess.

## Rules

- Classification is deterministic given the same inputs. Same AC text + same references + same feature_context = same tier.
- **Default to T1.** Only use T2/T3/T4 when there is a clear, specific reason the AC cannot be evaluated from the prototype UI.
- T3 ACs get their verdict assigned at classification time (PASS with note). They do NOT enter the journey loop.
- T4 ACs get FLAGGED after eval-journey provides evidence. They are the only tier expected to produce FLAGGEDs.
- Never generate journey steps for T3 ACs (backend-only, no UI to test).
- Every criterion gets a tier. No criterion is skipped.
- The CSV schema is strict — all 10 columns must be present, even if empty.
- **If an AC mentions backend concepts but has any observable UI effect, it is T1.** The prototype demonstrates UX, not backend logic.
