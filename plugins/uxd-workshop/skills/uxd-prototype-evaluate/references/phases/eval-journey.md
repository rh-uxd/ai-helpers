# eval-journey

Executes Playwright walkthroughs for each journey defined by eval-extract. Operates in **x-ray mode** (Phase A only) — full workspace source access for fast AC verification. Persona-driven usability walkthroughs are handled separately by `eval-usability` (Phase B).

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `.artifacts/<KEY>/eval/extract-state.json` | Journey definitions, persona selection, AC list | Yes |
| `.artifacts/<KEY>/eval/evaluation-report.csv` | Tier-classified ACs from eval-classify (Section 1 with tiers, no verdicts) | Yes |
| `.artifacts/<KEY>/eval/navigation-hints.json` | Selectors, routes, nav hierarchy from eval-hint | No |
| `.artifacts/<KEY>/eval/mr-delta.json` | Changed files (for nav gap detection, URL fallback hints) | No |
| Prototype URL | Live URL to test against (e.g., `http://localhost:4200`) | Yes |
| `--mode` | `informed` (x-ray mode, the only mode for this skill) | No |
| `--rerun-only` | Comma-separated AC IDs — only run journeys testing these ACs | No |
| `tests/fixtures/manifest.json` | Test fixtures for file uploads and chat input | No |

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/eval/journey-log.json` | Full Playwright step log with actions, results, screenshots, exploration |
| `.artifacts/<KEY>/eval/scripts/journey-test.mjs` | Generated Playwright script (kept for re-runs) |
| `.artifacts/<KEY>/eval/screenshots/` | Journey step screenshots |
| `.artifacts/<KEY>/eval/evaluation-report.csv` | Updated Section 1 with verdicts (PASS/FAIL/FLAGGED per AC) |
| `.artifacts/<KEY>/eval/refinement-suggestions.json` | FAIL criteria fix suggestions |

## Procedure

### Mode Selection

**`--mode=informed` (Phase A — X-Ray AC Validation):**

The x-ray evaluator has full workspace access and uses it for speed. The goal is to verify acceptance criteria as fast as possible, not to test discoverability.

- Read workspace source files directly for selectors, routes, and page structure
- Use `page.goto` freely for navigation (speed over realism)
- Use CSS selectors from source code to locate elements
- No brute-force expansion, no discovery-first pretense
- No persona simulation, no exploration phase
- Screenshots are evidence of PASS/FAIL only
- Produces: verdicts, refinement-suggestions, screenshots

Navigation strategy for x-ray mode:
```javascript
async function navigateInformed(page, route, selector) {
  await page.goto(`${baseUrl}${route}`);
  await page.waitForLoadState('domcontentloaded');
  if (selector) {
    await page.waitForSelector(selector, { timeout: 5000 }).catch(() => null);
  }
  // ALWAYS wait for page content to render before screenshots
  await page.waitForTimeout(1000);
}
```

**X-RAY MODE VERDICT RULE — Visual truth overrides source analysis:**

Even in x-ray mode, the Playwright visual result is the SOURCE OF TRUTH for verdict assignment.
- If Playwright shows empty table / broken UI / feature not visible → **FAIL** (regardless of what source code says)
- Source code analysis can UPGRADE a FLAGGED to PASS (e.g., Tier 3 backend verification where UI portion is confirmed working)
- Source code analysis can NEVER upgrade a visual FAIL to PASS
- If all screenshots show the same empty/broken state, the feature is NOT working — source code existence doesn't matter

The x-ray evaluator has code access for NAVIGATION speed, not for verdict override. The verdict still comes from what the user would see.

When `--mode=informed`, skip Steps 3 and 3b below (hint fallback logic is unnecessary — read source directly). Go straight to Step 4 with x-ray navigation.

---

### Step 1: Setup Playwright

```bash
EVAL_SKILL_ROOT="${CLAUDE_SKILL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)}"
# Stay on / return to UXD_PROJECT_ROOT after install — do not leave cwd in the skill dir
# (relative .artifacts writes would land inside the skill).
PROJECT_ROOT="${UXD_PROJECT_ROOT:-$(pwd)}"
if ! npx playwright --version >/dev/null 2>&1; then
  cd "$EVAL_SKILL_ROOT"
  npm install
  npx playwright install chromium firefox
  cd "$PROJECT_ROOT"
else
  echo "Playwright already installed, skipping setup"
fi
mkdir -p "${ARTIFACTS_DIR}/scripts" "${ARTIFACTS_DIR}/screenshots"
```

**Browser selection:** Use Firefox by default (more reliable CSS rendering for PatternFly expandable components). Chromium's headless mode can incorrectly collapse `isExpanded={false}` rows to zero height.

```javascript
import { firefox } from 'playwright';  // preferred
// fallback: import { chromium } from 'playwright';
const browser = await firefox.launch({ headless: true });
```

If Firefox is not installed, fall back to Chromium. The script should import and try Firefox first.

### Step 2: Prepare screenshots directory

```bash
rm -rf "${ARTIFACTS_DIR}/screenshots"
mkdir -p "${ARTIFACTS_DIR}/screenshots"
```

On re-iterations with `--rerun-only`, only clear screenshots for re-run journeys (preserve PASS journey screenshots).

### Step 3: Load navigation hints as FALLBACK (the "colleague" pattern)

If `.artifacts/<KEY>/eval/navigation-hints.json` exists (produced by eval-hint), it is available as a **fallback safety net** — NOT pre-loaded knowledge.

**How hints work (try discovery first, consult only when stuck):**

The generated Playwright script navigates using ONLY visible UI elements first. Hints are consulted ONLY after an unassisted attempt fails:

1. **First attempt:** Navigate using click-first (visible buttons, links, expandable sections found by brute-force)
2. **If stuck (timeout after 5s):** Consult `navigation-hints.json` for a targeted hint
3. **Mark the step as `navigate-assisted`:** The navigation succeeded but only with help
4. **Usability impact:** Assisted steps cap dimension scores at 1 for affected dimensions

**What each hint type provides as fallback:**

- **`nav_sections`:** ONLY used after brute-force expansion fails. If the script tried all visible nav buttons and still can't find the target, THEN use the hint to expand the specific parent. Log: `"navigate-assisted: hint revealed target in 'Gen AI studio' section"`
- **`selectors`:** Used to VERIFY elements after navigation succeeds (confirmation, not discovery). If the generic selector finds nothing, try the hint selector as a fallback check.
- **`routes`:** Used as diagnostic `page.goto` ONLY after click-first fails completely. Distinguishes "orphaned page" from "doesn't exist." NEVER marks a step PASS.
- **`page_structure`:** Used to set expectations for what should be on the page — helps write better narrations, not navigate.

**If `navigation-hints.json` does not exist**, the script works with brute-force only (slower but honest).

**The key principle:** A persona who needs a hint to find something is revealing a discoverability problem. The hint prevents the walkthrough from being totally blocked while preserving the signal that "a real user would struggle here."

### Step 3b: Journey skip check (when `--rerun-only` set)

For each journey, check if ANY of its `ac_ids` are in `--rerun-only`. If none are, skip the journey — carry forward its previous `journey-log.json` entry and screenshots.

### Step 4: Generate and run Playwright script

Generate `.artifacts/<KEY>/eval/scripts/journey-test.mjs` with two phases in a single browser session.

**Path rules:** Write the script under the pinned `${ARTIFACTS_DIR}/scripts/` (consumer repo `.artifacts/<KEY>/eval/scripts/`). Never write `journey-test.mjs` into `${CLAUDE_SKILL_DIR}` or the project root. Create the directory first: `mkdir -p "${ARTIFACTS_DIR}/scripts"`.

**Phase 1 — Prescribed Journeys:**

For each journey from `extract-state.json > journey_definitions`:

1. Start at the prototype URL (ONLY acceptable `page.goto` — initial entry)
2. For each step: locate target via UI clicks, log the result
3. **Click-first rule:** Every navigation via visible UI elements only
4. If a step fails (element not found, timeout): mark `"FAIL"`, run `page.goto` as diagnostic ONLY
5. **NEVER mark a step PASS if it required `page.goto`** — a step needing direct URL = ALWAYS FAIL (orphaned page)

#### Sidebar Navigation Strategy (PatternFly expandable nav)

PatternFly-based prototypes often use collapsible nav sections. A link inside a collapsed section IS reachable — it just requires expanding the parent first. This is normal click-first navigation, NOT a failure.

**The generated Playwright script MUST include this nav expansion logic (discovery first, hints as fallback):**

```javascript
// navHints loaded ONLY for fallback use
const navHints = loadHintsOrNull('.artifacts/<KEY>/eval/navigation-hints.json');

async function navigateViaSidebar(page, targetText) {
  // Strategy 1: Direct click — link is already visible (no hints needed)
  let link = page.locator(`nav a:has-text("${targetText}")`).first();
  if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
    await link.click();
    return { success: true, method: 'direct', assisted: false };
  }

  // Strategy 2: Brute-force — try all visible expandable nav buttons (discovery)
  const navButtons = page.locator('nav button');
  const btnCount = await navButtons.count();
  for (let i = 0; i < btnCount; i++) {
    const btn = navButtons.nth(i);
    const isVisible = await btn.isVisible().catch(() => false);
    const expanded = await btn.getAttribute('aria-expanded');
    if (isVisible && expanded === 'false') {
      await btn.click();
      await page.waitForTimeout(500);
      link = page.locator(`nav a:has-text("${targetText}")`).first();
      if (await link.isVisible({ timeout: 1500 }).catch(() => false)) {
        await link.click();
        const sectionText = await btn.textContent().catch(() => '');
        return { success: true, method: 'brute_expand', section: sectionText.trim(), assisted: false };
      }
    }
  }

  // Strategy 3: FALLBACK — consult hints (marks step as navigate-assisted)
  if (navHints?.nav_sections) {
    for (const [sectionName, info] of Object.entries(navHints.nav_sections)) {
      const children = info.children || info;
      if (Array.isArray(children) && children.includes(targetText)) {
        const selector = info.selector || `button:has-text("${sectionName}")`;
        const sectionBtn = page.locator(selector).first();
        if (await sectionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sectionBtn.click();
          await page.waitForTimeout(500);
          link = page.locator(`nav a:has-text("${targetText}")`).first();
          if (await link.isVisible({ timeout: 1500 }).catch(() => false)) {
            await link.click();
            // ASSISTED — this is a discoverability finding
            return { success: true, method: 'hint_assist', section: sectionName, assisted: true };
          }
        }
      }
    }
  }

  return { success: false, method: 'none', assisted: false };
}
```

**Strategy order: discovery first (1, 2), then hint fallback (3).**

- `method: 'direct'` — link was visible, no expansion needed (best case)
- `method: 'brute_expand'` — persona found it by exploring sections (acceptable)
- `method: 'hint_assist'` — persona got stuck, asked a "colleague" (discoverability issue logged)
- `method: 'none'` — even hints couldn't help (genuine failure)

When `assisted: true`, the step is logged with `navigate-assisted` and usability dimension scores are capped at 1 for Workflow Continuity and Mental Model Fidelity.

**This is NOT a `page.goto` fallback.** Expanding a parent section is legitimate user behavior — a real user clicks the section header to reveal sub-items. Score it as a PASS with a note about the expansion, not a FAIL.

**When to mark navigation as FAIL vs PASS:**
- Parent section exists but is collapsed → expand it → child link visible → click → **PASS** (normal nav)
- No parent section contains the target link, `page.goto` shows it exists → **FAIL** (orphaned page, genuine usability issue)
- No parent section AND `page.goto` fails → **FAIL** (page doesn't exist)
- Target link visible without expansion → **PASS** (ideal nav)

#### Verdict Assignment — FAIL vs FLAGGED

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

#### Journey Completeness Rule (MANDATORY)

The generated `journey-test.mjs` MUST contain:
- **One journey function for EVERY entry** in `extract-state.json > journey_definitions`
- If extract-state has 6 journeys, the script MUST have 6 journey functions
- Each function MUST test the specific AC IDs listed in that journey's `ac_ids` array
- Each function MUST produce a verdict (PASS/FAIL) and log steps to the journey-log

**After generating the script, verify before running:**
```
journey_count_in_script == len(extract-state.journey_definitions)
```
If they don't match, the script is incomplete. Add the missing journey functions before running.

Journey functions CAN be simple for Tier 3/4 criteria that can't be fully tested from UI:
```javascript
// Tier 3 journey: verify what's observable, FLAGGED for what isn't
async function runJourney5(page) {
  // Navigate to the page
  // Check if any UI elements related to this AC exist
  // If yes: note what's observable, FLAGGED for the backend part
  // If no: FAIL — not even the UI portion is implemented
}
```

But the function MUST exist and MUST produce a verdict. No journey definition may be skipped.

#### Journey Step Relevance Rule

Every step in a journey MUST be necessary to verify the AC. Do not add steps that:
- Test interactions unrelated to the criterion (e.g., project dropdown when AC is about status labels)
- Attempt to toggle feature flags or change environment state (impossible in prototypes)
- Navigate to pages not mentioned in the AC
- Require backend state changes that prototypes can't perform

If an AC describes a disabled/alternative state (e.g., "when Kueue is not enabled"):
- DO verify the conditional rendering exists in source code
- DO verify the feature flag gates the UI
- DO NOT add a step that tries to toggle the flag in the running prototype
- Mark the journey **FLAGGED** with note: "Conditional rendering verified via source code only — cannot visually verify disabled state in this prototype"
- This is NOT a PASS — the prototype cannot demonstrate this state. It needs human confirmation or a separate test environment.

**T1 Visual Evidence Rule (BLOCKING):**
For Tier 1 criteria, a PASS verdict requires AT LEAST ONE screenshot showing the feature working as described. Source-code-only verification for T1 criteria MUST produce FLAGGED, never PASS.

Extra exploration (checking adjacent pages, testing edge cases) goes in the `exploration[]` section, NOT in the journey steps. Journey steps are the minimum path to verify the AC.

Run the script:
```bash
node "${ARTIFACTS_DIR}/scripts/journey-test.mjs"
# equivalent: node .artifacts/<KEY>/eval/scripts/journey-test.mjs  (from UXD_PROJECT_ROOT only)
```

### Step 5: Screenshot capture rules

Capture at key moments only:
- New view reached (after navigation settles)
- Form/modal opened (initial empty state)
- Form filled (completed, before submission)
- Input submitted (before=sub-step `a`, after=sub-step `b`)
- Step failure (what user sees when broken)
- Verify steps (AFTER scrolling target into view)

**Naming:** `screenshots/journey-{N}-step-{M}.png`, exploration: `explore-{persona}-step-{N}.png`

**Scroll before verify:** Always scroll target element into viewport before screenshot.

**Deduplicate:** If same URL and same failure, reuse previous screenshot path with `"screenshot_reused": true`.

**Narrations for designers:** Describe what a reviewer SEES, not DOM internals.

**CRITICAL: Wait for CONTENT (not just containers) before capture.** The generated script MUST include these patterns:

```javascript
async function screenshotAfterRender(page, path, waitForSelector) {
  // Wait for the specific CONTENT this step is verifying — not just the container
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 8000 }).catch(() => null);
  }
  // Minimum settle time for SPA re-renders and data population
  await page.waitForTimeout(1500);
  await page.screenshot({ path, fullPage: false });
}
```

**Wait selector rules:**
- For tables: wait for `tbody tr` or a specific cell, NOT the table container (`#my-table` alone may render empty)
- For lists: wait for a list item (`ul li`, `.pf-v6-c-list__item`)
- For forms: wait for an input or label that renders after data loads
- For page navigation: wait for the primary content heading or data element

WRONG: `waitForSelector: '#model-deployments-table'` (table shell exists immediately, rows load later)
RIGHT: `waitForSelector: '#model-deployments-table tbody tr'` (waits for actual row data)
RIGHT: `waitForSelector: '[id^="kueue-status-"]'` (waits for specific feature elements)

If the table remains empty after 8s timeout, that IS the screenshot — it shows the feature isn't rendering, which may be a legitimate FAIL.

**CRITICAL: Detect duplicate screenshots.** The generated script MUST check for identical captures:

```javascript
import { createHash } from 'crypto';

const screenshotHashes = [];

async function captureAndValidate(page, filepath, waitFor) {
  await screenshotAfterRender(page, filepath, waitFor);
  const buffer = readFileSync(filepath);
  const hash = createHash('md5').update(buffer).digest('hex');
  
  if (screenshotHashes.length > 0 && screenshotHashes[screenshotHashes.length - 1] === hash) {
    console.warn(`WARNING: Screenshot ${filepath} is identical to previous — page may not have rendered new content`);
  }
  screenshotHashes.push(hash);
  return hash;
}
```

If ALL screenshots in a journey share the same hash, the journey verdict MUST be FAIL with rationale: "All screenshots identical — page content did not render between steps. Feature may not be functional."

If MORE THAN HALF of the screenshots in a journey share the same hash, the journey verdict MUST be FLAGGED with rationale: "Most screenshots identical — navigation did not meaningfully advance. Evidence quality is insufficient for confident PASS."

**Cross-journey uniqueness (x-ray mode):**

Even in x-ray mode where all journeys may visit the same route, each journey MUST produce at least one UNIQUE screenshot demonstrating the specific AC it tests. If two journeys both navigate to the same page, they must differ in at least one of:
- Scroll position (one shows top of table, other shows expanded row details)
- Filter/selection state (one shows all items, other shows filtered subset)
- Interaction state (one shows hover tooltip, other shows expanded accordion)
- Element focus (one screenshots a specific row, other screenshots the header)

Do NOT reuse screenshots across journeys with `screenshot_reused: true` unless the step is genuinely verifying the exact same visual element that a prior journey already captured. Convenience reuse (same page, different AC) produces misleading evidence.

**MANDATORY FINAL-STEP CAPTURE:**

Every journey function MUST end with a screenshot capture as the final line before returning. This captures the post-action state (the result of the last assertion). The generated script pattern:

```javascript
async function runJourney1(page) {
  // ... navigation and assertions ...
  // MANDATORY: final screenshot showing post-action state
  await captureAndValidate(page, 'screenshots/journey-1-step-N.png', null);
}
```

**Per-step screenshot uniqueness enforcement:**
- Each step `M` in journey `N` MUST write to `screenshots/journey-N-step-M.png` (matching its own indices).
- If a step's `screenshot` field in journey-log.json references a DIFFERENT step's file (e.g., step 4 points to `journey-1-step-3.png`), AND `"screenshot_reused": true` is NOT set on that step, the journey is INVALID and must be re-run with a corrected script.
- After running `journey-test.mjs`, validate: count screenshot files per journey matches step count. If mismatch, regenerate and re-run before writing journey-log.json.

### Step 6: Assign verdicts (EVERY AC must get exactly one verdict)

After all journeys complete, assign verdicts for EVERY AC in the CSV.

**T3 criteria (backend-only):** These are pre-assigned verdict=PASS at classify time with a note. Do not generate journey steps for T3 ACs — they have no UI surface to test.

**Journey verdict is determined by AC-critical steps only:**

A journey can have steps that directly verify the AC requirement AND extra steps (navigation niceties, project switching, exploration). The verdict is based ONLY on steps that test the actual criterion:

- If all AC-critical steps passed → journey **PASS** (even if a non-critical step like a project dropdown failed)
- If a non-AC step failed (navigation nicety, exploration) → journey **PASS with note** (the failure is logged but doesn't drag down the verdict)
- Only **FAIL** the journey if a step that directly tests the AC requirement failed

**AC verdict precedence:**

1. If the journey's AC-critical steps ALL passed → **PASS**
2. If any AC-critical step FAILED → **FAIL** (with rationale citing the failed step)
3. If NO journey tested this AC (coverage gap) → **FAIL** with rationale "No journey tested this criterion"

**Tier 3 split verdict rule (prototypes are NOT backends):**

These are PROTOTYPES — they demonstrate UI flows, not backend logic. Under the updated tier system, most ACs that mention backend concepts are classified as **T1** (because their observable effect is a UI change). True T3 ACs are backend-only with zero UI surface and are pre-assigned PASS at classify time.

If an AC was classified T1 despite mentioning backend concepts, evaluate it by its UI manifestation:
- If the UI demonstrates the feature (button exists, status renders, validation message shows): verdict = **PASS**
- If the UI portion is missing or broken: verdict = **FAIL**
- The backend portion is noted but irrelevant to the verdict — the prototype's job is to demonstrate UX

**NEVER FLAGGED for prototype limitations that have a UI demonstration.** These are PASS with notes:
- "updates within 5 seconds without page refresh" → PASS (UI re-renders from state; WebSocket is backend)
- "covers both InferenceService and LLMInferenceService" → PASS (UI handles the data model; mock data proves it)
- "validates inputs" → PASS if the form shows validation UI (backend enforcement is engineering)
- Real-time behavior, RBAC checks, API integrations → all PASS if the UI demonstrates the flow

Do NOT flag or fail ACs solely because their backend portion cannot be verified. The prototype's job is to demonstrate the UX, not implement the backend. Note backend requirements in the `human_action` column for engineering follow-up.

**Consolidated Verdict Policy (resolves all tier/mode conflicts):**

| Situation | Verdict | Rationale |
|---|---|---|
| UI feature exists and works visually (T1) | PASS | Screenshot proves it |
| UI feature missing or broken (T1) | FAIL | Screenshot shows absence |
| Needs external reference, ref unavailable (T2) | FLAGGED | Can't compare without ref |
| Backend-only requirement, no UI surface (T3) | PASS (pre-assigned) | Prototype demonstrates UX; backend is engineering |
| Subjective quality judgment (T4) | FLAGGED | Human call |
| Source code confirms feature but screenshot shows nothing | FAIL | Visual truth wins |
| Hardware API (mic, camera, etc.) | PASS (noted) | Code exists; hardware demo not possible in headless |

**Verdict rules:**
- Simulated/placeholder responses in prototypes = PASS (UI flow works)
- URL-fallback-reachable page = FAIL (page exists but is orphaned)
- Feature exists in source but unreachable via UI = FAIL
- DOM elements exist but are NOT visually rendered = FAIL (ghost elements)

**Every row in `evaluation-report.csv` Section 1 MUST have a non-empty `verdict` column after this step.** Verify by checking for empty verdict fields. If any AC has an empty verdict, the step is not done — assign a verdict before proceeding.

**BLOCKING CROSS-CHECK — Journey vs CSV Consistency:**

Before writing the CSV, verify that journey-log.json and CSV verdicts are consistent:
- If `journey-log.json` records a journey verdict as FAIL for an AC, the CSV verdict for that AC MUST also be FAIL (or FLAGGED).
- If you want to PASS an AC whose journey failed, you MUST have visual evidence (a screenshot showing the feature works). Source-code-only justification is NEVER sufficient for T1 criteria.
- If identical screenshots exist across all steps of a journey (same visual state), that journey cannot provide PASS evidence — the feature was not demonstrated visually.

Update `evaluation-report.csv` Section 1 with verdicts, rationale, evidence, fix_action, fix_file.

**MANDATORY AUTOMATED VALIDATION — run AFTER writing CSV:**

```bash
node ${CLAUDE_SKILL_DIR}/scripts/validate-verdicts.js .artifacts/<KEY>/eval/
```

If this script exits with code 1 (violations found), you MUST fix the CSV before proceeding to Step 7. For each violation:
- If the journey FAIL was legitimate (feature not demonstrated visually), change CSV verdict to FAIL or FLAGGED.
- If the journey FAIL was a locator/timing issue but the feature IS visible in screenshots, keep CSV as PASS and update the journey-log.json entry to reflect the corrected verdict with rationale.

### Step 7: Write journey-log.json

The output MUST match this exact schema. `render-report.js` reads these specific field names — any deviation produces a broken report with missing screenshots, empty journey sections, and no scores.

```json
{
  "depth": "deep",
  "prototype_url": "http://localhost:9000",
  "evaluated_at": "2026-06-25T14:30:00Z",
  "journeys": [
    {
      "id": "journey-1",
      "title": "View Kueue Scheduling Status on Model Deployments",
      "persona": "Platform Operator",
      "source": "Inferred from AC-1: Given Kueue is enabled...",
      "ac_ids": ["AC-1", "AC-4"],
      "verdict": "PASS",
      "steps_expected": 4,
      "steps_completed": 3,
      "steps": [
        {
          "step": 1,
          "action": "navigate",
          "target": "AI Hub > Models > Deployments",
          "result": "success",
          "timestamp_ms": 0,
          "screenshot": "screenshots/journey-1-step-1.png",
          "narration": "Navigated to Model Deployments overview. Table shows 6 rows with Kueue status labels."
        },
        {
          "step": 2,
          "action": "verify",
          "target": "Kueue scheduling status labels",
          "result": "success",
          "timestamp_ms": 2100,
          "screenshot": "screenshots/journey-1-step-2.png",
          "narration": "Found 6 Kueue status labels: Admitted, Pending, Running, Suspended, Scaling. Color-coded per state."
        }
      ]
    }
  ],
  "exploration": []
}
```

#### CRITICAL FORMAT RULES (render-report.js will break without these)

- `journey.id` MUST be `"journey-N"` format (not "J1", not "journey_1", not "j-1")
- `journey.steps_completed` and `journey.steps_expected` MUST be present (integers)
- `journey.source` MUST be present (string referencing the AC or user story)
- Every step MUST have ALL of: `step` (number), `action`, `target`, `result` ("success" or "fail"), `screenshot`, `narration`
- `screenshot` paths MUST be `"screenshots/journey-N-step-M.png"` format exactly
- `narration` MUST be designer-readable (what a reviewer sees, not DOM internals)
- `result` MUST be exactly `"success"` or `"fail"` (not "ok", not "pass", not "PASS")
- Screenshot files MUST exist at the referenced paths in `.artifacts/<KEY>/eval/screenshots/`

**If any field is missing, the report will render with blank sections, no embedded images, and broken path comparison tables.**

### Step 7b: Verify AC Coverage (BLOCKING)

After writing journey-log.json, verify every AC has been tested:

1. Read `extract-state.json > ac_list` — get all `criterion_id` values
2. Read `journey-log.json > journeys[].ac_ids` — collect all tested AC IDs (flatten across all journeys)
3. Compute: `untested_acs = ac_list_ids - tested_ac_ids`

**If `untested_acs` is not empty:**
- For each untested AC, check its tier from the CSV:
  - **T1 untested:** assign verdict FAIL with rationale "No journey tested this criterion -- coverage gap"
  - **T3 untested:** should already have PASS from classify (pre-assigned). If not, assign PASS with note "Backend-only, no UI journey applicable"
  - **T4 untested:** assign verdict FLAGGED with rationale "Subjective criterion -- needs human judgment, no automated journey applicable"
- Log a WARNING: `"AC coverage incomplete: {untested_acs} had no journey"`
- Update `evaluation-report.csv` with these verdicts

**This step is BLOCKING** — do not proceed to eval-usability until every AC in the CSV has a non-empty verdict.

### Step 8: Generate refinement suggestions for FAILs

For each FAIL verdict, write an entry to `.artifacts/<KEY>/eval/refinement-suggestions.json`:

```json
{
  "type": "ac_failure",
  "criterion_id": "AC-3",
  "criterion_text": "<verbatim AC>",
  "verdict": "FAIL",
  "rationale": "<why it failed>",
  "fix_action": "<suggested fix>",
  "fix_file": "<likely file to change>",
  "confidence": "high"
}
```

## Rules

- NEVER use `page.goto` as a silent fallback that marks a step PASS
- Every navigation must happen via visible UI elements (click-first)
- If ALL journeys fail at step 1 (entry point unreachable), report "prototype unreachable" and exit
- Use `domcontentloaded` + explicit waits for SPAs (not `networkidle`)
- Modals/drawers are valid parts of a flow — continue the journey within them
- Post-action waits before screenshots (500ms minimum after state changes)
- Scroll chat containers to bottom before chat screenshots

### CRITICAL: Verify VISUAL presence, not just DOM presence

**NEVER use `locator.count() > 0` alone as proof that a feature works.** Elements can exist in the DOM but be visually invisible (zero height, overflow hidden, collapsed parent, CSS display issues). The screenshot is what the USER sees — if the screenshot shows an empty table but DOM has rows, that is a FAIL.

For every verify step, the generated script MUST check BOTH:

```javascript
const elements = page.locator('tbody tr');
const domCount = await elements.count();
const firstVisible = domCount > 0 && await elements.first().isVisible().catch(() => false);

// ONLY pass if elements are both present AND visible
const result = (domCount > 0 && firstVisible) ? 'success' : 'fail';
const narration = !firstVisible && domCount > 0
  ? `Found ${domCount} elements in DOM but they are NOT visually rendered — possible CSS/rendering issue`
  : firstVisible
    ? `Found ${domCount} visible elements`
    : 'No elements found';
```

This prevents the "ghost elements" problem where Playwright reports success but the screenshot shows an empty page. The verdict must match what the screenshot shows — if a human looking at the screenshot would say "I don't see it," the verdict is FAIL regardless of DOM state.

### NEVER use page.evaluate() or .textContent() as proof of visibility

`page.evaluate(() => document.querySelector(...).textContent)` reads text from INVISIBLE elements. PatternFly's `<Tr isExpanded={false}>` renders rows with zero height — they have text content in the DOM but are invisible to users.

**Banned patterns:**
```javascript
// BAD — reads invisible DOM text
const text = await page.evaluate(() => document.querySelector('td').textContent);
if (text) result = 'success'; // WRONG — element may be invisible

// BAD — counts elements without visibility check
const count = await page.locator('tr').count();
if (count > 0) result = 'success'; // WRONG — rows may have zero height
```

**Required pattern:**
```javascript
// GOOD — Playwright's isVisible() checks computed CSS
const row = page.locator('tbody tr').first();
const visible = await row.isVisible().catch(() => false);
if (visible) {
  const text = await row.textContent(); // Safe — element IS visible
  result = 'success';
}
```

The generated script MUST use Playwright's `.isVisible()` before treating any element as present. If the script uses `page.evaluate()` for verification, it MUST also confirm visibility with Playwright's API.

### Locator Strategy Hierarchy

When selecting elements for interaction or verification, prefer strategies higher in this list. Use lower strategies ONLY when those above are unavailable in the page:

1. **data-testid attribute:** `page.locator('[data-testid="deploy-agent-btn"]')`
2. **Role + accessible name:** `page.getByRole('button', { name: 'Deploy agent' })`
3. **Row-scoped selector:** `page.locator('tr').filter({ hasText: 'my-agent' }).locator('button')`
4. **Text content:** `page.getByText('Deploy agent', { exact: true })`
5. **CSS class (PF-prefixed):** `page.locator('.pf-v6-c-button.pf-m-primary')`
6. **Element ID (LAST RESORT):** `page.locator('#deploy-btn')`

**Table/list-specific rule:** When verifying content in a table or list, ALWAYS scope to the target row first. NEVER use bare ID selectors for elements that appear in repeated rows.

```javascript
// WRONG — ID may repeat across rows or match wrong row
const status = page.locator('#agent-status');

// RIGHT — scope to the specific row first
const row = page.locator('tr').filter({ hasText: 'my-agent-name' });
const status = row.locator('[data-label="Status"]');
```

**Locator retry on timeout:** If a locator times out (30s), try the next strategy in the hierarchy before failing the step. Log the fallback as `"locator_fallback": true` in the journey step metadata.
