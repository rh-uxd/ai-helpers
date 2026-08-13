---
name: pf-screenshot-mapping
description: Maps screenshots and UI mockups (any fidelity) to PatternFly 6 layout and building-block components. Output uses PF Component Mapping (regions, PF6 direction including structure and behavior, doc links) and PF Gaps & Recommendations (structural gaps/stretches and design-system follow-ups). Omits branding and visual styling (logos, colors, typography, border radius, shadows, component shape). Use when the user shares a UI image or asks whether a screen can be built with PatternFly, which PatternFly components to use, or for a PatternFly component pass on a wireframe, lo-fi, or third-party UI reference.
---

# PatternFly screenshot → components (PF6)

## Goal

Decompose a **screenshot or static UI image** into **PatternFly 6** structure and **core building blocks**. Outputs are for **layout/component coverage** only: **what regions exist and which PF components carry that structure/behavior**. Do **not** describe or judge **how the reference UI looks** (theme, shape, density as aesthetics, polish). Visual treatment is assumed to come from the product’s **PatternFly theme/tokens**, not from copying the screenshot.

**Two-part output:** **PF Component Mapping** answers *what’s on the screen* and *which PatternFly pieces carry each region* (structure and behavior, plus **doc links** for build alignment). **PF Gaps & Recommendations** answers *where coverage is thin*—composition-heavy areas, missing primitives, or missing guidance—and suggests **concrete follow-ups** for the library and docs (not visual critique of the reference).

## Version alignment (do this first)

1. **Default:** All suggestions target **PatternFly 6** (`@patternfly/react-core` 6.x and related packages). Prefer current APIs and names from [patternfly.org](https://www.patternfly.org) and [@patternfly/react-core releases](https://github.com/patternfly/patternfly-react/releases).
2. **If a project workspace is open:** Read `package.json` (and lockfile if needed) for `@patternfly/react-core`, `@patternfly/react-table`, `@patternfly/react-charts`, etc. State those versions in one line at the top of the answer so mappings match the product.
3. **If no versions are available:** Say explicitly that guidance follows **public PatternFly 6** docs as of the analysis date, and that the team should verify against their pinned versions.
4. **When unsure of a v5 vs v6 name or API:** Prefer checking [PatternFly 6 upgrade / breaking changes](https://www.patternfly.org/get-started/upgrade/release-notes) over guessing.

## In scope

- **Layout regions:** app shell (sidebar, masthead, main), columns, card grids, scroll areas, split layouts.
- **Navigation patterns:** vertical/horizontal nav, groups, active item, overflow.
- **Surfaces:** cards, lists, tables, toolbars, drawers/modals/wizards **if clearly present**.
- **Building blocks:** buttons, dropdowns/menus, labels/badges for status, pagination, tabs, forms, empty states, alerts, dividers.
- **Icons:** only as **semantic affordances** (e.g. “nav item with leading icon”, “toolbar icon button”). Do not prescribe matching artwork.

## Out of scope — do not analyze, compare, or recommend based on these

Treat the following as **irrelevant** to mapping unless the user explicitly asks for a theming pass (if they do, answer in one short paragraph and still deliver **PF Component Mapping** and **PF Gaps & Recommendations**):

- **Brand:** logos, wordmarks, mascots, marketing illustration.
- **Color & type:** palette, gradients, font family/size/weight, text color for mood.
- **Surface styling:** border radius / “rounded corners,” corner treatment, pill vs square **shape language**, shadow/elevation, border weight/style, background tints “for depth,” glass/blur effects.
- **Decorative composition:** “generous whitespace,” “soft UI,” “card lift,” “neumorphic,” “playful” shapes—unless tied to a **structural** pattern (e.g. “two-column layout,” “sidebar + detail,” “stacked sections”).
- **Emoji** and decorative glyphs unless they change **information structure** (they almost never do).

## Forbidden language in tables and prose

Do **not** write (in **PF Component Mapping**, **PF Gaps & Recommendations**, or surrounding bullets) any of the following about the reference image, unless the user explicitly asked for styling notes:

- Border radius, rounded corners, squircle, pill shape, chip shape, “soft” edges.
- Shadow, elevation, z-index feel, “floating” cards, depth, glow.
- “Pill buttons,” “fully rounded,” “square vs round” **as visual advice** (semantic control type is OK: e.g. “primary action control” → `Button`; do not describe its silhouette).
- Spacing or density **as design critique** (“airy,” “cramped,” “tight”)—prefer **structural** terms: number of columns, list vs grid, presence of a toolbar row, etc.

**Allowed:** layout topology (1 vs 2 columns, grid of cards, header above content), component **role** (navigation, status, primary action), **behavior** (expandable, selectable rows, overflow menu), **information hierarchy** (section title + supporting list).

## Self-check before sending

Remove or rewrite any phrase that comments on **appearance** or **theme**. If a sentence mentions radius, shape, shadow, color, font, or “look/feel,” delete it or replace with a **structural** statement (regions, components, behaviors).

## Analysis steps

1. **Scan** top → bottom, outside → in: chrome vs page content vs overlays.
2. **Name regions** neutrally (e.g. “left vertical nav”, “main header strip”, “two-column card row”).
3. **For each region**, choose **PatternFly primitives or well-documented compositions** (e.g. `Page` + `PageSidebar` + `Nav`, `Toolbar`, `DataList`, `Table`, `Card`).
4. **Collect doc links** for **PF Component Mapping**: every row’s docs column must use real URLs (see **Documentation links** below). Prefer one link per distinct **top-level** doc page; related pieces documented together (e.g. `Page` + sidebar) may share a single **Page** link. Lead with **neutral region names**; put **what the area does** (IA, hierarchy, primary actions, navigation role—**structure/behavior only**) inside the **PatternFly 6 direction** column together with component names, so the mapping stays scannable without a separate prose column.
5. **Separate** “maps cleanly to a component or documented pattern” (**PF Component Mapping**) from “needs composition, extension, or missing first-class component” (**PF Gaps & Recommendations**).
6. **Extensions:** If the UI clearly needs charts, mention `@patternfly/react-charts` in the mapping table, not as a gap unless the question is core-only.
7. **Strip style:** Apply the **Self-check** pass; **PF Gaps & Recommendations** must not list “gaps” that are purely visual (e.g. “more rounded cards”)—reframe or omit.

## Required output format

Open with **one line**: PF6 + optional pinned package versions from the repo.

Then **exactly two tables** (markdown). No merging into one table. Use these **section headings verbatim** before each table so readers can tell them apart: **PF Component Mapping**, then **PF Gaps & Recommendations**.

### PF Component Mapping

Region-by-region **PatternFly 6** coverage: what appears on the screen, how PF components and patterns represent it (**structure and behavior**—fold IA and hierarchy into the direction column, not visual styling), and **authoritative doc links** for implementation alignment.

#### Documentation links (required)

In the **PatternFly docs (links)** column, list **markdown links** to official documentation. Use **full HTTPS URLs** (no shortened links).

**Core React components (`@patternfly/react-core` and related layout/components on the same site):**

- Base pattern: `https://www.patternfly.org/components/<slug>/`
- Derive `<slug>` from the component’s public name: **lowercase**, **spaces → hyphens**. Verified examples: `Page` → `page`, `Data list` → `data-list`, `Navigation` → `navigation`, `Masthead` → `masthead`, `Button` → `button`, `Table` → `table`.
- Use the authoritative name list on [All components](https://www.patternfly.org/components/all-components/) when the slug is ambiguous or a URL might not resolve; follow the same hyphenation as that page, or use site search and paste the **resulting** component URL **verbatim** (do not guess).

**Charts (`@patternfly/react-charts`):**

- Overview: [About charts](https://www.patternfly.org/charts/about-charts)
- Specific chart types: `https://www.patternfly.org/charts/<chart-slug>/` (e.g. `bar-chart`, `donut-chart`). Prefer the chart type that matches the UI.

**Table package (`@patternfly/react-table`):**

- Link to [Table](https://www.patternfly.org/components/table/) for `Table` / table patterns delivered from that package.

**Extensions or packages without a patternfly.org component page:**

- Link to the package on npm (e.g. `https://www.npmjs.com/package/@patternfly/react-component-groups`) **or** the extension’s official doc/repo URL if the team uses one—pick one canonical link per package.

**Cell format**

- Use semicolon-separated markdown links, e.g. `[Page](https://www.patternfly.org/components/page/)`; `[Navigation](https://www.patternfly.org/components/navigation/)`.
- Include **only** components that are actually recommended for that row (typically **3–8** links; avoid listing every possible sub-export).

| Region or pattern on the screen | PatternFly 6 direction | PatternFly docs (links) |
|--------------------------------|------------------------|-------------------------|
| … | Named PF components/patterns (**v6** names and APIs) **and** a concise structural read of the region: hierarchy, primary actions, navigation role, selection, overflow, etc.—**structure/behavior only** (no radius, shadows, shapes, colors) | `[…](https://www.patternfly.org/components/…/)`; … |

Use **one row per distinct structural region or repeating pattern** (not per pixel). Prefer **v6 names** (`Content` over legacy `Text`/`TextContent` patterns, `Page` `masthead` prop, `NavItem` `icon` prop, `Label` over deprecated `Chip`, `Card` for deprecated tile-style KPIs, etc.). The **direction** cell must read like an **IA/engineering** note that names the right PF pieces—not a visual design review.

### PF Gaps & Recommendations

Structural mismatches only: where **PatternFly coverage** is incomplete, awkward, or undocumented, and **suggested follow-ups** (documentation, examples, core pattern, extension package, or “compose with primitives”). Rows should be **triage-ready** for backlog or design–dev discussion—not generic criticism of the reference UI.

| Region or pattern on the screen | Type | Why it matters (coverage) | Suggested next step | Notes (optional) |
|--------------------------------|------|----------------------------|---------------------|------------------|
| … | `gap` \| `stretch` \| `docs gap` \| `extension` | e.g. no single first-class story, heavy bespoke composition, ambiguous primitive choice, recurring cross-product pattern | e.g. pattern doc + example, design kit alignment, core issue/RFC candidate, extension/npm story, clarify recommended composition | Partner products, frequency, or open questions |

**Rules for PF Gaps & Recommendations**

- Include only **structural or component-coverage** issues—not branding, **not** theme, **not** shape/radius/shadow/spacing aesthetics.
- **Type (use one label per row):**
  - **gap** — No satisfactory first-class component or documented pattern; likely **library or pattern** work if the pattern repeats across products.
  - **stretch** — Achievable by **composition** or small custom layout, but no single obvious primitive; PF might still add a **recipe or example** to reduce reinvention.
  - **docs gap** — The building blocks exist but **guidance or a worked example** is missing.
  - **extension** — Best home is an **extension package** (e.g. charts, component-groups) or **non-core** surface; link accordingly in the next-step column when helpful.
- If the UI maps cleanly everywhere, state that briefly and use a **minimal** second table (e.g. one row: “No structural coverage issues identified”) rather than inventing work.
- Do **not** assert official PatternFly roadmap; phrase recommendations as **suggestions** to validate.

## Tone

Concise, neutral, and actionable. Do not claim pixel parity with the reference UI. Do not steer the reader toward **matching** the screenshot’s styling—only its **structure** and **component roles**.
