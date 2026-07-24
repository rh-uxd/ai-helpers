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
