# axe-core Baseline Methodology

Use axe-core as an automated floor. A clean result means that the executed rules found no violations in the scanned DOM state; it does not mean the page or flow is accessible.

## Choose the scan shape

### Broad sweep

Use a product-provided page registry or route list when available. Keep its command, authentication, data setup, exclusions, and artifact paths in the product overlay. A broad sweep is useful for discovering repeated violations across static page loads, but it normally misses overlays and interaction-dependent states.

### Targeted scan

Use targeted scans for one page, component, overlay, or flow:

1. Inventory default, empty, loading, error, success, expanded, selected, disabled, and validation states that apply.
2. Load the surface and wait for meaningful content rather than an arbitrary delay.
3. Open dialogs, menus, drawers, popovers, and multistep content before scanning those states.
4. Scope a scan only when the excluded page chrome has already been covered or is explicitly out of scope.
5. Run the project's supported WCAG A and AA rule tags and record the exact configuration.
6. Scan at least the default state and one significant interactive or error state when they exist.

## Record each violation

Preserve these axe fields when available:

- Rule ID
- Impact
- Description and help text
- Help URL
- WCAG and standards tags
- DOM target or selector
- Failure summary and relevant HTML excerpt
- Page, component, and UI state
- Viewport, zoom, theme, emulated media, and data environment

Normalize the result with `reporting-schema.md`. Keep axe impact as reported; do not silently convert it into product priority.

## Validate findings

- Reproduce the issue in the rendered interface.
- Confirm that the target still exists after asynchronous rendering settles.
- Check current PatternFly documentation to distinguish a consumer configuration issue from a component defect.
- Combine duplicate instances only when they share the same cause and remediation. Preserve affected targets and surfaces.
- If a rule appears incorrect, document the evidence before classifying it as a false positive.

## Rule suppression

Disable a rule only for a documented false positive or an explicitly accepted exception. Record the rule, scope, rationale, owner, and review condition beside the suppression. Never disable a rule merely to make a test pass.

## Coverage limitations

axe cannot establish that:

- Keyboard order and focus behavior are usable
- Focus indicators remain visible in all themes and media modes
- Reading and announcement order are meaningful
- Accessible names are helpful in context
- Zoom, reflow, reduced motion, or forced colors behave correctly
- A complex task is understandable or operable with assistive technology

Carry these items into the later review phases and the coverage matrix.
