# Visual and media runtime checks

Exercise the primary task and layout-sensitive overlays in applicable conditions. Record actual settings, evidence, and unsupported checks; do not infer interactions from screenshots alone.

## VISUAL-01 — Conditions and outcomes

| Condition | Verify |
|---|---|
| Default and narrow viewport (approximately 375 × 667 CSS px) | Reachable task, unclipped controls, usable overlay scrolling, and meaningful focus visibility |
| Text resized to 200% | No loss of content/functionality from clipping or overlap; record actual browser text-size/zoom method |
| Reflow at 320 CSS px content width | No unnecessary two-dimensional scrolling, with applicable exceptions for content requiring two-dimensional layout; consider the corresponding height for vertically written content |
| Reduced motion | Exercise transitions and check access to information; identify applicable motion criteria rather than claiming every animation must disappear |
| Forced colors / available high contrast | Focus, boundaries, selected states, and essential distinctions remain perceivable; identify system mode versus emulation |
| Supported themes | Check text, controls, focus, and status in each supported theme, including meaningful interaction states |

## VISUAL-02 — Measurement and interpretation

- Change one condition at a time unless testing a documented combination; reload when needed and repeat the task. Record exact viewport, zoom/text settings, theme/media, and affected state.
- Browser zoom, text resize, CSS viewport width, and device pixel ratio are different. DPR/deviceScaleFactor is not evidence of text resizing or browser zoom. Narrow mobile layout alone is not reflow conformance.
- For contrast, use trustworthy foreground/background colors and relevant size/weight, including actual compositing. Text normally requires 4.5:1; large text 3:1 (18pt regular or 14pt bold, not 18px regular). Apply non-text contrast to required component/state information with criterion-specific exceptions. Inactive controls have contrast exceptions; do not invent failures from them.
- Assess color-only information independently from contrast. Record uncertain screenshot sampling as uncertain rather than declaring a measured pass.
- Inspect focus visibility and obscuring during actual keyboard interaction, not only a static screenshot. Use [keyboard navigation](keyboard-navigation.md) for that method.
- Unsupported emulation or unavailable measurements are Not tested; ambiguous attempted measurements are Inconclusive. High-contrast emulation does not establish all OS/browser behavior.

## Sources

- [WCAG resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
- [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
