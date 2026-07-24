---
name: pf-glass-check
description: Audit PatternFly prototypes for Glass Mode handbook violations — glass-on-glass layering, missing isPlain, accessibility overrides, and background image rules. Use when building or reviewing glass-enabled UIs or prototypes.
---

### Objective

Analyze the provided React, HTML, or CSS source for violations of the PatternFly Glass Mode handbook. Report every violation with its location, severity, and a corrected code example. The most damaging mistake — and the one to flag first — is layering glass on glass by adding `isGlass` to child components inside a container that already has glass enabled.

See `references/glass-handbook.md` for the full Glass Mode specification.

### Auto-glass vs. manual-glass

Understanding which components receive glass automatically is the foundation of every rule below.

| Category | Components | How glass is applied |
|----------|-----------|---------------------|
| **Auto-glass** | Page, Masthead, Navigation, Login page | Automatically receive glass when `.pf-v6-theme-glass` is on `<html>` |
| **Manual-glass** | Card, Drawer, Hero, Panel | Accept the `isGlass` prop — but ONLY when they are NOT inside an auto-glass container |
| **Glass-surface children** | Any component sitting on a glass surface | Use `isPlain` to remove solid backgrounds and borders so the glass effect shows through |

### Rules

Rules are ordered by severity. Check them in this order and report the highest-severity violations first.

---

#### CRITICAL-1: No glass-on-glass layering

**Never add `isGlass` to a component that is inside an already-glass-enabled container.** When `.pf-v6-theme-glass` is on the `<html>` tag, Page, Masthead, Navigation, and Login already have glass. Adding `isGlass` to their children (Card, Panel, Drawer, Hero) creates glass-on-glass, which causes:
- Performance degradation from stacked backdrop filters
- Illegible text as blur compounds on child elements
- WCAG contrast failures

**Detect:** Any component with `isGlass` that is a descendant of:
- A `<Page>` when `.pf-v6-theme-glass` is on `<html>` or the document root
- A `<Masthead>`, `<Nav>`, `<Login>`, or `<LoginPage>` when glass theme is active
- Any other component that already has `isGlass`

```tsx
// WRONG — Card with isGlass inside a glass-enabled Page
// The Page already has glass from .pf-v6-theme-glass on <html>.
// Adding isGlass to Card creates glass-on-glass layering.
<Page>
  <PageSection>
    <Card isGlass>
      <CardBody>Content is blurred and unreadable</CardBody>
    </Card>
  </PageSection>
</Page>
```

```tsx
// RIGHT — Card with isPlain inside a glass-enabled Page
// isPlain removes the solid background so the Page's glass effect shows through.
<Page>
  <PageSection>
    <Card isPlain>
      <CardBody>Content is clear and readable</CardBody>
    </Card>
  </PageSection>
</Page>
```

```tsx
// WRONG — nested glass containers
<Panel isGlass>
  <Card isGlass>
    <CardBody>Compounded blur</CardBody>
  </Card>
</Panel>
```

```tsx
// RIGHT — plain children on a glass surface
<Panel isGlass>
  <Card isPlain>
    <CardBody>Clear content</CardBody>
  </Card>
</Panel>
```

**When is `isGlass` valid?** Only when the component sits on a non-glass surface and needs its own independent glass treatment — for example, a standalone Card on a solid-background page that does not have `.pf-v6-theme-glass` enabled.

---

#### HIGH-1: Confirm styling intent on glass surfaces

Components inside a glass-enabled container can use either default or plain styling. In glass mode, default styling keeps the background color and borders but at reduced opacity — the glass effect still passes through. Plain styling removes the background and borders entirely for a seamless blend into the glass surface. Both are valid; the user should choose intentionally.

**Detect:** Card, Panel, Drawer, or other container components inside a glass-enabled parent that do not have `isPlain`. Prompt the user to confirm their styling intent rather than assuming one is correct.

**Prompt the user with:**

> This `{Component}` is inside a glass-enabled container. Which styling do you want?
>
> 1. **Default** — Keeps the background color (at reduced opacity) and borders. The glass effect still shows through, but the component has visible definition and hierarchy on the surface.
> 2. **Plain** (`isPlain`) — Removes the background and borders entirely. The component blends seamlessly into the glass surface.

Apply whichever option the user selects. If the user chooses default, no change is needed.

```tsx
// Option 1: Default — reduced-opacity background with borders, glass shows through
<Page>
  <PageSection>
    <Card>
      <CardBody>Card has visual definition on the glass surface</CardBody>
    </Card>
  </PageSection>
</Page>
```

```tsx
// Option 2: Plain — no background or borders, blends into glass
<Page>
  <PageSection>
    <Card isPlain>
      <CardBody>Card blends seamlessly into the glass surface</CardBody>
    </Card>
  </PageSection>
</Page>
```

---

#### HIGH-2: Drawer variant must match glass context

Drawers on glass surfaces must use the correct variant for their display mode:

- **Overlay drawers** (default — no `isInline` prop) cover page content. They use the floating background token by default, which provides a solid-enough surface to remain readable over glass.
- **Inline drawers** (`isInline`) push page content aside. In glass mode they must not have a background color — the glass surface shows through the inline panel.

**Detect:** `<Drawer>` or `<DrawerPanelContent>` inside a glass-enabled container. Check whether the drawer is overlay or inline, then verify:
- Overlay: confirm the drawer is not overriding the floating background token with a transparent or glass value
- Inline: confirm no custom `background-color` is applied to the drawer panel

```tsx
// CORRECT — overlay drawer on a glass surface (default variant)
// Uses floating background token for readable content over glass
<Page>
  <PageSection>
    <Drawer isExpanded={isExpanded}>
      <DrawerContent panelContent={
        <DrawerPanelContent>
          <DrawerHead>Detail panel on floating surface</DrawerHead>
        </DrawerPanelContent>
      }>
        <DrawerContentBody>Primary content</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  </PageSection>
</Page>
```

```tsx
// CORRECT — inline drawer on a glass surface
// No background color — glass shows through the inline panel
<Page>
  <PageSection>
    <Drawer isExpanded={isExpanded} isInline>
      <DrawerContent panelContent={
        <DrawerPanelContent>
          <DrawerHead>Inline detail — glass shows through</DrawerHead>
        </DrawerPanelContent>
      }>
        <DrawerContentBody>Primary content shifts aside</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  </PageSection>
</Page>
```

```tsx
// WRONG — inline drawer with a custom background color in glass mode
<Drawer isExpanded={isExpanded} isInline>
  <DrawerContent panelContent={
    <DrawerPanelContent style={{ backgroundColor: '#fff' }}>
      <DrawerHead>Blocks the glass effect</DrawerHead>
    </DrawerPanelContent>
  }>
    <DrawerContentBody>Content</DrawerContentBody>
  </DrawerContent>
</Drawer>
```

---

#### HIGH-3: No text directly on background images

Text must never be placed directly on a background image. It must be inside a container with a background color or glass effect. Titles and headings with stronger font weights may be placed on images only if they pass brand and WCAG contrast requirements.

**Detect:** Text nodes, headings, or `<Content>` components placed as direct children of elements that have a background image set via CSS or inline styles, without an intermediate container providing a background color or glass treatment.

---

#### MEDIUM-1: High-contrast mode must override glass

When high-contrast mode is enabled, all glass effects must be automatically disabled. Glass transparency and blur are incompatible with high-contrast accessibility requirements.

**Detect:** Glass-enabled applications that do not include logic to disable glass when a high-contrast theme or `prefers-contrast` media query is active.

```css
/* Expected: glass effects disabled under high contrast */
@media (prefers-contrast: more) {
  .pf-v6-theme-glass {
    /* Glass tokens overridden with solid values */
  }
}
```

---

#### MEDIUM-2: Respect OS transparency and contrast preferences

Products must respect the `prefers-reduced-transparency` and `prefers-contrast` media queries by disabling glass or replacing it with a solid high-opacity background.

**Detect:** Glass-enabled stylesheets or theme configuration that do not include `@media (prefers-reduced-transparency: reduce)` or `@media (prefers-contrast: more)` handlers.

---

#### MEDIUM-3: Glass enablement

Glass components require `.pf-v6-theme-glass` on the `<html>` tag. Using `isGlass` props without enabling the glass theme class produces undefined visual behavior.

**Detect:** Components with `isGlass` prop in files where the glass theme class is not applied to the document root.

---

#### LOW-1: Use glass design tokens

Glass-specific styling should use the designated glass design tokens rather than hardcoded values.

| Token | Usage |
|-------|-------|
| `--pf-t--global--background--color--glass--primary--default` | Base fill for glass containers |
| `--pf-t--global--background--filter--glass--default` | Blur amount on glass elements |
| `--pf-t--global--border--color--glass--default` | Boundary highlight for glass surfaces |
| `--pf-t--global--border--radius--glass--default` | Rounded border for glass elements |
| `--pf-t--global--box-shadow--glass--default` | Elevation shadow for glass elements |

**Detect:** Hardcoded `backdrop-filter`, `opacity`, `background-color` with alpha values, `box-shadow`, or `border-radius` values in glass-context CSS that should use the tokens above.

---

#### LOW-2: Background image suitability (advisory)

Background images must not contain high levels of detail or extreme contrast. Custom images (not the provided defaults) should be flagged for manual review.

**Detect:** Custom background image paths overriding the default glass background CSS variables. Flag for manual review — this is advisory, not a hard violation.

**Default images (no flag needed):**
- `PF-Bkg-Generic-Light.svg` / `PF-Bkg-Generic-Dark.svg`
- `Felt-Bkg-Generic-Light.svg` / `Felt-Bkg-Generic-Dark.svg`

---

### Output Format

For every violation found, provide:

**Header:**
```
## Glass Mode Violations Found: {count}
```

**Per violation:**
```
### {n}. [{severity}] {rule-id}: {rule-name}

- **File:** `{path}`
- **Line:** {number}
- **Component:** `{component-name}`
- **Issue:** {one-sentence description of what's wrong}
- **Fix:**
  ```tsx
  // Before
  {current code}

  // After
  {corrected code}
  ```
```

**Summary:**
```
## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | {n} |
| HIGH | {n} |
| MEDIUM | {n} |
| LOW | {n} |

### Key actions
1. Remove `isGlass` from all components inside glass-enabled containers
2. Confirm styling intent (default vs. plain) for components on glass surfaces
3. Verify Drawer variant matches glass context (overlay = floating background, inline = no background)
4. Add `prefers-reduced-transparency` and `prefers-contrast` media query support
5. Replace hardcoded glass-related CSS values with glass design tokens
```

### Workflow

1. Establish the glass context — is `.pf-v6-theme-glass` active? Which containers have `isGlass`?
2. Build the component tree and identify glass surfaces
3. Scan every component for CRITICAL-1 and HIGH violations first
4. Scan CSS/SCSS for MEDIUM and LOW violations
5. Report violations in severity order with corrected code examples
6. Provide a summary with prioritized actions

### File Type Support

- **React/JSX/TSX** — Component tree analysis for `isGlass`, `isPlain` props and nesting
- **HTML** — `.pf-v6-theme-glass` class detection, inline style scanning
- **CSS/SCSS** — Glass token usage, media query coverage, background image overrides

### Exception Handling

**Do NOT flag:**
1. `isGlass` on components that are NOT inside a glass-enabled container (valid standalone use)
2. Components in test files or mock data (unless explicitly requested)
3. Glass tokens referenced via `var(--pf-t--...)` syntax
4. Default PatternFly background images (only flag custom overrides)
5. Code inside comments

### Decision Table

Quick-reference for component prop scanning:

| Component | On glass surface? | Has `isGlass`? | Has `isPlain`? | Result |
|-----------|-------------------|----------------|----------------|--------|
| Card, Hero, Panel | Yes | Yes | — | Violation: CRITICAL-1 |
| Card, Hero, Panel | Yes | No | No | Prompt: HIGH-1 (confirm default vs. plain) |
| Card, Hero, Panel | Yes | No | Yes | Pass |
| Card, Hero, Panel | No | Yes | — | Pass (valid standalone use) |
| Card, Hero, Panel | No | No | — | Pass |
| Drawer (overlay) | Yes | Yes | — | Violation: CRITICAL-1 |
| Drawer (overlay) | Yes | No | — | Pass (floating background token by default) |
| Drawer (inline) | Yes | — | — | Check: HIGH-2 (no background color in glass) |
| Drawer | No | — | — | Pass |
