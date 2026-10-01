---
name: pf-rhds-theme-guide
description: Audit and fix theme synchronization between PatternFly React and Red Hat Design System web components, then generate a usage guide. Use when a project mixes PF and RHDS and needs theme setup or has theme sync issues.
---

# PF + RHDS Theme Sync — Audit, Fix, and Guide

Audit a project's theme synchronization between PatternFly (PF) React and Red Hat Design System (RHDS) web components, apply fixes, and output a usage guide summarizing the setup.

## When to use

Invoke this skill when:
- A project uses both `@patternfly/react-core` and `@rhds/*` (or `@rh/*`) web components
- Someone asks how to set up dark mode across PF and RHDS
- Theme switching isn't working correctly across PF and RHDS components
- A developer needs a quick-start reference for theme switching in a mixed PF+RHDS app

## Step 0 — Audit the project

Before generating anything, scan the project for theme-related code. Search for:

1. **Theme toggle function** — look for code that adds/removes `pf-v6-theme-dark` on the document root, or sets `color-scheme`, or dispatches/listens for `scheme-changed` events
2. **`colorPalette` / `color-palette` usage** — look for RHDS components where `colorPalette` (or `color-palette`) is set. Classify each as:
   - **Redundant** — the value tracks the page theme (e.g., `theme === "dark" ? "darkest" : "lightest"`). If the project already toggles `pf-v6-theme-dark` on `<html>`, RHDS inherits `color-scheme` automatically and this mapping is unnecessary.
   - **Intentional override** — the value is a static string (e.g., `color-palette="dark"`) that forces the component to a fixed theme regardless of the page theme. This is a deliberate per-component override and should be kept.
3. **Components with theme caveats** — search for usage of `CodeEditor`, `Hero`, `Chart` (from `@patternfly/react-charts`), `rh-footer`, and `rh-navigation-secondary-menu`. Check that the required theme props are present (see Section 3 below)
4. **Dual switching conflicts** — check whether the project uses both a custom toggle AND an RHDS switcher component (`rh-scheme-toggle`, `rh-scheme-dropdown`).

Report what you find before making changes.

## Step 1 — Apply fixes

Based on the audit, make the following changes as applicable:

### Fix A — Ensure `pf-v6-theme-dark` is toggled on `<html>`

If the project has a theme toggle function that doesn't toggle `pf-v6-theme-dark` on `document.documentElement`, update it. This is the single action that keeps both PF and RHDS in sync.

### Fix B — Remove redundant `colorPalette` mapping (but keep intentional overrides)

If RHDS components have `colorPalette` dynamically mapped from theme state (e.g., `theme === "dark" ? "darkest" : "lightest"`), and the project already toggles `pf-v6-theme-dark` on `<html>`, remove the dynamic mapping. RHDS inherits `color-scheme` automatically — the dynamic override duplicates that mechanism and can cause mismatches.

**Do not remove static `colorPalette` values.** A hardcoded value like `colorPalette="dark"` or `color-palette="darkest"` is an intentional per-component override — the developer wants that component to stay in a fixed theme regardless of the page theme. Leave these in place.

To tell the difference:
- **Redundant (remove):** the value changes based on theme state — it's derived from a variable, ternary, or lookup that mirrors the page theme
- **Intentional (keep):** the value is a static string that doesn't change when the page theme changes

### Fix C — Add missing theme-caveat props

- `CodeEditor`: add `isDarkTheme` prop wired to the current theme state
- `Hero`: add `backgroundSrcLight` and `backgroundSrcDark` props if the component has a background image but only one source
- `Chart` (ECharts-based): add `nodeSelector="html"` if missing

### Fix D — Resolve dual-switching conflicts

If both a custom toggle and an RHDS switcher are present, consolidate to one method. Prefer the custom toggle (Approach A) unless the RHDS switcher is intentional.

## Step 2 — Output the guide

After applying fixes, output the usage guide below as text to the user (not as a file). Tailor it to the project: note which approach the project uses, which caveats apply, and what was changed.

---

### Section 1 — How theming works (background)

Explain the two mechanisms and why they need coordination:

**PatternFly** detects theme by checking whether the CSS class `pf-v6-theme-dark` is present on the `<html>` element. When the class is added, PF components render in dark mode. When it is removed, they render in light mode.

**RHDS** detects theme by inheriting the `color-scheme` CSS property from a parent element (usually `<body>`). RHDS components read this inherited value and adjust their rendering.

**Why they stay in sync automatically (in the simple case):** PF's stylesheet sets `color-scheme` on the root element when `pf-v6-theme-dark` is applied. Because RHDS inherits `color-scheme`, toggling the PF class is enough to switch both systems — no extra wiring needed.

---

### Section 2 — Theme switching methods

Present two approaches. Label the first as the recommended default.

#### Approach A — Toggle the PF class directly (recommended)

The simplest method. Toggle `pf-v6-theme-dark` on the document root. RHDS components respond automatically through `color-scheme` inheritance.

```js
function setTheme(isDark) {
  document.documentElement.classList.toggle('pf-v6-theme-dark', isDark);
}

// Respect the user's OS preference
const mq = window.matchMedia('(prefers-color-scheme: dark)');
setTheme(mq.matches);
mq.addEventListener('change', (e) => setTheme(e.matches));
```

**What it does:** Adds or removes `pf-v6-theme-dark` on `<html>`. PF components see the class; RHDS components see the resulting `color-scheme` change. One toggle, both systems update.

#### Approach B — Use RHDS theme-switcher components

If the project uses `<rh-scheme-toggle>` or `<rh-scheme-dropdown>`, hook into their `scheme-changed` event to apply the PF class.

```html
<!-- Drop the RHDS switcher into your page -->
<rh-scheme-toggle></rh-scheme-toggle>
```

```js
document.addEventListener('scheme-changed', (event) => {
  const scheme = event.scheme;

  if (scheme === 'dark') {
    document.documentElement.classList.add('pf-v6-theme-dark');
  } else if (scheme === 'light') {
    document.documentElement.classList.remove('pf-v6-theme-dark');
  } else {
    // "system" — follow the OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('pf-v6-theme-dark', prefersDark);
  }
});
```

**What it does:** The RHDS switcher emits `scheme-changed` with a value of `"dark"`, `"light"`, or `"system"`. The listener maps that value to the PF class so both systems stay synchronized.

**Caveat:** These RHDS components set `color-scheme` directly on `<body>` and persist to `localStorage.rhdsColorScheme`. If you are also toggling the PF class separately (e.g., from a custom toggle button), the two can fall out of sync. Pick one switching method and stick with it.

---

### Section 3 — Components with theme caveats

List each component below with its name, what it does, and a usage example. Use this exact set:

#### PatternFly components

**`CodeEditor`**
Uses Monaco Editor internally. Monaco does not read the PF theme class — you must pass `isDarkTheme` explicitly.

```tsx
import { CodeEditor } from '@patternfly/react-code-editor';

<CodeEditor
  isDarkTheme={isDark}
  code={sourceCode}
  language="javascript"
/>
```

**`Hero`**
A banner component with support for background images. It reads the PF theme class for colors, but you must supply separate image props for light and dark backgrounds.

```tsx
import { Hero } from '@patternfly/react-core';

<Hero
  backgroundSrcLight="/images/hero-light.png"
  backgroundSrcDark="/images/hero-dark.png"
>
  <h1>Welcome</h1>
</Hero>
```

**Charts (ECharts-based)**
ECharts chart components need a `nodeSelector` prop to know where to look for the PF theme class. Without it, they cannot detect theme changes.

```tsx
import { Chart } from '@patternfly/react-charts/echarts';

<Chart
  nodeSelector="html"
  /* ...other chart props */
/>
```

#### RHDS components that force a theme

**`rh-footer`**
Always renders in dark theme regardless of the page theme. This is by design — Red Hat's design guidance recommends the footer stays dark.

```html
<!-- No theme override needed — always dark -->
<rh-footer></rh-footer>
```

**`rh-navigation-secondary-menu`**
Always renders in light theme regardless of the page theme.

```html
<!-- No theme override needed — always light -->
<rh-navigation-secondary-menu></rh-navigation-secondary-menu>
```

---

### Section 4 — Component-level theme overrides

Explain how to override the theme on a per-component basis in each system.

**PatternFly:** PF's dark theme is designed to apply to the entire page. There is no built-in per-component theme prop. To theme a section differently from the rest of the page, use custom CSS and design token overrides on a wrapper element.

**RHDS:** Several RHDS components support the `color-palette` attribute for per-component theme overrides. The available values are:

- `lightest`, `lighter`, `light`, `dark`, `darker`, `darkest`

List the components that support `color-palette`:

| Component | Example |
|-----------|---------|
| `rh-surface` | `<rh-surface color-palette="darker">` |
| `rh-card` | `<rh-card color-palette="lightest">` |
| `rh-accordion` | `<rh-accordion color-palette="dark">` |
| `rh-tabs` | `<rh-tabs color-palette="lighter">` |
| `rh-tile` / `rh-tile-group` | `<rh-tile color-palette="darkest">` |
| `rh-announcement` | `<rh-announcement color-palette="dark">` |
| `rh-blockquote` | `<rh-blockquote color-palette="light">` |
| `rh-disclosure` | `<rh-disclosure color-palette="darker">` |
| `rh-audio-player` | `<rh-audio-player color-palette="dark">` |
| `rh-footer-universal` | `<rh-footer-universal color-palette="darkest">` |
| `rh-navigation-primary` | `<rh-navigation-primary color-palette="dark">` |
| `rh-navigation-secondary` | `<rh-navigation-secondary color-palette="light">` |
| `rh-subnav` | `<rh-subnav color-palette="darker">` |

```html
<!-- Example: force a card to render in dark theme on a light page -->
<rh-card color-palette="dark">
  <h2 slot="header">Featured</h2>
  <p>This card renders dark regardless of the page theme.</p>
</rh-card>
```

---

## Output format

1. **Audit summary** — report what was found (theme toggle method, redundant mappings, missing props, conflicts)
2. **Changes made** — list each file changed and what was fixed
3. **Guide** — output the four sections above as text to the user, tailored to the project. Use `##` for section headings and `###` for component names. Every component entry must include:
   - **Name** — the element or component name, formatted as inline code
   - **Description** — one or two plain-language sentences explaining what the component does and why it matters for theming
   - **Example** — a minimal, runnable code snippet showing correct usage

Do not assume the reader knows PF or RHDS conventions. Define terms on first use. Do not write the guide to a file — output it as text.
