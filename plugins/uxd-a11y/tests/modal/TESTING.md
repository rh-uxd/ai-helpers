# Modal slice verification

These fixtures exercise the expectations used by the draft skills. Browser assertions validate fixture behavior, not the quality of a model's review. Use the colocated skill evaluation scenarios for a separate review-quality check.

## Requirements

Node.js 22+, npm, and a Playwright-supported Chromium browser. These are development-test dependencies, not requirements of the skills. Python 3 with PyYAML is needed for repository eval validation, as elsewhere in the repository.

Stage dependencies outside the repository: its skill validator recursively scans `plugins/`, including nested node_modules. From this fixture directory:

```bash
modal_workspace=$(mktemp -d "${TMPDIR:-/tmp}/uxd-a11y-modal.XXXXXX")
cp package.json package-lock.json index.html fixtures.jsx fixtures.css modal.spec.js playwright.config.js "$modal_workspace/"
cd "$modal_workspace"
npm ci
npx playwright install chromium
npm test
```

Keep that workspace while reviewing evidence. The lockfile pins the actual fixture dependencies; no root package setup is needed.

To use an existing Chromium executable instead of downloading one, set `MODAL_BROWSER_PATH` to its absolute executable path before running `npm test`. The server binds to loopback port 4173 and refuses to reuse an existing server. Artifacts stay in the temporary workspace; any local artifact directory is ignored. Do not publish the deliberately broken fixtures as production examples.

## Cases

- Native `<dialog>.showModal()` with a name and static introductory autofocus.
- Actual PF 6.7.0 `Modal`, same task and static initial focus.
- Native unnamed and PF broken-title-reference variants.
- PF omitted naming props: broad fallback name rather than an empty name.
- PF explicitly disabled focus trap: background focus remains possible.
- Native `show()` used for an intended modal task: background remains reachable.
- Custom ARIA modal with no focus/background/Escape management.
- Nonmodal disclosure retaining focus: modal checks are N/A.

`provider` selects native, pf, custom, or disclosure. `variant` selects valid, unnamed, broken-name, no-trap, or wrong-modality as applicable. All actions are local and nondestructive. PF uses real library components, not mocks.

## Evidence and limits

Playwright attaches active-element/DOM snapshots, screenshots and rendered semantic snapshots to `artifacts/results.json`. Forward traversal begins with real keyboard opening. Reverse-boundary and background-focus probes explicitly use direct setup; those probes are not a claimed natural keyboard path. Native browser-chrome transitions are recorded separately from focus entering background page content.

This suite does not test screen-reader speech, pointer blocking, all browsers, complete visual/media criteria, or full WCAG conformance. A passing negative-case test means the seeded defect was observed, not that its fixture is accessible.
