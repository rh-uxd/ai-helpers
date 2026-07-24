---
name: pf-glass-standards
description: PatternFly Glass Mode standards — glass-on-glass prevention, isPlain vs default styling, Drawer variant rules, accessibility overrides, and background image rules. Active when building, generating, or prototyping glass-enabled PatternFly UIs.
---

# PatternFly Glass Mode Standards

Enforce Glass Mode handbook rules when generating PatternFly UI code. These standards apply whenever `.pf-v6-theme-glass` is active or the user requests glass mode, Project Felt with glass, or a glass-enabled prototype.

## Core Principle

Glass is applied at the container level. Children on a glass surface never add their own glass — they either use their default styling (which already has reduced opacity in glass mode) or use `isPlain` to blend seamlessly. The user decides which.

---

## Auto-glass Components

These components receive glass treatment automatically when `.pf-v6-theme-glass` is on `<html>`. Do not add `isGlass` to them or their children.

- Page
- Masthead
- Navigation
- Login page

## Manual-glass Components

These components accept the `isGlass` prop, but ONLY when they are NOT inside an auto-glass container:

- Card
- Drawer
- Hero
- Panel

## Rule 1: Never layer glass on glass

When generating code inside a glass-enabled Page, Masthead, Navigation, or Login:

- **Never** add `isGlass` to Card, Drawer, Hero, or Panel
- **Never** nest a component with `isGlass` inside another component with `isGlass`

This causes stacked backdrop filters, compounded blur making text illegible, and WCAG contrast failures.

```tsx
// NEVER do this — Card with isGlass inside a glass Page
<Page>
  <PageSection>
    <Card isGlass>  {/* WRONG */}
      <CardBody>Blurred and unreadable</CardBody>
    </Card>
  </PageSection>
</Page>
```

## Rule 2: Ask before choosing default vs plain

When placing Card, Panel, Drawer, or Hero inside a glass-enabled container, ask the user which styling they want before generating the code:

> This `{Component}` will be inside a glass-enabled container. Which styling do you want?
>
> 1. **Default** — Keeps the background color (at reduced opacity) and borders. The glass effect still shows through, but the component has visible definition and hierarchy.
> 2. **Plain** (`isPlain`) — Removes the background and borders entirely. The component blends seamlessly into the glass surface.

Apply whichever option the user selects:

```tsx
// Default — reduced-opacity background, visible card boundaries
<Card>
  <CardBody>Defined card on glass surface</CardBody>
</Card>

// Plain — fully transparent, blends into glass
<Card isPlain>
  <CardBody>Seamless card on glass surface</CardBody>
</Card>
```

If the user has already stated a preference for the session (e.g., "use default cards" or "make all cards plain"), apply that preference without re-asking.

## Rule 3: Drawer variant must match glass context

When placing a Drawer inside a glass-enabled container, choose the correct variant:

- **Overlay drawer** (default — no `isInline` prop): Covers page content. Uses the floating background token by default, providing a readable surface over glass. No additional styling needed.
- **Inline drawer** (`isInline`): Pushes page content aside. In glass mode, the inline panel must not have a background color — the glass surface shows through.

```tsx
// Overlay drawer — floating background token provides a readable surface
<Drawer isExpanded={isExpanded}>
  <DrawerContent panelContent={
    <DrawerPanelContent>
      <DrawerHead>Detail panel</DrawerHead>
    </DrawerPanelContent>
  }>
    <DrawerContentBody>Primary content</DrawerContentBody>
  </DrawerContent>
</Drawer>

// Inline drawer — no background color, glass shows through
<Drawer isExpanded={isExpanded} isInline>
  <DrawerContent panelContent={
    <DrawerPanelContent>
      <DrawerHead>Inline detail</DrawerHead>
    </DrawerPanelContent>
  }>
    <DrawerContentBody>Primary content shifts aside</DrawerContentBody>
  </DrawerContent>
</Drawer>
```

Never add a custom `background-color` to an inline drawer panel in glass mode — it blocks the glass effect.

## Rule 4: Glass-specific component variants

When glass is active, use the glass-specific variants:

- **Banded masthead** — adds transparency, blur, and shadowed border
- **Floating side navigation** — inset with transparency, blur, and shadowed border

## Rule 5: Background image safety

- Never place text directly on a background image — always use a container with a background color or glass effect
- Titles with strong font weights may be placed on images only if they pass 4.5:1 contrast ratio

## Rule 6: Accessibility requirements

When setting up a glass-enabled application, always include:

1. `@media (prefers-contrast: more)` handler that overrides glass tokens with solid values
2. `@media (prefers-reduced-transparency: reduce)` handler that disables glass effects
3. A way for users to switch to default or high-contrast mode (theme switcher or preferences)

```css
@media (prefers-contrast: more) {
  :root {
    --pf-t--global--background--color--glass--primary--default: var(--pf-t--global--background--color--primary--default);
    --pf-t--global--background--filter--glass--default: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  :root {
    --pf-t--global--background--color--glass--primary--default: var(--pf-t--global--background--color--primary--default);
    --pf-t--global--background--filter--glass--default: none;
  }
}
```

When scaffolding a new glass-enabled project, include these media queries in the application stylesheet from the start.

## Rule 7: Glass design tokens

Use these tokens instead of hardcoded values for glass-related styling:

| Token | Usage |
|-------|-------|
| `--pf-t--global--background--color--glass--primary--default` | Base fill for glass containers |
| `--pf-t--global--background--filter--glass--default` | Blur amount |
| `--pf-t--global--border--color--glass--default` | Boundary highlight |
| `--pf-t--global--border--radius--glass--default` | Rounded border |
| `--pf-t--global--box-shadow--glass--default` | Elevation shadow |

Never hardcode `backdrop-filter`, `opacity`, `background-color` with alpha, `box-shadow`, or `border-radius` for glass surfaces.

## Rule 8: Glass enablement

Always add `.pf-v6-theme-glass` to the `<html>` tag. For Project Felt with glass, use both classes:

```html
<html class="pf-v6-theme-felt pf-v6-theme-glass">
```

## Checklist for new glass prototypes

When starting a glass-enabled prototype, verify:

- [ ] `.pf-v6-theme-glass` on `<html>` (plus `.pf-v6-theme-felt` if using Felt)
- [ ] No `isGlass` on components inside auto-glass containers
- [ ] User preference confirmed for default vs plain on container components
- [ ] Drawers use correct variant: overlay (floating background) or inline (no background color)
- [ ] `prefers-contrast` media query handler included
- [ ] `prefers-reduced-transparency` media query handler included
- [ ] No text placed directly on background images
- [ ] All glass styling uses design tokens, no hardcoded values
