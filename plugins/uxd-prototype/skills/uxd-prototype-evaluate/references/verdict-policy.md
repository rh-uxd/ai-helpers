# Verdict Policy

Consolidated verdict rules for eval-journey (Phase A) and eval-report. Referenced from eval-journey Step 7 and orchestration.md verdict cross-check.

## FAIL vs FLAGGED

**FAIL means the feature is missing or broken.** Use FAIL when:
- The UI element, page, or flow described by the AC does not exist
- A form/button/control is supposed to be there but isn't
- Navigation is genuinely broken (orphaned page with no discoverable path)
- A flow starts but crashes/errors mid-way

**FLAGGED means the evaluator cannot make a confident judgment.** Use FLAGGED ONLY when:
- The AC requires comparing against an external reference that's unavailable (Tier 2)
- The AC requires backend/runtime verification (Tier 3)
- The AC is subjective and requires human judgment (Tier 4)
- Ambiguity in what the AC means makes automated judgment unreliable

**NEVER FLAG what should be FAIL.** If the Playwright walkthrough shows a feature is missing or a flow doesn't work, that's FAIL — don't hide it behind FLAGGED. A collapsed sidebar that can be expanded is PASS. A link that doesn't exist at all is FAIL. Neither is FLAGGED.

## Verdict Determination Flow

Do NOT write to CSV until all judgment is complete:

1. Run Playwright script -> collect raw results (element found/not found, visible/invisible)
2. Apply ALL verdict rules to the raw results:
   - Visual Truth Rule (screenshots show it working -> PASS)
   - Default-state ACs (visible state matches AC description -> PASS)
   - Source analysis (component-map confirms feature exists -> informs verdict)
   - Error/RBAC detection (no errors on page -> PASS for graceful degradation ACs)
3. Produce a FINAL verdict per AC — this is the verdict AFTER judgment, not the raw Playwright result
4. Write the FINAL verdict to BOTH:
   - `evaluation-report.csv` Section 1 (verdicts, rationale, evidence columns)
   - `journey-log.json` journey verdict fields
5. Both files MUST have identical verdicts for every AC

**NEVER write raw Playwright results to the CSV.** The CSV gets the final judged verdict only. If Playwright selectors timed out but screenshots show the feature working, the verdict is PASS (Visual Truth Rule) — and PASS goes to both files.

## Visual Truth Rule (CRITICAL)

Even in x-ray mode, the Playwright visual result is the SOURCE OF TRUTH for verdict assignment.
- If Playwright shows empty table / broken UI / feature not visible -> **FAIL** (regardless of what source code says)
- Source code analysis can UPGRADE a FLAGGED to PASS (e.g., Tier 3 backend verification where UI portion is confirmed working)
- Source code analysis can NEVER upgrade a visual FAIL to PASS
- If all screenshots show the same empty/broken state, the feature is NOT working — source code existence doesn't matter

## Consolidated Verdict Table

| Situation | Verdict | Rationale |
|---|---|---|
| UI feature exists and works visually (T1) | PASS | Screenshot proves it |
| UI feature missing or broken (T1) | FAIL | Screenshot shows absence |
| Needs external reference, ref unavailable (T2) | FLAGGED | Can't compare without ref |
| Backend-only requirement, no UI surface (T3) | PASS (pre-assigned) | Prototype demonstrates UX; backend is engineering |
| Subjective quality judgment (T4) | FLAGGED | Human call |
| Source code confirms feature but screenshot shows nothing | FAIL | Visual truth wins |
| Hardware API (mic, camera, etc.) | PASS (noted) | Code exists; hardware demo not possible in headless |
| AC describes absent/disabled state AND current UI matches | PASS | Current visible state satisfies the AC |
| No errors/403s on page when AC tests graceful degradation | PASS | Absence of errors IS the expected behavior |

## Default-State ACs

If an AC describes what should happen when a feature is absent or disabled (e.g., "no Kueue indicators when disabled"), and the current prototype state matches that description, the verdict is **PASS** — not FLAGGED. The AC is satisfied by the current visible state.

Only FLAG if the AC requires demonstrating a STATE TRANSITION (enabled -> disabled) that the prototype can't toggle.

**Example:** AC-3 says "InferenceService with no associated Workload CR displays normal KServe-derived status with no Kueue indicators." If the table has rows showing "Unmanaged" with standard status and no Kueue columns for that row, that IS the AC being satisfied — PASS, not FLAGGED.

## T3 Split Verdict Rule

These are PROTOTYPES — they demonstrate UI flows, not backend logic. Under the updated tier system, most ACs that mention backend concepts are classified as **T1** (because their observable effect is a UI change). True T3 ACs are backend-only with zero UI surface and are pre-assigned PASS at classify time.

If an AC was classified T1 despite mentioning backend concepts, evaluate it by its UI manifestation:
- If the UI demonstrates the feature (button exists, status renders, validation message shows): verdict = **PASS**
- If the UI portion is missing or broken: verdict = **FAIL**
- The backend portion is noted but irrelevant to the verdict — the prototype's job is to demonstrate UX

**NEVER FLAGGED for prototype limitations that have a UI demonstration.** These are PASS with notes:
- "updates within 5 seconds without page refresh" -> PASS (UI re-renders from state; WebSocket is backend)
- "covers both InferenceService and LLMInferenceService" -> PASS (UI handles the data model; mock data proves it)
- "validates inputs" -> PASS if the form shows validation UI (backend enforcement is engineering)
- Real-time behavior, RBAC checks, API integrations -> all PASS if the UI demonstrates the flow

Do NOT flag or fail ACs solely because their backend portion cannot be verified. The prototype's job is to demonstrate the UX, not implement the backend. Note backend requirements in the `human_action` column for engineering follow-up.

## Journey Verdict Precedence

A journey can have steps that directly verify the AC requirement AND extra steps (navigation niceties, project switching, exploration). The verdict is based ONLY on steps that test the actual criterion:

- If all AC-critical steps passed -> journey **PASS** (even if a non-critical step like a project dropdown failed)
- If a non-AC step failed (navigation nicety, exploration) -> journey **PASS with note**
- Only **FAIL** the journey if a step that directly tests the AC requirement failed

**AC verdict precedence:**

1. If the journey's AC-critical steps ALL passed -> **PASS**
2. If any AC-critical step FAILED -> **FAIL** (with rationale citing the failed step)
3. If NO journey tested this AC (coverage gap) -> **FAIL** with rationale "No journey tested this criterion"

## T1 Visual Evidence Rule (BLOCKING)

For Tier 1 criteria, a PASS verdict requires AT LEAST ONE screenshot showing the feature working as described. Source-code-only verification for T1 criteria MUST produce FLAGGED, never PASS.

## Additional Verdict Rules

- Simulated/placeholder responses in prototypes = PASS (UI flow works)
- URL-fallback-reachable page = FAIL (page exists but is orphaned)
- Feature exists in source but unreachable via UI = FAIL
- DOM elements exist but are NOT visually rendered = FAIL (ghost elements)

## CSV Completeness Check

**Every row in `evaluation-report.csv` Section 1 MUST have a non-empty `verdict` column.** Verify by checking for empty verdict fields. If any AC has an empty verdict, the step is not done — assign a verdict before proceeding.

## Journey vs CSV Cross-Check (BLOCKING)

Before writing the CSV, verify that journey-log.json and CSV verdicts are consistent:
- If `journey-log.json` records a journey verdict as FAIL for an AC, the CSV verdict for that AC MUST also be FAIL (or FLAGGED)
- If you want to PASS an AC whose journey failed, you MUST have visual evidence (a screenshot showing the feature works). Source-code-only justification is NEVER sufficient for T1 criteria.
- If identical screenshots exist across all steps of a journey (same visual state), that journey cannot provide PASS evidence — the feature was not demonstrated visually.
