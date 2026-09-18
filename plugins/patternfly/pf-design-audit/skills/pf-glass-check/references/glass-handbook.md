# Glass Mode Handbook Reference

Source: https://www.patternfly.org/foundations-and-styles/theming/glass-mode-handbook/

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
- Drawer
- Hero
- Panel

**`isGlass` is only valid when the component is NOT inside an auto-glass or manually-glass container.** Using `isGlass` inside a glass container creates glass-on-glass layering.

### Plain variant (`isPlain` prop)

The `isPlain` prop removes default borders and solid background colors so components can sit directly on a glass-enabled surface without obscuring the depth effect. Use `isPlain` on components inside glass containers.

### Drawer variants in glass

Drawers on glass surfaces must use the correct variant for their display mode:

- **Overlay drawer** (default — no `isInline` prop): Covers page content. Uses the floating background token (`--pf-t--global--background--color--floating--default`) by default, providing a solid-enough surface to remain readable over glass. No additional glass styling needed.
- **Inline drawer** (`isInline`): Pushes page content aside when expanded. In glass mode, the inline panel must not have a background color — the glass surface shows through the panel area. Do not apply custom `background-color` to inline drawer panels in glass mode.

### Glass-specific component variants

When glass is enabled, two variants replace their standard counterparts:

1. **Banded masthead** — Adds transparency, blur, and a shadowed border to the masthead, setting it apart as a persistent dock above the rest of the page.
2. **Floating side navigation** — Adds transparency, blur, and a shadowed border to the side navigation, insetting it to make it visually elevated and clearly readable within the glass context.

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

### HIGH-1: Confirm styling intent on glass surfaces

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

### HIGH-2: Drawer variant must match glass context

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

| Token | Usage |
|-------|-------|
| `--pf-t--global--background--color--glass--primary--default` | Base fill for glass containers |
| `--pf-t--global--background--filter--glass--default` | Blur amount on glass elements |
| `--pf-t--global--border--color--glass--default` | Boundary highlight for glass surfaces |
| `--pf-t--global--border--radius--glass--default` | Rounded border for glass elements |
| `--pf-t--global--box-shadow--glass--default` | Elevation shadow for glass elements |

**Detect:** Hardcoded `backdrop-filter`, `opacity`, `background-color` with alpha values, `box-shadow`, or `border-radius` values in glass-context CSS that should use the tokens above.

---

### LOW-2: Background image suitability (advisory)

Background images must not contain high levels of detail or extreme contrast. Custom images (not the provided defaults) should be flagged for manual review.

**Detect:** Custom background image paths overriding the default glass background CSS variables. Flag for manual review — this is advisory, not a hard violation.

**Default images (no flag needed):**
- `PF-Bkg-Generic-Light.svg` / `PF-Bkg-Generic-Dark.svg`
- `Felt-Bkg-Generic-Light.svg` / `Felt-Bkg-Generic-Dark.svg`
