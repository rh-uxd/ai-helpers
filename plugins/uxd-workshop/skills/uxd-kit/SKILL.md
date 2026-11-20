---
name: uxd-kit
version: 0.1.0
description: >-
  Operating perspective for building a PatternFly-based UI kit — return-as-spec
  JSX, Rule 0 (nodes earn their place), three-tier kit (primitive → assembly →
  page/domain), config cascade (TS props + CSS presentational), logic
  passthrough, and base-support CSS. Use when authoring or refactoring JSX,
  pages, kit primitives or assemblies, wrappers around PatternFly components,
  configured statuses (LabelStatus), or when the user mentions scaffold,
  outline, code efficiency, passthrough, or centralized capability.
audience: "Front-end engineers and UX engineers building or consuming a shared component kit"
inputs: "A page, component, or refactor to author or review, plus the project's kit location and export prefix"
outputs: "Kit-conformant JSX/CSS, a tier and placement decision, or a review against the checklist"
---

# UXD Kit

A **perspective** — how to operate, not only what to check. Examples use the placeholder export prefix `Kit` (`KitButton`) and CSS prefix `kit-c-*`; substitute the project's own.

## Read first

This skill defines the architecture. Existing code conforms to it, not the reverse. Read [references/perspective.md](references/perspective.md) before reasoning about code, then evaluate code through that lens. When the skill and existing code disagree, the skill wins. Traces and refactor steps: [references/examples.md](references/examples.md).

**Project setup:** locate the kit root (commonly `src/kit/`), its README, and the export prefix. If the prefix is unset or unclear, ask before doing shared kit work. Adapt every path below to the project.

## Principles

- **The return is the spec.** Structure is visible in the JSX return; data arrives in slots above it.
- **Centralize capability, configure at call sites.** Pay the PatternFly integration once in a `Kit*` harness plus config. Kit **extends** PF through configuration (e.g. `status={LabelStatus.remediated}`, with statuses defined in kit config); it never reimplements or remaps PF.
- **Pure PF passthrough.** PF props pass through untouched — never renamed, reinterpreted, or shadowed. Kit-owned props are additive: new names that PF does not use (`isBusy`, `items`, `fieldLabel`). One exception: a kit prop may reuse a PF prop's name (`status` on `Label`) only to **extend** that concept through config, and PF's own values must still be accepted. Defaults come from config, not code.
- **Rule 0 — nodes earn their place.** Refuse wrappers that add a DOM node without a job.
- **Logic wrap ≠ DOM wrap.** `KitFoo` configures and returns `<Foo>`; it never inserts a host around the PF root.

## Three-tier kit

| Tier | Role | Typical path |
| ---- | ---- | ------------ |
| **Primitive** | One PF host + kit config | `components/primitives/` |
| **Assembly** | Multi-region slots; uses primitives | `components/assemblies/` |
| **Page / domain** | Product outline + data wiring | app pages; stays with product until extracted |

Primitive test (all three): **A** single unit (one PF host as tree root), **B** standard presentation, **C** PF-shaped control. Kit-owned props on that host (`isBusy`, `items`) are configuration, not promotion. A primitive becomes an assembly only when it owns a multi-region slot contract (e.g. title + body + footer slots) or composes other `Kit*` units. Domain wiring is not a kit tier.

## Config cascade

```
kit.config.ts                  ← tenant root (brand, prefixes, palette)
  └── components.config.ts     ← prop/behavior defaults (mergeComponentProps)
kit.config.css                 ← tenant presentational baseline
  └── components.config.css    ← domain presentational baseline (padding, type)
        └── <family>.config.css  ← family overrides (e.g. page)
              └── Kit* roots   ← merge props; co-located unit CSS
```

**Helpers:** `mergeClassNames` and `mergeComponentProps` live in `components.config.ts`. Import them from there; do not invent a utils path.

TS = props. CSS = paint and space. No YAML. New units start with an **empty** config entry (PF default pattern); add variant defaults only once ≥2 call sites share a baseline.

## Before you write

1. Does this node earn its place? (Rule 0)
2. Does PF already own this? Subtract.
3. **Which PF host, by name?** Match the component the user or docs named (List ≠ Description list).
4. Primitive or assembly? (A/B/C test)
5. Does a harness exist? Configure it; do not copy the PF tree.
6. Is a PF prop being renamed, reinterpreted, or shadowed? Refuse, unless the kit prop is a config-driven **superset** (PF values still accepted). Otherwise add a new-named kit prop and drive it from config.
7. A second job on an existing assembly? Split it (anti-God).
8. Prop default (TS) or presentational (CSS)?
9. Is the return still the spec?
10. Layout intent (justify / align / gap / direction) known? **Ask** if unstated; do not assume. If you cannot ask, state the assumption first and flag it for confirmation.
11. Base support or exotic CSS? Refuse situational `:has` / `:nth-child` policy stacks; use an explicit class or prop.
12. Layout inside an assembly: **slots first, PF layout (`Flex` / `Grid`) second.** Slots carry presentational modifiers such as layout and context. The slot concept is not yet mature; when a slot doesn't fit, use PF layout and flag where a slot would have fit. Never wrap every child in an identical `FlexItem`.

PF Flex breakpoint props take enum strings, not CSS keywords: `justifyContentCenter`, not `center`. Invalid values silently apply no class.

## Logic passthrough (`Kit*`)

Same grammar for primitives and assemblies:

| Priority | Condition | Behavior |
| -------- | --------- | -------- |
| 1 | `children` / `content` provided | **Passthrough** — caller owns the interior |
| 2 | Owned slot args (`title`, `description`, …) | **Slot build** — harness builds the interior |
| 3 | Neither | **Minimal shell** — empty / empty-state per contract |

```tsx
// ✅ Logic wrap — host is the tree root; className lands on it
export function KitPageHeader({ hero, title, children, className, ...rest }: Props) {
  const content = children ?? /* title / description / actions slots */;
  const Host = hero ? Hero : Flex;
  return (
    <Host {...mergeComponentProps(defaults, { ...rest, className: mergeClassNames('kit-c-page-header', className) })}>
      {content}
    </Host>
  );
}

// ❌ DOM wrap — extra host; className lands on the wrong node
export const KitPageHeader = (props) => (
  <div className="kit-c-page-header"><Hero {...props} /></div>
);
```

| Allowed | Refused |
| ------- | ------- |
| Merge config defaults; add kit-owned props with new names; pass every PF prop through untouched | Extra `<div>` / layout host around the PF root; renaming, reinterpreting, or shadowing a PF prop |
| Owned slots as children of the host | Re-parenting the host under kit chrome |
| Assembly using kit primitives in slots | Ceremonial wrappers "for readability" |
| `className` merged onto the host root | Kit styles that assume a wrapper |
| Surface pre-config on one grammar (`hero`) | Region props / second assembly forking the cascade |

**Passthrough, not remap:** the kit never remaps an existing PF prop. A kit-owned prop must use a name PF does not (`isBusy`, `items`); if a slot name collides with a PF prop (`title` on `Card`), pick another name unless the superset exception below applies. PF knobs for secondary pieces go in a props bag (`toggleProps={{ variant: 'secondary' }}`), not renamed twins like `toggleVariant`. Secondary PF pieces required by a host render-prop (Dropdown `toggle` → MenuToggle) stay inside the harness.

**Extend through configuration:** shared presentation (status → color, icon) is defined once in kit config as a named set (`LabelStatus`) and selected with an additive prop (`status`). An explicit PF prop (`color`) still passes through and is not overridden by the kit.

**Superset exception:** a kit prop may reuse a PF prop's name only to extend that concept through config. PF's own values must still be accepted, so the kit prop is a superset (`status` accepts `LabelStatus.remediated` *and* PF's `success` / `warning` / `danger` / `info` / `custom`), never a replacement (`Omit<LabelProps, 'status'>` that drops PF's values is a finding).

**No aliases:** a configured set or additive prop must carry meaning PF does not already express. A set that only re-labels PF values (`kind: 'primary' | 'danger'` for `variant` / `isDanger`, or an `isColumn` that only sets `direction`) is a twin of the PF prop and is refused.

## Layers

| Layer | Owns | Does not own |
| ----- | ---- | ------------ |
| Primitive | One PF host, kit props, maps, defaults | Multi-region chrome, other `Kit*`, fetch |
| Assembly | Multi-region slot grammar, primitives inside | Route params, direct service calls |
| Page / domain | State, async branches, catalogs, copy | Inline PF config; UI capability an assembly owns |

Scaffolding (sections, headings, layout, conditionals, ARIA) is visible in the return. Hydration (flags, copy, API data, row builders) sits above it and injects slots. Do not invert. No `features/` layer.

## Assembly completeness

A page configures an assembly with **hydration only** — data, flags, domain copy — never presentational or interaction logic (active-state derivation, panel state, filter wiring). If independent pages reimplement the same workaround, the capability belongs in the assembly. **Finish the assembly before re-pointing a consumer onto it**; re-pointing early manufactures page-local logic that the next consumer copies. New UI capability goes in the kit or the page, never into a pre-existing non-kit file just because it is already imported. Genuinely shared domain logic may live in a product-owned domain module.

## Process

`propose → dry-run → review → consensus → change → validate`. No edits until consensus. Use `git mv` for renames and rehomes. Refactors preserve behavior: when reviewing existing code, do not add wrapping, alignment, renames, or new props; propose those separately. Validate with build, tests, and a smoke check of affected routes — structure review without a smoke check is incomplete.

## CHECK FIRST

Before adding a file, wrapper, hook, or DTO: search for an existing primitive, assembly, PF component, or helper; pick the tier; **extend** props/config before creating a file; use `ref` / `className` / `style` on the existing host rather than a wrapper; subtract PF-owned fields from types; state relevance in one sentence — ≥2 consumers or delete.

| Impulse | Move |
| ------- | ---- |
| `color="orange"` repeated across pages | Add a configured status set (`LabelStatus`) in kit config; pages pass `status=…`. PF `color` stays untouched |
| Dropdown/MenuToggle tree copied into a page | Reuse or extract a menu primitive; domain keeps handlers |
| Kit props on one PF host (`isBusy`, `items`) | Stay primitive |
| Tenant token / brand value | Tenant config |
| Component prop default | `components.config.ts` |
| Presentational default (padding, type) | `*.config.css` or unit CSS |
| Reach for `spacing.*` / `pf-v6-u-*` utilities | Stop — last resort; write co-located CSS with tokens |
| Layout inside an assembly | Slots first, PF layout second; `FlexItem` earns a place only with a per-child override (growth, shrink, `align-self`, basis) |
| Exotic `:has` / `:nth-child` layout policy | Base-support CSS; explicit class/prop for variants |
| `@media` with `px` or a CSS var for a PF breakpoint | Use the project's rem breakpoint map; label the query (`/* xl */`) |
| Header needs a different surface | Pre-config on the one component (`hero`), same grammar |
| Body loading collapses chrome | Keep the shell mounted; load inside the body |
| Metric/count that can grow large | PF `Truncate` — container truncate + `min-width: 0` for stacked cells; `maxCharsDisplayed` only for single-line inline runs |
| Product-named chrome shell | Compose kit roots at the call site; replace usages; do not promote the wrapper ([dissolution](references/examples.md#migrate-then-dissolve)) |
| Product copy / JSX item arrays | Domain hydration in `.tsx`; pass `items` into the kit, which stays product-agnostic |
| ≥2 consumers hand-roll the same workaround | Promote the capability into the assembly |

## Authoring

**Return-as-spec:** one return; flags and hydration above, structure below. Forbidden: `introContent` / `tailContent` variables, duplicated scaffold across early returns, click-time structure injection, whole-section variables, `introBlocks` from parsers.

**Naming:** `{exportPrefix}{Type}`; type-first files (`page-header/page-header.tsx`); name the resource, not the consumer (`KitCard`, not `KitStatusCard`; `KitMenu`, not `KitExportMenu`). Related units share a family prefix (`KitMetricsCount`). **The prefix is reserved for kit exports:** a product composition that isn't in the kit is unprefixed (`StatusCard`) and lives in product code, composing `KitCard`, `KitMenu`, etc. at the call site. No `-panel` on content files.

**Typing:** `OwnedProps & Omit<UpstreamHostProps, 'children'>`. Owned prop names must not collide with PF props; if one would, rename it rather than `Omit`-ing the PF prop. Destructure owned props; `...rest` on the host. `className` / `style` merge onto the host root.

**Assembly docs before code:** each new assembly unit gets a `ROADMAP.md` (phases, host, API draft, validation) and a `README.md` (why / what / how / API). Multi-unit families add a family `ROADMAP.md`. Zero overlap between family and unit roadmaps; link, do not copy. Primitives skip this.

**Layout assemblies** (e.g. a button group) take `children` only — no product-shaped slots or hard-coded N controls.

### Kit CSS

| Rule | Detail |
| ---- | ------ |
| Format | Co-located plain `.css`; `kit-c-*` class on the host root |
| Config vs unit | `*.config.css` = shared tokens; unit CSS = unit-only rules, consuming tokens rather than re-declaring |
| Host first | Prefer the PF host when it owns the job; invent a kit host only when PF has no equivalent |
| Theme | Use the host's light/dark API when present; otherwise a dark-theme modifier on the same node |
| Scope | If the build auto-wraps kit CSS in a theme scope, write bare/`&` rules; re-stating the scope double-nests and silently matches nothing |
| Intrinsic size | No `width/height: 100%` unless stretching to a known container is the explicit job |
| Utilities | Last resort — see CHECK FIRST |
| Base support | State the contract: padding, direction, gap, align. Easy to read, easy to debug |
| No exotic selectors | Deep `:has()` / `:nth-child()` / `:not(:only-child)` stacks infer layout from DOM order — fragile, contextual, noisy. Name the variant instead |
| Breakpoints | PF breakpoints are SCSS; `@media` cannot use them or `--pf-t--global--breakpoint--*`. Copy the rem value from a single project map |

## Anti-patterns → fixes

| Smell | Fix |
| ----- | --- |
| Two returns, same scaffold | One return + conditionals |
| Extra `div` for ref/class | Existing PF host |
| `Kit*` wraps PF in kit chrome | Logic only; className on host root |
| Slot assembly in `primitives/` / base unit in `assemblies/` | Rehome to the right tier |
| Domain wiring labeled "assembly" | Keep with product until extracted |
| Split toggle + menu primitives | One menu primitive; toggle is a Dropdown slot |
| Renamed PF twins (`toggleVariant`) | Props bag (`toggleProps`) |
| Layout assembly with product-shaped props | Children passthrough only |
| Kit assembly calling services / product fetch | Domain shell owns fetch |
| Mid-layer wrapper with one consumer | Skip until ≥2 surfaces share it |
| Wrong PF sibling for the named component | Remap host to the documented PF component |
| Demo inlines PF chrome | Demo uses the same stack as production |
| Rewrite a page-local unit in place | New kit unit; page pulls |
| Rename as write + delete | `git mv` |
| Typecheck green, UI broken | Smoke the route |
| Page hand-rolls active state, panel state, or filter wiring | Extend the assembly; delete the page copy |
| Consumer re-pointed before the assembly is capable | Hold; finish the assembly first |

## Works with other skills

Scope decides precedence. Inside the kit, this skill governs composition; outside it, PatternFly guidance applies as written.

- **PF structure audits** (`pf-component-check`, `pf-component-structure-audit`): their required hierarchies (`ToolbarContent`, `CardBody`, `PageSection`) still apply to PF trees. Rule 0 and the Flex/FlexItem rule govern only a kit assembly's own internal layout. Expect an audit to flag uniform `FlexItem` wrappers in app code; that is not a kit violation.
- **Generators** (`pf-table-gen`, `pf-form-gen`, `pf-chart-gen`): if a kit harness exists, configure it instead of using raw PF output.
- **Style audits** (`pf-css-token-check`, `pf-color-scan`): compatible; both prefer tokens over raw values.
- **State and a11y audits** (`pf-state-audit`, `pf-a11y-audit`): run them on kit output unchanged.

## Review checklist

- [ ] Perspective read when changing layers or adding DOM
- [ ] Process followed; `git mv` for rehomes
- [ ] Correct tier; PF host matches the named component
- [ ] Config cascade respected (tenant / prop default / presentational)
- [ ] Domain owns copy and JSX hydration; kit stays agnostic
- [ ] No casual utility classes; CSS is base support, no exotic selector stacks
- [ ] `@media` uses the rem map, not `px` or CSS vars
- [ ] Anti-God: one visual job per assembly
- [ ] New assembly: roadmap + README before code
- [ ] Assembly layout: slots first, PF layout second; no uniform `FlexItem` wrappers
- [ ] No PF prop renamed, reinterpreted, or shadowed (except a config-driven superset that still accepts PF values); no alias twins; shared presentation comes from config
- [ ] Passthrough: children compose **or** slot args build; className on host root
- [ ] CHECK FIRST done; return readable without sibling files
- [ ] Hydration = flags + slots only; assembly complete for this page's needs
- [ ] Layout intent asked when unspecified; Flex tokens are enum strings
- [ ] Build, tests, and smoke on touched routes
