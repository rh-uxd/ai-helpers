# Glass Mode Handbook Reference

Source: https://www.patternfly.org/foundations-and-styles/theming/glass-mode-handbook/

## Contents

- [Components and glass](#components-and-glass)
- [Decision table](#decision-table)
- [Background images](#background-images)
- [Glass design tokens](#glass-design-tokens)
- [Technical constraints](#technical-constraints)
- [Accessibility requirements](#accessibility-requirements)
- [Audit scope](#audit-scope)
- [Audit rules](#audit-rules)

For finding layout and summaries, read [the audit report format](audit-report.md).

## What is glass mode

Glass mode is a contrast mode option that can be manually enabled in both Default and Project Felt themes. It adds transparency, blurring, and depth to the UI so that brand-approved background images and layered UI elements subtly show through.

## Enabling glass mode

Add the class `.pf-v6-theme-glass` to the application's `<html>` tag. Works across light and dark color schemes and both Default and Project Felt themes.

## Components and glass

### Automatic glass (no prop needed)

These components receive glass treatment automatically when `.pf-v6-theme-glass` is on `<html>`:

- Login page
- Masthead
- Navigation
- Page

### Manual glass (`isGlass` prop)

These components accept an `isGlass` prop for manual glass enablement:

- Card
- DrawerPanelContent (subject to the drawer variant rules below)
- Hero
- Panel

**`isGlass` is only valid when the component is NOT inside an auto-glass or manually-glass container.** Using `isGlass` inside a glass container creates glass-on-glass layering.

### Default styling and optional plain variant (`isPlain` prop)

Children on glass surfaces can use default styling or the optional plain variant. Prefer default card styling: it retains background color at reduced opacity and borders for visible definition and hierarchy. `isPlain` removes the background and borders for a seamless appearance on components that support it. Apply it when the user requests plain styling; preserve existing explicit choices. Missing `isPlain` on cards is not a violation, and no confirmation is required before using default styling. Drawer backgrounds follow the variant-specific rules below.

### Drawer variants in glass

Drawer styling must follow the display mode. Overlay drawers never use `isGlass`, regardless of parent. Inline drawers inside glass parents must use the plain panel variant. In React, `isInline` belongs on `Drawer`; `isPlain` and `isGlass` belong on `DrawerPanelContent` (see [Drawer API](https://www.patternfly.org/components/drawer/)).

- **Overlay drawer** (default — no `isInline` prop): Covers page content. Uses the floating background token (`--pf-t--global--background--color--floating--default`) by default, providing a solid-enough surface to remain readable over glass. Never pass `isGlass` to the overlay panel, including when it is outside a glass parent.
- **Inline drawer** (`isInline`): Pushes page content aside when expanded. Inside a glass parent, use `<DrawerPanelContent isPlain>` without `isGlass` so the parent surface shows through. Do not disable plain styling with `isNoPlainOnGlass`. Do not apply custom `background-color` to inline drawer panels in glass mode.

### Glass-specific component variants

When glass is enabled, two variants replace their standard counterparts:

1. **Banded masthead** — Adds transparency, blur, and a shadowed border to the masthead, setting it apart as a persistent dock above the rest of the page.
2. **Floating side navigation** — Adds transparency, blur, and a shadowed border to the side navigation, insetting it to make it visually elevated and clearly readable within the glass context.

## Decision table

Quick-reference for component prop scanning. For drawer rows, `isGlass` and `isPlain` refer to `DrawerPanelContent`; determine overlay versus inline from the enclosing `Drawer`. Report nested overlay glass as CRITICAL-1, otherwise as HIGH-2, without duplicating the same finding.

| Component | On glass surface? | Has `isGlass`? | Has `isPlain`? | Result |
|-----------|-------------------|----------------|----------------|--------|
| Card, Hero, Panel | Yes | Yes | — | Violation: CRITICAL-1 |
| Card, Hero, Panel | Yes | No | No | Pass (preferred default styling; no prompt needed) |
| Card, Hero, Panel | Yes | No | Yes | Pass |
| Card, Hero, Panel | No | Yes | — | Pass (valid standalone use) |
| Card, Hero, Panel | No | No | — | Pass |
| Drawer (overlay) | Yes | Yes | — | Violation: CRITICAL-1 |
| Drawer (overlay) | No | Yes | — | Violation: HIGH-2 |
| Drawer (overlay) | — | No | — | Pass if floating background is preserved |
| Drawer (inline) | Yes | Yes | — | Violation: CRITICAL-1 |
| Drawer (inline) | Yes | No | No | Violation: HIGH-2 (plain panel required) |
| Drawer (inline) | Yes | No | Yes | Pass if no custom background or plain-disabling override |
| Drawer (inline) | No | — | — | Check standalone theme and styling context |

## Background images

### Requirements

- Images must not contain high levels of detail or extreme contrast to maintain readability and contrast ratios
- Available from the Red Hat brand portal; custom images require collaboration with the brand team
- Text must never be placed directly on a background image — it must be inside a container with a background color or glass effect
- Titles/headings with stronger weights may be placed directly on images only if they pass brand and contrast requirements

### Default images

| Theme | Mode | File |
|-------|------|------|
| Default | Light | `PF-Bkg-Generic-Light.svg` |
| Default | Dark | `PF-Bkg-Generic-Dark.svg` |
| Project Felt | Light | `Felt-Bkg-Generic-Light.svg` |
| Project Felt | Dark | `Felt-Bkg-Generic-Dark.svg` |

### Import paths

From `@patternfly/patternfly`:
```
@patternfly/patternfly/assets/images/
```

From `@patternfly/react-core`:
```
@patternfly/react-core/dist/styles/assets/images/
```

### Background image CSS variables

| Variable | Usage |
|----------|-------|
| `--pf-t--global--background--image--glass` | Default/glass light theme |
| `--pf-t--global--background--image--glass--dark` | Default/glass dark theme |
| `--pf-t--global--background--image--felt--glass` | Felt/glass light theme |
| `--pf-t--global--background--image--felt--glass--dark` | Felt/glass dark theme |

Override at `:root` scope:

```css
:root {
  --pf-t--global--background--image--glass--dark: url(../backgrounds/custom/my-glass-dark-image.jpg);
}
```

## Opacity

- Glass surfaces use 50% opacity in both light and dark mode with a background blur effect
- Default opacity values are tested for accessibility, legibility, and visual appeal
- Overriding opacity tokens shifts WCAG compliance responsibility to the product team

## Glass design tokens

| Token | Light value | Dark value | Usage |
|-------|------------|------------|-------|
| `--pf-t--global--background--color--glass--primary--default` | #FFFFFF (50% opacity) | #292929 (50% opacity) | Base fill for glass containers |
| `--pf-t--global--background--filter--glass--default` | 16% blur | 16% blur | Blur amount on glass elements |
| `--pf-t--global--border--color--glass--default` | `--pf-t--global--border--color--alt` | `--pf-t--global--border--color--alt` | Boundary highlight |
| `--pf-t--global--border--radius--glass--default` | `--pf-t--global--border--radius--medium` | `--pf-t--global--border--radius--medium` | Rounded border |
| `--pf-t--global--box-shadow--glass--default` | `--pf-t--global--box-shadow--md` | `--pf-t--global--box-shadow--md` | Elevation shadow |

Related token: `--pf-t--global--background--color--sticky--default` provides a solid background for non-glass elements (like sticky headers) sitting on top of glass content.

## Technical constraints

### No glass-on-glass layering

Never layer glass-enabled containers. Doing so causes:
- Significant performance problems from stacked backdrop filters
- Accessibility problems as child objects inside a blurred parent become illegibly blurred themselves

PatternFly adjusts the opacity of background color design tokens to simulate depth without introducing extra blur.

### High-contrast precedence

If high-contrast mode is enabled, all glass effects must be automatically disabled to prioritize functional accessibility.

### User controls and preferences

Products must:
- Provide a theme switcher or preferences menu so users can swap to default or high-contrast mode
- Respect OS-level media queries: `prefers-reduced-transparency` and `prefers-contrast`
- Disable glass or replace it with a solid high-opacity background to accommodate users who need it

## Accessibility requirements

- All text must meet a 4.5:1 (AA) contrast ratio
- High-contrast mode must override any use of glass
- Verify glass components against both light and dark background variations to catch contrast failures early
- Glass implementation must not harm overall accessibility or usability

---

## Audit scope

Inspect React/JSX/TSX component props and nesting, HTML theme classes and inline styles, and CSS/SCSS token use, media queries, and background overrides. Establish the application-level glass context and trace glass surfaces through the component tree before reporting findings. Check CRITICAL and HIGH component rules first, then MEDIUM and LOW theme and styling rules.


**Do NOT flag:**
1. Standalone `isGlass` outside a glass-enabled container is not nested glass; overlay drawers are still prohibited from using it (HIGH-2)
2. Components in test files or mock data (unless explicitly requested)
3. Glass tokens referenced via `var(--pf-t--...)` syntax
4. Default PatternFly background images (only flag custom overrides)
5. Code inside comments
6. Cards, Hero, and Panel without `isPlain` — default styling is valid and preferred for new cards; this exception does not apply to inline drawer panels inside glass parents
7. Children with `isPlain` — explicitly chosen plain styling is also valid

## Audit Rules

The following rules define violations to detect when auditing glass mode implementations. Check in severity order: CRITICAL first, then HIGH, MEDIUM, LOW.

### CRITICAL-1: No glass-on-glass layering

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
// RIGHT — default Card inside a glass-enabled Page
// Remove isGlass; retain default styling unless plain styling is requested.
<Page>
  <PageSection>
    <Card>
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
// RIGHT — default child styling on a glass surface
<Panel isGlass>
  <Card>
    <CardBody>Clear content</CardBody>
  </Card>
</Panel>
```

**When is `isGlass` valid?** Never for an overlay drawer. For other eligible components, only when the component sits on a non-glass surface and needs its own independent glass treatment — for example, a standalone Card on a solid-background page that does not have `.pf-v6-theme-glass` enabled.

---

### Styling guidance (not a violation): Default with optional plain

Follow [default styling and the optional plain variant](#default-styling-and-optional-plain-variant-isplain-prop). When fixing nested glass on a card, remove `isGlass` without automatically adding `isPlain`. Plain styling may be offered without blocking implementation or adding a UI toggle unless requested. Inline drawer panels follow HIGH-2 instead.

HIGH-1 is retired; missing `isPlain` on cards does not count as a violation.

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

### HIGH-2: Drawer variant must match glass context

Apply [drawer variants in glass](#drawer-variants-in-glass).

**Detect:** Inspect every `Drawer` and its `DrawerPanelContent`. Determine whether the drawer overlays content or is inline, including conditional/responsive modes. Check the active mode rather than merely the presence of a prop.
- Overlay, with any parent: flag `isGlass` on the panel (or incorrectly on `Drawer`), and transparent/glass overrides of the floating background.
- Inline inside a glass parent: require `isPlain` on `DrawerPanelContent`; flag missing/false `isPlain`, enabled `isNoPlainOnGlass`, and custom panel background colors. Remove any `isGlass`.
- If `isGlass` also creates nested glass, report CRITICAL-1 first and do not duplicate the same issue under HIGH-2. Missing plain styling remains a separate HIGH-2 finding.

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
// Plain panel required inside a glass parent; no isGlass
<Page>
  <PageSection>
    <Drawer isExpanded={isExpanded} isInline>
      <DrawerContent panelContent={
        <DrawerPanelContent isPlain>
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

### HIGH-3: No text directly on background images

Text must never be placed directly on a background image. It must be inside a container with a background color or glass effect. Titles and headings with stronger font weights may be placed on images only if they pass brand and WCAG contrast requirements.

**Detect:** Text nodes, headings, or `<Content>` components placed as direct children of elements that have a background image set via CSS or inline styles, without an intermediate container providing a background color or glass treatment.

---

### MEDIUM-1: High-contrast mode must override glass

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

### MEDIUM-2: Respect OS transparency and contrast preferences

Products must respect the `prefers-reduced-transparency` and `prefers-contrast` media queries by disabling glass or replacing it with a solid high-opacity background.

**Detect:** Glass-enabled stylesheets or theme configuration that do not include `@media (prefers-reduced-transparency: reduce)` or `@media (prefers-contrast: more)` handlers.

---

### MEDIUM-3: Glass enablement

Glass components require `.pf-v6-theme-glass` on the `<html>` tag. Using `isGlass` props without enabling the glass theme class produces undefined visual behavior.

**Detect:** Components with `isGlass` prop in files where the glass theme class is not applied to the document root.

---

### LOW-1: Use glass design tokens

Glass-specific styling should use the designated glass design tokens rather than hardcoded values.

Use the [glass design tokens](#glass-design-tokens) listed above.

**Detect:** Hardcoded `backdrop-filter`, `opacity`, `background-color` with alpha values, `box-shadow`, or `border-radius` values in glass-context CSS that should use the tokens above.

---

### LOW-2: Background image suitability (advisory)

Background images must not contain high levels of detail or extreme contrast. Custom images (not the provided defaults) should be flagged for manual review.

**Detect:** Custom background image paths overriding the default glass background CSS variables. Flag for manual review — this is advisory, not a hard violation.

**Default images (no flag needed):**
- `PF-Bkg-Generic-Light.svg` / `PF-Bkg-Generic-Dark.svg`
- `Felt-Bkg-Generic-Light.svg` / `Felt-Bkg-Generic-Dark.svg`
