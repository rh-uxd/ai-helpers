---
name: pf-rhds-layout-gen
description: Generate layout code for embedding RHDS header and footer web components inside a PatternFly Page. Use when building a mixed PF+RHDS app shell, setting up a plain page layout, or adding full-height scrollable drawers with React.
---

# PF RHDS Layout Generator

Generate the layout scaffolding for a PatternFly page that uses Red Hat Design System (RHDS) web components for the header and/or footer. This pattern was established by the Red Hat Hardened Images team and is now supported natively in PatternFly Core and React.

Use the PatternFly MCP server as the primary source for up-to-date component APIs and prop signatures.

## Input

The user provides one of:
- A request for an RHDS `<rh-navigation-primary>` header or `<rh-footer>` inside a PatternFly `Page`
- A request to build a "plain page" layout
- A request to mimic Hummingbird or Red Hat Hardened Images layout with React
- A drawer that needs to span the full viewport height, positioned after content
- Any mixed PF+RHDS app shell setup

## Context Detection

Read `package.json` to detect dependencies. This skill requires `@patternfly/react-core` 6.7.0+ (which introduced `PageHeader`, `PageFooter`, `isPlain`, and `isViewport`). Check `dependencies`, `devDependencies`, and `peerDependencies`. If the version range is ambiguous, check `node_modules/@patternfly/react-core/package.json` for the installed version. In a monorepo, look for the nearest `package.json` that declares `@patternfly/react-core`. If `package.json` cannot be found, ask the user which PatternFly version they are using before proceeding.

Four gate states:

- **PF 6.7.0+ with RHDS** — all patterns (A–D) are available.
- **PF 6.7.0+ without RHDS** (no `@rhds/*` or `@red-hat-design-system/*` packages) — only Pattern D (full-height viewport drawer) is available, since it uses no RHDS components. For header, footer, or plain page requests, decline and tell the user to use `pf-project-gen` for standard PatternFly page layouts with `Masthead`, `PageSidebar`, and `PageSection`. Do not generate any layout code or mention any RHDS component names, element tag names, or RHDS package names.
- **PF below 6.7.0** — this skill does not apply regardless of whether RHDS is present. Decline and tell the user to upgrade `@patternfly/react-core` to 6.7.0 or later, which introduced `PageHeader`, `PageFooter`, `isPlain`, and `isViewport`. Do not generate any layout code.
- **RHDS only** (no `@patternfly/react-core`) — this skill does not apply. Decline and tell the user this skill requires `@patternfly/react-core` because it generates PatternFly `Page` layouts that embed RHDS components. Do not generate any layout code.

## How to Generate

1. Detect what the user needs — ask or infer from context:

   | Signal | Layout |
   |--------|--------|
   | "RHDS header" or `rh-navigation-primary` mentioned | Custom header wrapper |
   | "RHDS footer" or `rh-footer` mentioned | Custom footer wrapper |
   | "plain page" or "no PF chrome" | Plain page layout |
   | "full-height drawer" or "drawer after content" | Full-height scrollable drawer |
   | Multiple signals | Combine patterns |

2. Look up PatternFly layout components via MCP to confirm current prop signatures.
3. Generate the layout using the structure and rules below.

## Pattern A — Custom RHDS header in a PatternFly Page

PatternFly's `Page` component accepts a custom header wrapper so you can replace the default `Masthead` with an RHDS navigation component.

### What it does

Wrapping the RHDS `NavigationPrimary` React component in a `<PageHeader>` element and passing it to the `masthead` prop places the RHDS navigation at the top of the PF page shell while preserving PF's layout grid (sidebar, main content, sections).

### Example

```tsx
import { Page, PageHeader, PageSection } from "@patternfly/react-core";
import { NavigationPrimary } from "@rhds/elements/react/rh-navigation-primary/rh-navigation-primary.js";

function AppLayout({ children }) {
  const rhdsHeader = (
    <PageHeader>
      <NavigationPrimary>
        {/* RHDS nav slots go here */}
      </NavigationPrimary>
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

## Pattern B — Custom RHDS footer in a PatternFly Page

### What it does

The `footer` prop on `<Page>` accepts a custom footer element. Wrapping the RHDS `Footer` React component in a `<PageFooter>` and passing it places the RHDS footer at the bottom of the PF page, below all `PageSection` content.

### Example

```tsx
import { Page, PageFooter, PageSection } from "@patternfly/react-core";
import { Footer } from "@rhds/elements/react/rh-footer/rh-footer.js";

function AppLayout({ children }) {
  const rhdsFooter = (
    <PageFooter>
      <Footer>
        {/* RHDS footer slots go here */}
      </Footer>
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

## Pattern C — Plain page layout

### What it does

A "plain page" removes PatternFly's sidebar and default chrome. The page is a bare container that holds `PageSection` children. This is useful when both the header and footer come from RHDS and PF only manages the content area.

### Example

```tsx
import { Page, PageFooter, PageHeader, PageSection } from "@patternfly/react-core";
import { NavigationPrimary } from "@rhds/elements/react/rh-navigation-primary/rh-navigation-primary.js";
import { Footer } from "@rhds/elements/react/rh-footer/rh-footer.js";

function PlainLayout({ children }) {
  const rhdsHeader = (
    <PageHeader>
      <NavigationPrimary>
        {/* nav content */}
      </NavigationPrimary>
    </PageHeader>
  );

  const rhdsFooter = (
    <PageFooter>
      <Footer>
        {/* footer content */}
      </Footer>
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

No sidebar prop, no `Masthead`, no `PageToggleButton`. The `isPlain` prop removes the default content area background and overflow scroll, leaving the PF `Page` as a minimal grid container for section layout; RHDS handles the shell chrome.

## Pattern D — Full-height scrollable drawer

### What it does

PatternFly's `Drawer` can be positioned after content and stretch to the full viewport height. This is useful for detail panels in a PF+RHDS layout.

### Example

```tsx
import {
  Drawer,
  DrawerContent,
  DrawerPanelContent,
  Page,
  PageSection,
} from "@patternfly/react-core";

function LayoutWithDrawer({ children, drawerContent, isDrawerOpen }) {
  const panelContent = (
    <DrawerPanelContent>
      {drawerContent}
    </DrawerPanelContent>
  );

  return (
    <>
      <Page>
        <PageSection>
          {children}
        </PageSection>
      </Page>
      <Drawer isExpanded={isDrawerOpen} isViewport>
        <DrawerContent panelContent={panelContent} />
      </Drawer>
    </>
  );
}
```

The `isViewport` prop makes the drawer span the viewport. `DrawerContentBody` is optional in this case.

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

## Rules

**Imports:**
- Import RHDS components from `@rhds/elements/react/` (e.g. `NavigationPrimary`, `Footer`) — these are typed React wrappers built with `@lit/react` and work in `.tsx` without additional configuration
- If the project uses bare custom element tags instead, add a runtime side-effect import in the component file (e.g. `import "@rhds/elements/rh-navigation-primary/rh-navigation-primary.js";`) to register the custom element, and emit the type declaration block below

**Scope:**
- Do not add unrelated PF components — generate only the layout shell the user asked for
- Only create or modify the top-level layout file (e.g., `App.tsx`) — treat existing component files as opaque and import them as-is

### TypeScript declarations for bare custom elements

If the project uses bare `<rh-navigation-primary>` or `<rh-footer>` tags, or the user explicitly asks for them, emit a `declare global` block. RHDS augments `HTMLElementTagNameMap` but not `JSX.IntrinsicElements`, so without this TypeScript will error on the bare tags.

```tsx
// rhds.d.ts
import type * as React from "react";
import type { RhNavigationPrimary } from "@rhds/elements/rh-navigation-primary/rh-navigation-primary.js";
import type { RhFooter } from "@rhds/elements/rh-footer/rh-footer.js";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "rh-navigation-primary": React.DetailedHTMLProps<React.HTMLAttributes<RhNavigationPrimary>, RhNavigationPrimary>;
      "rh-footer": React.DetailedHTMLProps<React.HTMLAttributes<RhFooter>, RhFooter>;
    }
  }
}
```

Place this in a project-level `rhds.d.ts` file included by `tsconfig.json`. Only include the elements actually used.

## Output

Output a single, runnable component file. Include all necessary imports (PF React components and either RHDS React wrappers from `@rhds/elements/react/` or bare element side-effect imports with the `declare global` type block). Note any CSS overrides needed as a separate CSS block with comments. If the project uses TypeScript, output `.tsx` with proper typing.
