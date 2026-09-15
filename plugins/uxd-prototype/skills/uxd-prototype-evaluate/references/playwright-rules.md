# Playwright Rules

Shared rules for all Playwright script generation across eval-journey (Phase A) and eval-usability (Phase B). Both phases reference this file — follow these rules whenever generating or modifying `.mjs` walkthrough scripts.

## Local Server — SPA Fallback Mode

When serving a built `dist/` directory locally for evaluation, **always use SPA fallback mode** so client-side routes resolve to `index.html` instead of returning 404:

```bash
# CORRECT — SPA routes like /ai-hub/models/deployments fall back to index.html
npx sirv dist --port 3333 --single

# WRONG — returns blank 404 for any route without a matching file on disk
npx sirv dist --port 3333
```

**Automated:** `scripts/resolve-prototype-url.sh` handles SPA detection and `--single` automatically during pipeline setup. If you are writing a manual/ad-hoc Playwright script outside the pipeline, apply these rules yourself.

**Detection rule:** If `dist/index.html` contains a `<base href` tag, any `<script>` tags with absolute paths (`/vendor.js`), or a `<div id="root">` mount point, the prototype is an SPA and requires `--single`.

Equivalent flags for other static servers:
- `npx serve dist -s -l 3333` (`-s` = single-page)
- `npx http-server dist -P http://localhost:3333? --port 3333` (`-P` = proxy unresolved to index)

**If the prototype already has a dev server** (webpack-dev-server, vite, next dev), use that instead — they handle SPA routing natively.

## Browser and Viewport

Use Chromium (headless). Firefox caused blank screenshots in 3/4 pipeline runs due to PatternFly CSS rendering failures in headless mode.

```javascript
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
// 1920x900 viewport. Default 800x600 truncates table columns.
// 1440 is insufficient for tables with 10+ columns.
const context = await browser.newContext({ viewport: { width: 1920, height: 900 } });
const page = await context.newPage();
```

**Viewport validation:** After generating any `.mjs` script, verify before running:

```bash
grep -q "viewport" ${ARTIFACTS_DIR}/scripts/<script>.mjs || { echo "FATAL: Generated script missing viewport. Regenerate."; exit 1; }
```

## Project and Feature Flag Seeding

Many prototypes default to a project with no mock data. Pre-seed feature flags in localStorage BEFORE React mounts via `page.addInitScript()` on EVERY new page, BEFORE `page.goto()`.

**WARNING:** Do NOT set `selectedProject` in localStorage for persona walkthroughs — it can force the app into an empty "All projects" view that hides project cards. Instead, let the homepage render naturally and navigate via button clicks.

```javascript
// Phase A (journey tests) — OK to pre-seed project context
await page.addInitScript(() => {
  try { localStorage.setItem('selectedProject', JSON.stringify('All projects')); } catch {}
  try {
    const flags = JSON.parse(localStorage.getItem('featureFlags') || '{}');
    flags._lastModified = new Date().toISOString();
    localStorage.setItem('featureFlags', JSON.stringify(flags));
  } catch {}
});

// Phase B (persona walkthroughs) — do NOT set selectedProject
await page.addInitScript(() => {
  try { localStorage.removeItem('selectedProject'); } catch {}
});
```

When `addInitScript` is already in place, do NOT call `ensureAllProjects()` before screenshots — it opens the project dropdown which covers the data rows. Only call `ensureAllProjects()` as a diagnostic fallback if `tbody` has 0 rows despite `addInitScript`.

**Validation:** After generating any script, verify:

```bash
grep -q "addInitScript" ${ARTIFACTS_DIR}/scripts/<script>.mjs || { echo "FATAL: Missing addInitScript project seed. Regenerate."; exit 1; }
```

## Screenshot Timing

Wait for CONTENT (not just containers) before capture. The generated script must include:

```javascript
async function screenshotAfterRender(page, path, waitForSelector) {
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 8000 }).catch(() => null);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path, fullPage: false });
}
```

**Wait selector rules:**

- For tables: wait for `tbody tr` or a specific cell, NOT the table container alone
- For lists: wait for a list item (`ul li`, `.pf-v6-c-list__item`)
- For forms: wait for an input or label that renders after data loads
- For page navigation: wait for the primary content heading or data element

```
WRONG: waitForSelector: '#model-deployments-table'     (table shell exists immediately, rows load later)
RIGHT: waitForSelector: '#model-deployments-table tbody tr'  (waits for actual row data)
RIGHT: waitForSelector: '[id^="kueue-status-"]'              (waits for specific feature elements)
```

If the table remains empty after 8s timeout, that IS the screenshot — it shows the feature isn't rendering, which may be a legitimate FAIL.

**After `page.goto`:** wait for `networkidle` or a content selector (NOT just `domcontentloaded`).
**After navigation click:** wait for a DATA element to appear (table row, list item, form field with value).
**Minimum 1500ms settle time** after any selector wait (React re-renders, CSS transitions).

## Blank Screenshot Detection

After each screenshot, check file size. Images under 10 KB are likely blank (rendering not yet complete):

1. Wait 2 seconds and retry once (the page may still be loading)
2. If still blank after retry, check if server is running with SPA fallback (`--single` flag) — this is the most common cause of all-white screenshots
3. If SPA mode is confirmed, log a warning and continue — base the verdict on DOM state (selectors, `getBoundingClientRect`), not screenshot appearance

## Duplicate Screenshot Detection

The generated script must check for identical captures:

```javascript
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

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

**Verdict impact of duplicates:**

- ALL screenshots in a journey share the same hash: verdict = FAIL ("All screenshots identical — page content did not render between steps")
- MORE THAN HALF share the same hash: verdict = FLAGGED ("Most screenshots identical — evidence quality insufficient for confident PASS")

## Visual Presence Verification

NEVER use `locator.count() > 0` alone as proof that a feature works. Elements can exist in the DOM but be visually invisible (zero height, overflow hidden, collapsed parent).

```javascript
const elements = page.locator('tbody tr');
const domCount = await elements.count();
const firstVisible = domCount > 0 && await elements.first().isVisible().catch(() => false);

const result = (domCount > 0 && firstVisible) ? 'success' : 'fail';
const narration = !firstVisible && domCount > 0
  ? `Found ${domCount} elements in DOM but they are NOT visually rendered — possible CSS/rendering issue`
  : firstVisible
    ? `Found ${domCount} visible elements`
    : 'No elements found';
```

### Banned Patterns

```javascript
// BAD — reads invisible DOM text
const text = await page.evaluate(() => document.querySelector('td').textContent);
if (text) result = 'success'; // WRONG — element may be invisible

// BAD — counts elements without visibility check
const count = await page.locator('tr').count();
if (count > 0) result = 'success'; // WRONG — rows may have zero height
```

### Required Pattern

```javascript
// GOOD — Playwright's isVisible() checks computed CSS
const row = page.locator('tbody tr').first();
const visible = await row.isVisible().catch(() => false);
if (visible) {
  const text = await row.textContent();
  result = 'success';
}
```

## Hidden Row Detection (PatternFly)

PatternFly's `Tr` component treats any explicit `isExpanded` value (including `false`) as its own visibility control, rendering rows with `hidden=""`. Before reporting AC failures for missing table data, check whether rows exist in the DOM but have zero bounding rect (`getBoundingClientRect().height === 0`). If so, report ONE root cause ("N rows exist but are hidden by isExpanded={false}") instead of separate per-AC failures.

## Locator Strategy Hierarchy

Prefer strategies higher in this list. Use lower strategies ONLY when those above are unavailable:

1. **data-testid attribute:** `page.locator('[data-testid="deploy-agent-btn"]')`
2. **Role + accessible name:** `page.getByRole('button', { name: 'Deploy agent' })`
3. **Row-scoped selector:** `page.locator('tr').filter({ hasText: 'my-agent' }).locator('button')`
4. **Text content:** `page.getByText('Deploy agent', { exact: true })`
5. **CSS class (PF-prefixed):** `page.locator('.pf-v6-c-button.pf-m-primary')`
6. **Element ID (LAST RESORT):** `page.locator('#deploy-btn')`

## PatternFly Navigation — Card Titles and Tabs

**Critical:** PatternFly v6 renders project/card titles as `<button>` elements (`pf-v6-c-button pf-m-link pf-m-inline`), NOT as `<a>` links. Tab navigation also uses `<button>` elements.

```javascript
// WRONG — will match a parent card wrapper div, clicking it doesn't navigate
const card = page.locator('a, button, [class*="card"]').filter({ hasText: /Project/ }).first();

// WRONG — no <a> elements exist for PF card titles
const link = page.locator('a').filter({ hasText: /Project/ }).first();

// RIGHT — targets the actual clickable PF button
const card = page.locator('button').filter({ hasText: /Project/ }).first();
```

**Why `[class*="card"]` is dangerous:** The PatternFly card structure nests like:
```html
<div class="pf-v6-c-card">        ← matches [class*="card"], has "Project" in descendant text
  <h4 class="pf-v6-c-title">
    <button class="pf-v6-c-button pf-m-link">  ← the actual click target
      <span>Project Name</span>
    </button>
  </h4>
</div>
```

`.first()` on `a, button, [class*="card"]` returns the outermost matching element (the `<div>`) because it appears first in DOM order. Clicking the wrapper div does NOT trigger the button's React event handler.

**Navigation pattern for PF prototypes:**
```javascript
async function navigateToFeaturePage(page, projectName, tabName) {
  // 1. Wait for cards to render
  await page.waitForSelector('[class*="card"]', { timeout: 10000 }).catch(() => null);
  
  // 2. Click project button (NOT card wrapper)
  const projectBtn = page.locator('button').filter({ hasText: new RegExp(projectName) }).first();
  if (await projectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await projectBtn.click();
    await page.waitForLoadState('networkidle').catch(() => null);
    await page.waitForTimeout(3000);
  }
  
  // 3. Click tab button
  const tab = page.locator('button').filter({ hasText: new RegExp(tabName) }).first();
  if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(3000);
  }
  
  // 4. Verify content loaded
  await page.waitForSelector('tbody tr', { timeout: 10000 }).catch(() => null);
}
```

**Table/list-specific rule:** Always scope to the target row first. Never use bare ID selectors for elements in repeated rows.

```javascript
// WRONG — ID may repeat across rows or match wrong row
const status = page.locator('#agent-status');

// RIGHT — scope to the specific row first
const row = page.locator('tr').filter({ hasText: 'my-agent-name' });
const status = row.locator('[data-label="Status"]');
```

**Locator retry on timeout:** If a locator times out (30s), try the next strategy in the hierarchy before failing the step. Log the fallback as `"locator_fallback": true` in the journey step metadata.

## Screenshot Naming

| Phase | Pattern | Example |
|-------|---------|---------|
| Phase A journey | `screenshots/journey-{N}-step-{M}.png` | `journey-1-step-2.png` |
| Phase A exploration | `screenshots/explore-{persona}-step-{N}.png` | `explore-admin-step-1.png` |
| Phase A baseline | `screenshots/baseline-before.png`, `baseline-after.png` | — |
| Phase B persona (full) | `screenshots/persona-{id}-task-{N}-step-{M}.png` | `persona-data-scientist+junior-task-1-step-3.png` |
| Phase B persona (key-only) | `screenshots/persona-{id}-task-{N}-final.png` | `persona-data-scientist+junior-task-2-final.png` |

## General Rules

- Every navigation must happen via visible UI elements (click-first)
- Use `domcontentloaded` + explicit waits for SPAs (not `networkidle` alone)
- Modals/drawers are valid parts of a flow — continue the journey within them
- Post-action waits before screenshots (500ms minimum after state changes)
- Scroll chat containers to bottom before chat screenshots
- Scroll target element into viewport before verify screenshots
- Narrations for designers: describe what a reviewer SEES, not DOM internals

## Prototype Source Types and Navigation Strategy

Two distinct scenarios determine how Playwright scripts navigate:

### Scenario 1: Remote Hosted Prototype (GitLab Pages, Vercel, etc.)

The prototype is live at a URL. We may have an MR/PR link for code context, but the primary interaction target is the remote URL.

**Characteristics:**
- Live URL (e.g., `https://pages.example.com/mr-42/`)
- May serve from a path prefix (e.g., `/mr-174/`)
- We cannot modify the build or add `data-testid` attributes
- Navigation must use heuristic locators based on visible UI

**Navigation strategy — Heuristic (button-click-first):**

```javascript
async function navigateToFeaturePage(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(3000);

  // Wait for initial content to render
  await page.waitForSelector('[class*="card"], [class*="project"], nav a', { timeout: 10000 }).catch(() => null);

  // 1. Try expanding sidebar nav sections (PF uses <button> with aria-expanded)
  const navButtons = page.locator('nav button');
  for (let i = 0; i < await navButtons.count(); i++) {
    const btn = navButtons.nth(i);
    const text = await btn.textContent().catch(() => '');
    if (/AI hub|Develop|Model|Gen AI/i.test(text)) {
      if (await btn.getAttribute('aria-expanded') === 'false') {
        await btn.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // 2. Click feature link in sidebar (if feature is a top-level nav item)
  const featureLink = page.locator('nav a, nav button').filter({ hasText: /Feature Name/ }).first();
  if (await featureLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await featureLink.click();
    await page.waitForTimeout(3000);
    return;
  }

  // 3. Click project card (PF cards use <button>, NOT <a>)
  const projectBtn = page.locator('button').filter({ hasText: /Project Name/ }).first();
  if (await projectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await projectBtn.click();
    await page.waitForLoadState('networkidle').catch(() => null);
    await page.waitForTimeout(3000);

    // 4. Click tab inside project
    const tab = page.locator('button').filter({ hasText: /Tab Name/ }).first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(3000);
    }
  }

  await page.waitForSelector('tbody tr', { timeout: 10000 }).catch(() => null);
}
```

**NEVER use direct `page.goto(BASE_URL + '/route')` for remote SPAs** — the SPA router may not handle path-prefixed routes correctly. Always navigate through visible UI clicks.

**When MR link is available:** Read the MR source (routes file, component files) to understand the app structure. Use this knowledge to improve locator text (exact button labels, exact tab names) but still navigate via clicks, not URL manipulation.

### Scenario 2: Local Project Prototype (Source Code Available)

The prototype source code is in the workspace. We can read routes, components, and generate precise scripts.

**Characteristics:**
- Source code visible at a workspace path
- Can read React Router config, component files, navigation structure
- Can identify exact route paths, `data-testid` attributes, component hierarchies
- Served locally via `sirv` (SPA or static mode)

**Navigation strategy — Source-Informed (precise selectors + direct routes):**

```javascript
// When serving locally, direct route navigation works (no path-prefix issues)
async function navigateToFeaturePage(page, baseUrl) {
  // Read routes from source: src/routes.tsx or app/router.ts
  // Route: /projects/:projectId/deployments
  await page.goto(`${baseUrl}/projects/fraud-detection`);
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(2000);

  // Use data-testid from source (found in component code)
  const tab = page.locator('[data-testid="deployments-tab"]');
  if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tab.click();
  } else {
    // Fallback to text-based locator
    await page.locator('button').filter({ hasText: /Deployments/ }).first().click();
  }

  await page.waitForSelector('tbody tr', { timeout: 10000 }).catch(() => null);
}
```

**Source inspection checklist (read BEFORE generating scripts):**
1. `src/routes.tsx` or `app/router.ts` — extract route paths
2. `src/components/Navigation/` or sidebar component — extract nav item labels
3. Target feature component — extract `data-testid` attributes
4. `package.json` — check for SPA framework (react-router, vue-router, etc.)

**When both URL and source are available:** Prefer source-informed navigation. The local server handles SPA routing correctly (via `sirv --single`), so direct `page.goto(route)` is safe.

### Decision Matrix

| Condition | Strategy | `navigateTo()` safe? |
|-----------|----------|---------------------|
| Remote URL, no source | Heuristic (click-through) | NO — use button clicks |
| Remote URL + MR source | Heuristic with informed labels | NO — use button clicks |
| Local project (source available) | Source-informed (direct routes) | YES — local sirv handles routing |
| Local project (no source, only dist/) | Heuristic (click-through) | MAYBE — only if sirv --single |
