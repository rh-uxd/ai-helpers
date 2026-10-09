# Viewport and Media Matrix

Run applicable keyboard, reachability, visibility, and state checks under each condition. Record the exact environment and mark unsupported conditions as **Not tested**.

## Core matrix

| Condition | What to verify | Common evidence |
|---|---|---|
| Narrow viewport, approximately 375 × 667 CSS px | Navigation remains operable, primary content does not require unnecessary horizontal scrolling, controls do not overlap, and overlays fit and scroll | Viewport dimensions, screenshot, unreachable target |
| Text resized to 200% | Text remains visible and usable without clipping, overlap, or loss of controls or content | Browser text-size setting, before/after screenshot |
| Reflow at 320 CSS px content width | Content reflows without two-dimensional scrolling except for content that inherently requires it, such as complex data tables | CSS viewport width, overflow target |
| `prefers-reduced-motion: reduce` | Essential information is not conveyed only by motion and animations do not hide or delay access to content | Emulated media value, observed transition or state |
| `forced-colors: active` or available high-contrast mode | Focus, boundaries, links, controls, selected states, and status differences remain perceivable | Emulated/system mode, screenshot, affected selector |
| Product-supported themes | Text, focus, status, disabled, and interactive states remain distinguishable in each supported theme | Theme name, screenshot, affected state |

## Important distinctions

- Test browser zoom, text resizing, CSS viewport width, and device pixel ratio independently because they measure different behavior. Use browser zoom or text-size controls—not `deviceScaleFactor`—as evidence for zoom or text-resize results.
- Responsive mobile layout does not by itself demonstrate WCAG reflow compliance.
- A screenshot can show clipping or visibility, but keyboard reachability and programmatic semantics still require interaction and tree inspection.
- Forced-colors emulation is useful but may not perfectly reproduce every operating-system and browser combination. Record the implementation used.

## Procedure

1. Establish the default condition and primary task path.
2. Apply one matrix condition at a time unless testing a documented combination.
3. Reload when necessary so initial media queries and application state are applied consistently.
4. Repeat the primary task and any layout-sensitive overlays.
5. Check focus visibility, content reachability, scrolling, clipping, overlap, and loss of information.
6. Record Pass, Fail, N/A, or Not tested for each condition and surface.

Dark theme is required only when the product supports it. Add product-specific breakpoints, density modes, localization expansion, or platform high-contrast combinations in the downstream overlay without removing the core conditions.
