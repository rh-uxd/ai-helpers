# Browser fixture verification

These fixtures exercise the expectations used by the accessibility skills. Browser assertions validate fixture behavior, not the quality of a model's review. Use the skill evaluation scenarios under `../../skills/*/eval/` for a separate review-quality check.

## Requirements

Node.js 22+, npm, and a Playwright-supported Chromium browser. These are development-test dependencies, not requirements of the skills. Python 3 with PyYAML is needed for repository eval validation, as elsewhere in the repository.

Stage dependencies outside the repository: its skill validator recursively scans `plugins/`, including nested node_modules. From this fixture directory:

```bash
browser_workspace=$(mktemp -d "${TMPDIR:-/tmp}/uxd-a11y-browser.XXXXXX")
cp -R package.json package-lock.json playwright.config.js modal runtime disclosure helpers "$browser_workspace/"
cd "$browser_workspace"
npm ci
npx playwright install chromium
npm test
```

Keep that workspace while reviewing evidence. The lockfile pins the actual fixture dependencies; no root package setup is needed.

To use an existing Chromium executable instead of downloading one, set `A11Y_BROWSER_PATH` to its absolute executable path before running `npm test`. The server binds to loopback port 4173 and refuses to reuse an existing server. Artifacts stay in the temporary workspace; any local artifact directory is ignored. Do not publish the deliberately broken fixtures as production examples.

## Layout

- `modal/` — React host for native, PatternFly, and custom modal fixtures and assertions.
- `runtime/` — standalone HTML for skip links, tabs, overflow, button activation, and responsive dialogs.
- `disclosure/` — standalone HTML and assertions for nonmodal disclosure behavior.
- `helpers/` — shared evidence capture; element-specific geometry is included only when present.

Playwright discovers `**/*.spec.js` beneath this directory. Open `/modal/`, `/runtime/runtime.html`, or `/disclosure/` on the dev server to inspect a fixture. Modal provider/variant query parameters apply to `/modal/`; the runtime clipped variant uses `/runtime/runtime.html?variant=clipped`.

## Cases

- Native `<dialog>.showModal()` with a name and static introductory autofocus.
- Actual PF 6.7.0 `Modal`, same task and static initial focus.
- Native unnamed and PF broken-title-reference variants.
- PF omitted naming props: broad fallback name rather than an empty name.
- PF explicitly disabled focus trap: background focus remains possible.
- Native `show()` used for an intended modal task: background remains reachable.
- Custom ARIA modal with no focus/background/Escape management.
- Nonmodal disclosure retaining focus: modal checks are N/A.

`provider` selects native, pf, or custom. `variant` selects valid, unnamed, broken-name, no-trap, or wrong-modality as applicable. All actions are local and nondestructive. PF uses real library components, not mocks.

## Evidence and limits

Playwright attaches active-element/DOM snapshots, screenshots and rendered semantic snapshots to `artifacts/results.json`. Forward traversal begins with real keyboard opening. Reverse-boundary and background-focus probes explicitly use direct setup; those probes are not a claimed natural keyboard path. Native browser-chrome transitions are recorded separately from focus entering background page content.

This suite does not test screen-reader speech, pointer blocking, all browsers, complete visual/media criteria, or full WCAG conformance. A passing negative-case test means the seeded defect was observed, not that its fixture is accessible.

## Runtime smoke checks

`runtime/runtime.html` is a standalone native/custom HTML fixture, independent of the React/PF modal host. `runtime/runtime.spec.js` checks visible bypass, manual tabs (Enter/Space, arrows, forward/reverse entry/exit), child-mediated overflow access, a deliberately pointer-only button, and dialogs at 375 and 320 CSS px. The clipped variant intentionally hides its focused Close button while retaining Escape dismissal. Negative tests pass when the seeded barrier is observed; they do not declare the fixture accessible.

These are controlled browser fixtures, not a production-product audit or independent model evaluation. Evidence attachments include focused element, geometry, viewport, user agent, rendered semantic snapshots, and screenshots. Direct-focus setup is explicitly labeled. No scanner, browser zoom/text resize, forced-colors, theme, or screen-reader results are implied.

## Dismissal recipe regression

`runtime/dismissal.spec.js` exercises a small custom-dialog fixture in three variants: Escape restores focus but leaves the overlay visible, Escape hides the retained overlay, and Escape removes it. The negative test proves focus return alone passes the broken case while a closure assertion rejects it. These are Playwright browser assertions supporting the recipe contract, not execution of Cypress APIs or complete modal behavior.

To run just this regression after the temporary-workspace setup above:

```bash
npm test -- runtime/dismissal.spec.js
```

The Cypress-specific API/closure expectations are separately covered by the `cypress-dismissal-false-pass` test-generation eval case; its model judgment must be run separately.
