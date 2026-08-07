# eval-journey

Executes Playwright walkthroughs for each journey defined by eval-extract. Operates in **x-ray mode** (Phase A only) — full workspace source access for fast AC verification. Persona-driven usability walkthroughs are handled separately by `eval-usability` (Phase B).

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `.artifacts/<KEY>/eval/extract-state.json` | Journey definitions, persona selection, AC list | Yes |
| `.artifacts/<KEY>/eval/evaluation-report.csv` | Tier-classified ACs from eval-classify (Section 1 with tiers, no verdicts) | Yes |
| `.artifacts/<KEY>/eval/navigation-hints.json` | Routes and nav hierarchy from eval-hint | No |
| `.artifacts/<KEY>/eval/mr-delta.json` | Changed files (for nav gap detection, URL fallback hints) | No |
| Prototype URL | Live URL to test against (e.g., `http://localhost:4200`) | Yes |
| `--rerun-only` | Comma-separated AC IDs — only run journeys testing these ACs | No |
| `--capture-only` | Re-capture screenshots without changing verdicts | No |
| `--all-journeys` | Run all journeys (not just rerun set) | No |
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

### X-Ray AC Validation (Phase A)

The x-ray evaluator has full workspace access and uses it for speed. The goal is to verify acceptance criteria as fast as possible, not to test discoverability.

- Read workspace source files directly for selectors, routes, and page structure
- Use `page.goto` freely for navigation (speed over realism)
- Use CSS selectors from source code to locate elements
- No persona simulation, no exploration phase
- Screenshots are evidence of PASS/FAIL only
- Produces: verdicts, refinement-suggestions, screenshots

Navigation strategy:
```javascript
async function navigateInformed(page, route, selector) {
  await page.goto(`${baseUrl}${route}`);
  await page.waitForLoadState('domcontentloaded');
  if (selector) {
    await page.waitForSelector(selector, { timeout: 5000 }).catch(() => null);
  }
  await page.waitForTimeout(1000);
}
```

**Visual truth overrides source analysis** — see [`references/verdict-policy.md`](../verdict-policy.md) for the full rule. Source code analysis can NEVER upgrade a visual FAIL to PASS.

Hint fallback logic (Steps 3/3b) is unnecessary in x-ray mode — read source directly. Go straight to Step 4 with x-ray navigation.

---

### Step 1: Setup Playwright

Playwright is installed during prerequisite setup (see SKILL.md). Ensure `${ARTIFACTS_DIR}/scripts` and `${ARTIFACTS_DIR}/screenshots` directories exist.

**Read and follow [`references/playwright-rules.md`](../playwright-rules.md)** for browser selection, viewport, project seeding, screenshot timing, blank detection, hidden row detection, and locator strategy. Those rules apply to all generated scripts in this phase.

### Step 2: Prepare screenshots directory and capture baseline

```bash
rm -rf "${ARTIFACTS_DIR}/screenshots"
mkdir -p "${ARTIFACTS_DIR}/screenshots"
```

On re-iterations with `--rerun-only`, only clear screenshots for re-run journeys (preserve PASS journey screenshots).

**Baseline screenshot (before any evaluation or fixes):** On iteration 1 only, navigate to the **primary page being tested** (not the homepage) and capture a screenshot as the "before" state.

Determine the primary page from `extract-state.json > journey_definitions` — find the route most journeys target:

```javascript
const journeys = extractState.journey_definitions || [];
const firstSteps = journeys.map(j => (j.expected_path || [])[0]).filter(Boolean);
const primaryRoute = componentMap ? componentMap.target_page : inferPrimaryRoute(firstSteps);

// PAIRED with eval-usability Step 7b (baseline-after.png).
// Both captures MUST use identical addInitScript setup.
const context = await browser.newContext({ viewport: { width: 1920, height: 900 } });
const page = await context.newPage();
await page.addInitScript(() => {
  try { localStorage.setItem('selectedProject', JSON.stringify('All projects')); } catch {}
});
await page.goto(`${baseUrl}${primaryRoute || ''}`);
await page.waitForSelector('tbody tr', { timeout: 8000 }).catch(() => null);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${ARTIFACTS_DIR}/screenshots/baseline-before.png`, fullPage: false });
await context.close();
```

### Step 2b: Source pre-scan — write component-map.json

**Before generating any Playwright script**, read the target component files from `mr-delta.json` and write a structured JSON file that the script generator MUST reference.

**Source resolution:** Use the workspace if provided. Otherwise read `source_dir` from `eval-state.yaml` (set by `pipeline-setup.sh` when an MR clone is available in hybrid mode). If `source_available=true` in eval-state, source files are readable even for remote prototypes.

```bash
# Resolve source directory (same as eval-hint Step 0)
if [ -n "${WORKSPACE}" ] && [ -d "${WORKSPACE}" ]; then
  SOURCE="${WORKSPACE}"
elif [ -f "${ARTIFACTS_DIR}/eval-state.yaml" ]; then
  SOURCE=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py get ${ARTIFACTS_DIR}/eval-state.yaml source_dir)
fi
```

Read source files (`modified_files` and `new_files` from `mr-delta.json`) and extract:

- **target_page**: The route where the feature lives
- **table_columns**: Actual `<Th>` labels or column config array values in order
- **ac_column_mapping**: For each AC, which column it actually maps to (AC text may say "Status column" but the feature is in a different column)
- **interactive_elements**: Tooltips (`<Tooltip content=`), expandable rows (`<Tr isExpanded`), popovers, modals — with the component that wraps them
- **feature_flags**: Conditional rendering gates and what they show/hide
- **status_values**: Actual string values that appear as labels (from mock data or enums)

Write to `${ARTIFACTS_DIR}/component-map.json`:

```json
{
  "target_page": "/page/route",
  "table_columns": ["Column A", "Column B", "..."],
  "ac_column_mapping": {
    "AC-1": { "column": "Column B", "index": 1, "reason": "..." }
  },
  "feature_flags": {},
  "status_values": [],
  "interactive_elements": {
    "tooltips": [],
    "expandable_rows": []
  }
}
```

**The Playwright script generator in Step 3 MUST read `component-map.json` and use its data for:**
- Column indices (never guess from AC text — use `ac_column_mapping`)
- Interaction types (hover vs click — use `interactive_elements`)
- Expected values (use `status_values` to know what to look for)
- Target page route (use `target_page` for navigation)

**Refresh rule:** Step 2b re-runs unconditionally when `--capture-only` is set (FINAL-STATE CAPTURE pass). On normal iterations, Step 2b only runs if `component-map.json` does not exist.

**Validation:** If `component-map.json` does not exist when Step 3 starts, STOP and go back to Step 2b. Do not generate a script without a component map.

### Step 3: Generate and run Playwright script

**Step 3a: Run the deterministic generator:**

```bash
node ${CLAUDE_SKILL_DIR}/scripts/generate-journey-script.js ${ARTIFACTS_DIR}/ --mode=verify
```

This produces `${ARTIFACTS_DIR}/journey-test.mjs` with ~80% of code filled in mechanically from `component-map.json` and `extract-state.json`. The script uses a content-based cache hash — if inputs haven't changed since last run, it skips regeneration.

**Step 3b: Fill LLM_FILL blocks.** Read the generated `journey-test.mjs` and complete any `// LLM_FILL:` comment blocks. These are the ~20% that require judgment. Do NOT modify mechanical sections (marked "do not edit").

**Viewport validation:** After generation, verify the script contains `viewport` before running:
```bash
grep -q "viewport" ${ARTIFACTS_DIR}/journey-test.mjs || { echo "FATAL: Generated script missing viewport. Regenerate."; exit 1; }
```

### Step 4: Load navigation hints as FALLBACK (the "colleague" pattern)

If `.artifacts/<KEY>/eval/navigation-hints.json` exists (produced by eval-hint), it is available as a **fallback safety net** — NOT pre-loaded knowledge.

**How hints work (try discovery first, consult only when stuck):**

The generated Playwright script navigates using ONLY visible UI elements first. Hints are consulted ONLY after an unassisted attempt fails:

1. **First attempt:** Navigate using click-first (visible buttons, links, expandable sections found by brute-force)
2. **If stuck (timeout after 5s):** Consult `navigation-hints.json` for a targeted hint
3. **Mark the step as `navigate-assisted`:** The navigation succeeded but only with help
4. **Usability impact:** Assisted steps cap dimension scores at 1 for affected dimensions

**What each hint type provides as fallback:**

- **`nav_sections`:** ONLY used after brute-force expansion fails. If the script tried all visible nav buttons and still can't find the target, THEN use the hint to expand the specific parent. Log: `"navigate-assisted: hint revealed target in 'Gen AI studio' section"`
- **`routes`:** Used as diagnostic `page.goto` ONLY after click-first fails completely. Distinguishes "orphaned page" from "doesn't exist." NEVER marks a step PASS.

**If `navigation-hints.json` does not exist**, the script works with brute-force only (slower but honest).

**The key principle:** A persona who needs a hint to find something is revealing a discoverability problem. The hint prevents the walkthrough from being totally blocked while preserving the signal that "a real user would struggle here."

### Step 4b: Journey skip check (when `--rerun-only` set)

For each journey, check if ANY of its `ac_ids` are in `--rerun-only`. If none are, skip the journey — carry forward its previous `journey-log.json` entry and screenshots.

### Step 5: Run Playwright script

Run the generated `.artifacts/<KEY>/eval/scripts/journey-test.mjs` (from Step 3). The script has two phases in a single browser session.

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

#### Verdict Assignment

**Read [`references/verdict-policy.md`](../verdict-policy.md)** for FAIL vs FLAGGED rules, the consolidated verdict table, T3 split verdict rule, default-state AC handling, and visual truth override.

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

#### Visual Differentiation Rule (MANDATORY)

**Each journey MUST produce a screenshot showing a UNIQUE visual state.** Never screenshot the same default table view for multiple journeys. Before capturing the final screenshot, each journey must perform at least one interaction that visibly changes the page:

| AC type | Required interaction before screenshot |
|---|---|
| Feature visibility (columns, labels) | Default table view is acceptable for ONE journey only |
| Tooltip content ("hover over X") | `page.hover()` → screenshot WITH tooltip visible on screen |
| Expandable row ("details", "resource info") | Click expand toggle → screenshot showing expanded content |
| Feature absence ("when disabled", "no indicators") | Source verification → FLAGGED (can't toggle in prototype) |
| Error absence ("no errors", "graceful degradation") | Check DOM for errors → screenshot (can share default view if no errors) |
| Unmanaged/alternative state | Scroll to or highlight the specific row showing different state |
| Multiple resource types | Expand a row showing the specific type, or navigate to a detail view |

**Highlight technique:** When verifying a specific row or element on a shared page view, add a CSS outline before screenshotting so the image is visually distinct:

```javascript
await targetRow.evaluate(el => el.style.outline = '3px solid #0066cc');
await page.screenshot({ path: screenshotPath });
await targetRow.evaluate(el => el.style.outline = '');
```

**Enforcement:** After generating the script, verify that no two journey functions produce screenshots at the same page state. If journeys 1, 3, and 4 all just navigate to the same page and screenshot the same table, the script is INVALID — add interactions (hover, expand, scroll, or CSS highlights) to differentiate them.

**POST-GENERATION VALIDATION:** After generating `journey-test.mjs`, scan the script
for screenshot calls. If all `screenshot()` calls share the same page state (no
`hoverElement`, `expandRow`, `navigateTo`, `click`, or `scrollIntoView` between
baseline and any journey screenshot), the script will produce identical screenshots.
Regenerate with actual interactions.

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

**Viewport validation:** After generating `journey-test.mjs`, verify the script contains `viewport` before running it:
```bash
grep -q "viewport" "${ARTIFACTS_DIR}/scripts/journey-test.mjs" || { echo "FATAL: Generated script missing viewport. Regenerate."; exit 1; }
```

Run the script:
```bash
node "${ARTIFACTS_DIR}/scripts/journey-test.mjs"
# equivalent: node .artifacts/<KEY>/eval/scripts/journey-test.mjs  (from UXD_PROJECT_ROOT only)
```

### Step 6: Screenshot capture

**Read and follow [`references/playwright-rules.md`](../playwright-rules.md)** — it covers screenshot timing, wait selectors, blank detection, duplicate detection, cross-journey uniqueness, final-step capture, and per-step naming conventions.

Phase A naming convention: `screenshots/journey-{N}-step-{M}.png`, exploration: `explore-{persona}-step-{N}.png`.

### Step 7: Assign verdicts (EVERY AC must get exactly one verdict)

After all journeys complete, assign verdicts for EVERY AC in the CSV. **Read [`references/verdict-policy.md`](../verdict-policy.md)** for the full verdict determination flow, tier rules, default-state AC handling, and cross-check requirements.

**CRITICAL: The CSV is the source of truth for the report.** The report renders verdicts from the CSV, not the journey-log. If the CSV says FAIL but journey-log says PASS, the report shows FAIL.

**T3 criteria (backend-only):** These are pre-assigned verdict=PASS at classify time with a note. Do not generate journey steps for T3 ACs — they have no UI surface to test.

Update `evaluation-report.csv` Section 1 with verdicts, rationale, evidence, fix_action, fix_file.

**MANDATORY AUTOMATED VALIDATION — run AFTER writing CSV:**

```bash
node ${CLAUDE_SKILL_DIR}/scripts/validate-verdicts.js .artifacts/<KEY>/eval/
```

If this script exits with code 1 (violations found), fix the CSV before proceeding. For each violation:
- If the journey FAIL was legitimate (feature not demonstrated visually), change CSV verdict to FAIL or FLAGGED
- If the journey FAIL was a locator/timing issue but the feature IS visible in screenshots, keep CSV as PASS and update the journey-log.json entry to reflect the corrected verdict with rationale

### Step 8: Write journey-log.json

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

### Step 8b: Verify AC Coverage (BLOCKING)

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

### Step 9: Generate refinement suggestions for FAILs

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
- If ALL journeys fail at step 1 (entry point unreachable), report "prototype unreachable" and exit
- See [`references/playwright-rules.md`](../playwright-rules.md) for visual presence verification, banned patterns, and locator strategy hierarchy
