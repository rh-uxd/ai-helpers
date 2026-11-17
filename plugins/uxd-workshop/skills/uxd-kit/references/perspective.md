# Perspective — operate from centralized capability

[SKILL.md](../SKILL.md) is the operational checklist; this is the lens. Examples use the placeholder prefix `Kit` / `kit-c-*`.

## One principle, two scales

**The return is the spec.** Structure is visible in JSX; data is in slots above.

**Code efficiency** = capability centralized (one harness, one config, one integration) and configured at call sites — not reimplemented per page.

## Three-tier kit

`components/` is the domain. Within it, two structural tiers:

| Tier | What it is | Examples |
| ---- | ---------- | -------- |
| **Primitive** | One configured PF host | `KitButton`, `KitCard`, `KitMenu`, `KitPopover`, `KitTooltip`, `KitEmptyState`, `KitSkeleton` |
| **Assembly** | Multi-region slots; uses primitives | `KitPageHeader`, `KitButtonGroup`, `KitDataView`, a metrics family |

**Primitive test (all three):** A — single unit, one PF host as tree root. B — not a special composition; standard presentation of that control. C — PF-shaped; the same job PatternFly already names.

Kit-owned props on that host (`label`, `isBusy`, `items`, `fieldLabel` on a menu) configure the base unit. They are **additive**: new names PF does not use. The kit never renames, reinterprets, or replaces a PF prop; PF props pass through untouched. The one exception is a superset: a kit prop may reuse a PF prop's name (`status` on `Label`) to extend that concept through config, provided PF's own values are still accepted. Aliases that only re-label PF values are refused. Kit extends PF patterns through configuration; it does not reimplement them. They do **not** promote it to an assembly — kit invention ≠ assembly. A menu toggle and its menu are one primitive; secondary PF pieces required by a host slot (MenuToggle via Dropdown `toggle`) stay inside the harness, and pure PF knobs use a props bag (`toggleProps`).

**Promotion rule:** a primitive becomes an assembly when it owns a multi-region slot contract (title / description / actions that rearrange chrome) or begins composing other `Kit*` units.

**Layout assemblies** (`KitButtonGroup`) arrange call-site children only. The call site passes N controls; the assembly never hard-codes a product's slots.

**Domain wiring** (tables, column catalogs, pipeline views) is not a kit tier. It stays with the product until it earns extraction. Never call domain code an "assembly" in kit paths.

**Chrome vs domain:** product surfaces compose kit roots for PF hosts. Domain may own fetch, copy, and item builders — not product-named chrome shells (`SlaInfoPopover`). Replace usages first; leave dead domain files untouched until a [dissolution sweep](examples.md#migrate-then-dissolve). Centralize icon-help: the tooltip primitive defaults its trigger to a circle `KitButton`; richer content is a popover + circle button at the call site. `EmptyState` / `Skeleton` are root-only kit hosts — subregions stay call-site composition until a second surface earns a kit job.

**PF host by name:** when a request or PF docs name a component, that is the host. List and Description list are different primitives; do not substitute a close sibling.

**New primitive defaults:** ship an empty config entry (PF default pattern). Variants (`isPlain`, `isCompact`, `inline`) are call-site opt-ins until ≥2 surfaces share a baseline.

**Domain copy hydration:** product strings and JSX rows live in domain code (`.tsx` when JSX is needed, not `constants.ts`) and pass in as `items` / slot props. The kit stays product-agnostic.

## Config cascade

Prop defaults and presentational defaults travel on **parallel tracks**; do not collapse them into one format.

**Prop / behavior track (TypeScript)**

| File | Role |
| ---- | ---- |
| `kit.config.ts` | Tenant root — brand identity, CSS and export prefixes, palette intent |
| `components.config.ts` | Prop defaults for primitives and assemblies; `mergeComponentProps`, `mergeClassNames` |
| `Kit*` root | Call-site props win; `className` / `style` merge |

Add to tenant config when a value is shared across domains. Add to `components.config.ts` only for a component-specific **prop** default **and** an existing shared baseline. Never put presentational spacing in TS as utility-class strings, and never put tenant identity in `components.config.ts`. **No YAML** — it would need a build step and fork the cascade.

**Presentational track (CSS)**

| File | Role |
| ---- | ---- |
| `kit.config.css` | Tenant baseline — shared chromatic scales |
| `components.config.css` | Domain defaults — title type, field label, shared control gaps; header comment holds the PF breakpoint rem map |
| `<family>.config.css` | Family tokens (e.g. page padding, chrome-slot gap) |
| Co-located `*.css` | Unit-only rules; **consume** tokens, do not re-declare |

Padding, font-size, font-weight, and spacers belong in CSS custom properties, not TS config. Utility classes (`spacing.*`, `pf-v6-u-*`) are a last resort for a true one-off.

**PF breakpoints:** PF defines them as SCSS, so `@media` cannot use them or `--pf-t--global--breakpoint--*`. Copy the **rem** value from the single project map and label the query (`/* xl */`). No `px` — `1200px` is not `75rem` if the root font size is not 16px.

### Base support, not exotic selectors

Unit CSS declares **base support** — what the surface *is* (padding, flex column, gap, align). Exotic CSS encodes layout *situations* in the selector: deep `:has()`, `:nth-child()`, `:first-child`, `:not(:only-child)` stacks that infer intent from DOM order. It is fragile, contextual, unnecessary, overly complex, noise, and confuses concepts. When a variant earns a name, use an explicit class or prop; do not hide policy in combinators.

## Logic passthrough

Every `Kit*` is a **logic harness**, not a DOM wrapper.

| Mode | When | Result |
| ---- | ---- | ------ |
| **Passthrough** | Caller passes `children` / `content` | Interior is the caller's tree; harness merges defaults onto the host |
| **Slot build** | Owned args set; no full interior | Harness builds the known interior |
| **Minimal shell** | Neither | Empty / empty-state interior per contract |

Children win for full composition; slot args build when the caller wants the kit outline. Do not invent a third mode per assembly. One job per assembly: a surface pre-config on the same grammar (`hero`) is not a second job; two unrelated contracts is how God components form.

### One page header; hero is surface

PF has no page-header, so the kit invents **one** `KitPageHeader`. PF `Hero` is the host when `hero` is set — surface pre-config, not a second assembly.

| | Plain | Hero (`hero`) |
| - | ----- | ------------- |
| Host | `Flex` | PF `Hero` |
| Classes | `kit-c-page-header` | `kit-c-page-header` + `kit-c-page-hero` |
| Composition | `children` **or** `title` / `description` / `actions` | identical |

Hero leaves PF Hero padding alone; plain mirrors it via shared page tokens. Do not invent region props (`hasAside`, `hasChromeRows`); call sites compose chrome-slot components.

## Rule 0 — nodes must earn their place

Wrappers add a node without adding a job. **Expedient** (editor speed over document cost), **inert** (no semantic or layout job), and **ceremonial** (structure for code readers, not the UI contract) wrappers are refused.

| | Meaning |
| - | ------- |
| **Logic wrap** | Function resolves defaults, maps domain → PF props, hydrates owned slots as children |
| **DOM wrap** | Extra host around the PF component — refused |

The tree root is the PF host (or the kit host when PF has no equivalent). `className` and passthrough args apply on that host. PF's own internal structure (`Hero` → `__body`) is not a kit wrapper. Flex/grid format direct children, so extra `div`s re-parent content and break `gap`, sticky, and `overflow`.

### Layout in assemblies — slots first, PF layout second

The order is: **slots first, PF layout (`Flex`, `Grid`) second.** Slots are meant to carry presentational modifiers such as layout and context, so layout stays declarative at the slot rather than scattered through JSX props. The slot concept is **not yet mature** and will need work; where a slot doesn't fit yet, use PF layout and flag where a slot would have fit. Co-located CSS still carries paint and spacing from tokens.

Uniform wrappers are the cost to avoid:

| Cost of identical `FlexItem` wrappers | Detail |
| ---- | ------ |
| DOM nodes | Every `FlexItem` is an extra host; Rule 0 refuses it unless it has a job |
| Class matching | PF modifier classes (`pf-m-gap-sm`, …) are evaluated on every repaint of the subtree |
| Spec opacity | Layout intent scattered through JSX props, invisible from CSS and DevTools |

JSX shows *what* is in the component; slots and tokens show *how* it is arranged.

**`FlexItem` earns its place only with a per-child override.** CSS flex already promotes direct children to flex items.

| Justified | Not justified |
| --------- | ------------- |
| `flex: 1` growth ratio | Pass-through with no props |
| `flex-shrink: 0` | Same wrapper on every sibling |
| Individual `align-self` | "Structure for readability" |
| `flex-basis` / `min-width` on one child | Identical wrapper on all siblings |

A uniform wrapper is dead weight: 5–10 lines of CSS govern every instance, while N `FlexItem`s scale to hundreds of modifier-class nodes. See the [before/after trace](examples.md#flexitem-beforeafter).

**Intrinsic size:** no `width: 100%` / `height: 100%` unless filling a known containing block is the explicit job. Prefer natural flow, flex/grid growth, or `min-width` tokens.

## Same pattern on every surface

| Surface | Harness (once) | Consumers configure |
| ------- | -------------- | ------------------- |
| Prop defaults | `components.config.ts` | passthrough on `Kit*` |
| Presentational defaults | `components.config.css` → family config | tokens / unit CSS |
| Primitive | `KitButton`, `KitMenu`, … | props on one host |
| Assembly | `KitPageHeader`, metrics, … | slots or children |
| Page / domain | async outline + wiring | assembly slots + product data |

One source, many consumers. Find the harness; do not fork. `ouiaId`, error boundaries, and telemetry belong **once** in the harness via `mergeComponentProps`.

## Assembly completeness — hydrate, don't implement

**The test:** a page configures an assembly using only hydration — data, flags, domain copy. If a page writes presentational or interaction logic (active-state derivation, sort reordering, panel-expand state, toolbar assembly, filter wiring), the assembly is unfinished. Extend the assembly; do not let the page compensate.

A data-view assembly is the flagship case: the page hands it rows, columns, and the few domain decisions only the page can make; the assembly owns loading/empty derivation, sort, pagination chrome, panel state, and toolbar layout. A page hand-rolling a breakpoint effect, raw PF filter wiring, or its own active-state is a kit gap wearing a page's clothes.

**Convergent reimplementation is a signal.** When independent consumers write the same workaround for the same gap, the capability belongs in the assembly. Three pages with three copies have one problem.

**Finish before you re-point.** Do not move a consumer onto an assembly before the capability it needs is complete there. Early re-pointing *manufactures* page-local logic, which the next consumer copies as "the pattern." Build the capability first, documented; the re-point should then be a near-mechanical diff — delete the bespoke block, pass data.

**Boundary while building:** a kit effort touches only the kit and the page consuming it. A non-kit module the page already imports is not fair game for new logic. UI capability goes in the kit; page-specific logic in the page; logic that is a genuine domain concern shared across pages may live in a product-owned domain module.

## Summary

1. Return is the spec.
2. Rule 0 — refuse expedient/inert/ceremonial DOM; logic wrap ≠ DOM wrap.
3. Three tiers — primitive (A/B/C) → assembly → page/domain.
4. Config cascade — TS for props, CSS for presentation, no YAML.
5. Logic passthrough — children compose; slot args build; one cascade per assembly.
6. One page header — hero is surface pre-config.
7. Domain wiring is not a kit tier.
8. Assembly completeness — pages hydrate, they do not implement.

Name the resource, not the consumer.
