---
name: pf-rhds-layout-setup-react
description: >
  Generate layout code for embedding RHDS header and footer web components inside a PatternFly Page. Use when building a mixed PF+RHDS app shell, setting up a plain page layout, or adding full-height scrollable drawers with React.
---

# PF + RHDS Layout Setup

Generate the layout scaffolding for a PatternFly page that uses Red Hat Design System (RHDS) web components for the header and/or footer. This pattern was established by the Red Hat Hardened Images team and is now supported natively in PatternFly Core and React.

## When to use

- A project needs an RHDS `<rh-navigation-primary>` header or `<rh-footer>` inside a PatternFly `Page`
- Someone asks how to build a "plain page" layout
- Someone asks how to mimic Hummingbird or Red Hat Hardened Images layout with React
- A drawer needs to span the full viewport height, positioned after content
- Any mixed PF+RHDS app shell setup

## Gate check

Read `package.json`. This skill requires both `@patternfly/react-core` (6.x+) and at least one `@rhds/*` or `@red-hat-design-system/*` package. If only RHDS is present, this skill does not apply.

If only PF is present (no RHDS packages): generate a standard PF `Page` layout using `Masthead`, `PageSidebar`, and `PageSection`. Do not use or mention any RHDS component names, element tag names, or RHDS package names anywhere in your response — not in code, not in imports, not in explanatory notes or suggestions. The user's project cannot use those components, so referencing them adds confusion.

## What to generate

### Step 1 — Detect what the user needs

Ask or infer from context:

| Signal | Layout |
|--------|--------|
| "RHDS header" or `rh-navigation-primary` mentioned | Custom header wrapper |
| "RHDS footer" or `rh-footer` mentioned | Custom footer wrapper |
| "plain page" or "no PF chrome" | Plain page layout |
| "full-height drawer" or "drawer after content" | Full-height scrollable drawer |
| Multiple signals | Combine patterns |

### Step 2 — Generate the layout

Output a complete, runnable component. Follow the patterns below exactly.

---

## Pattern A — Custom RHDS header in a PatternFly Page

PatternFly's `Page` component accepts a custom header wrapper so you can replace the default `Masthead` with an RHDS navigation component.

### What it does

Wrapping `<rh-navigation-primary>` in a `<PageHeader>` element and passing it to the `masthead` prop places the RHDS navigation at the top of the PF page shell while preserving PF's layout grid (sidebar, main content, sections).

### Example

```tsx
import { Page, PageHeader, PageSection } from '@patternfly/react-core';
import '@rhds/elements/rh-navigation-primary/rh-navigation-primary.js';

function AppLayout({ children }) {
  const rhdsHeader = (
    <PageHeader>
      <rh-navigation-primary>
        {/* RHDS nav slots go here */}
      </rh-navigation-primary>
    </PageHeader>
  );

  return (
    <Page masthead={rhdsHeader}>
      <PageSection>
        {children}
      </PageSection>
    </Page>
  );
}
```

---

## Pattern B — Custom RHDS footer in a PatternFly Page

### What it does

The `footer` prop on `<Page>` accepts a custom footer element. Wrapping `<rh-footer>` and passing it places the RHDS footer at the bottom of the PF page, below all `PageSection` content.

### Example

```tsx
import { Page, PageFooter, PageSection } from '@patternfly/react-core';
import '@rhds/elements/rh-footer/rh-footer.js';

function AppLayout({ children }) {
  const rhdsFooter = (
    <PageFooter>
      <rh-footer>
        {/* RHDS footer slots go here */}
      </rh-footer>
    </PageFooter>
  );

  return (
    <Page footer={rhdsFooter}>
      <PageSection>
        {children}
      </PageSection>
    </Page>
  );
}
```

### Theme note

`<rh-footer>` always renders in dark theme regardless of the page theme. This is by design — Red Hat design guidance recommends the footer stays dark. No theme synchronization is needed for this component.

---

## Pattern C — Plain page layout

### What it does

A "plain page" removes PatternFly's sidebar and default chrome. The page is a bare container that holds `PageSection` children. This is useful when both the header and footer come from RHDS and PF only manages the content area.

### Example

```tsx
import { Page, PageFooter, PageHeader, PageSection } from '@patternfly/react-core';
import '@rhds/elements/rh-navigation-primary/rh-navigation-primary.js';
import '@rhds/elements/rh-footer/rh-footer.js';

function PlainLayout({ children }) {
  const rhdsHeader = (
    <PageHeader>
      <rh-navigation-primary>
        {/* nav content */}
      </rh-navigation-primary>
    </PageHeader>
  );

  const rhdsFooter = (
    <PageFooter>
      <rh-footer>
        {/* footer content */}
      </rh-footer>
    </PageFooter>
  );

  return (
    <Page isPlain masthead={rhdsHeader} footer={rhdsFooter}>
      <PageSection>
        {children}
      </PageSection>
    </Page>
  );
}
```

No sidebar prop, no `Masthead`, no `PageToggleButton`. The PF `Page` handles scroll management and section layout; RHDS handles the shell chrome.

---

## Pattern D — Full-height scrollable drawer

### What it does

PatternFly's `Drawer` can be positioned after content and stretch to the full viewport height. This is useful for detail panels in a PF+RHDS layout.

### Example

```tsx
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  Page,
  PageSection,
} from '@patternfly/react-core';

function LayoutWithDrawer({ children, drawerContent, isDrawerOpen }) {
  const panelContent = (
    <DrawerPanelContent>
      {drawerContent}
    </DrawerPanelContent>
  );

  return (
    <Page>
      <PageSection>
        {children}
      </PageSection>
    </Page>
    <Drawer isExpanded={isDrawerOpen} isViewport>
      <DrawerContent panelContent={panelContent} />
    </Drawer>
  );
}
```

The `isViewport` prop makes the drawer span the viewport.

---

## Combining patterns

When the user needs multiple patterns, compose them. A typical Red Hat Hardened Images–style layout combines all of these patterns.

```tsx
<>
<Page isPlain masthead={rhdsHeader} footer={rhdsFooter}>
  <PageSection>
    {children}
  </PageSection>
</Page>
<Drawer isExpanded={isDrawerOpen} isViewport>
  <DrawerContent panelContent={panelContent} />
</Drawer>
</>
```

## Output rules

1. Output a single, runnable component file
2. Include all necessary imports (PF React and RHDS element side-effect imports)
3. Note any CSS overrides needed as a separate CSS block with comments
4. If the project uses TypeScript, output `.tsx` with proper typing
5. Do not add unrelated PF components — generate only the layout shell the user asked for
6. Only create or modify the top-level layout file (e.g., `App.tsx`). Treat existing component files (headers, footers, drawers, etc.) as opaque — import and compose them as-is without editing their internals or markup
