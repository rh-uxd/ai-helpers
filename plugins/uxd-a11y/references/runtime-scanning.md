# Automated scans and rendered semantics

Use the available project's scanner/browser capabilities. No particular tool is required, and no missing capability is a passing result. Use [reporting](reporting.md) for observations and consolidation.

## SCAN-01 — Broad and targeted scans

1. Preserve product-provided routes, startup/authentication, safe test data, state setup, exclusions, and artifact conventions. Broad route sweeps find repeated issues but do not cover unopened overlays.
2. Inventory applicable default, loading, empty, error, success, expanded, selected, disabled, and validation states. Scan the default and at least one significant interactive/error state when applicable; disclose omissions.
3. Wait for meaningful content/state, not an arbitrary delay. Include portal content and the relevant page context; explain any scoped-out chrome.
4. Use installed supported WCAG A/AA tags/rules; record scanner/version, exact tags/rules, include/exclude scope, state, browser, viewport, and other active conditions. Do not guess configuration or silently claim WCAG 2.2 coverage from an older ruleset.
5. Preserve rule ID, impact, help URL, standards tags, target, failure summary/HTML, and affected route/state. Check reproducibility and classify findings against actual evidence; scanner impact is not tracker priority.

## SCAN-02 — Incomplete results and exceptions

- A clean scan means only that executed rules reported no violations in that DOM state. Keep keyboard, visual, and manual AT coverage separate.
- Review incomplete/needs-review results. If unresolved, retain Inconclusive with follow-up; do not merge them into passes.
- Group duplicate causes while retaining affected occurrences and evidence. Confirm that a suspected provider issue is not consumer composition or an outdated API assumption.
- Document false-positive evidence before suppressing a rule. For accepted genuine failures, preserve the finding and acceptance record (scope, rationale, owner/review condition when supplied); acceptance is not remediation.
- Do not disable rules to manufacture a clean result. If scanner execution is unavailable, mark Not tested and continue supported methods.

## RENDER-01 — Inspect actual exposed structure

- Capture the rendered accessibility tree when available and use DOM inspection to explain relationships, hidden content, portals, and shadow boundaries. Label DOM-only evidence accurately when no tree is available.
- Check title/headings, landmarks, controls, lists/tables, forms, overlays, and their names/roles/states. Apply [names/semantics](names-and-semantics.md) and [ARIA relationships](aria-states-and-relationships.md); do not invent a second set of semantic rules.
- Compare intended reading order, visible order, tree order, and keyboard order where meaningful. Inspect collapsed/inert content and unexpected focusable descendants.
- Repeat after routes, validation, loading completion, and overlay transitions. Apply [forms/updates](forms-and-updates.md) to errors/status and region lifetime.
- A snapshot can establish exposed semantics; it cannot establish actual speech, announcement timing, or absence of duplicate announcements. Record those as manual verification gaps unless supplied or executed AT evidence establishes them.

## Sources

- [axe-core API and results](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) — match the installed version when configuring execution.
- [WCAG evaluation overview](https://www.w3.org/WAI/test-evaluate/)
