# Examples

Companion to [perspective.md](perspective.md) (why) and [SKILL.md](../SKILL.md) (how). Examples use the placeholder prefix `Kit`.

**Operating question:** "Am I configuring a harness, or re-building PF?" If the latter, you are outside the perspective.

## Wrong PF sibling, premature variants, product copy in the kit

- **Smell:** user links PF [List](https://www.patternfly.org/components/list/); agent ships `DescriptionList` because the copy is "term + body." **Fix:** host = PF `List` / `ListItem`; put labels in item children.
- **Smell:** new `KitList` sets `isPlain` in config on day one. **Fix:** empty config entry; call sites pass variants; promote only when ≥2 share a baseline.
- **Smell:** a kit prop renames, reinterprets, or replaces a PF prop (`variant` → `isCompact`, a `title` slot shadowing `CardProps.title`, a `status` that drops PF's values). **Fix:** pass the PF prop through untouched; add a new-named prop, or a config-driven superset like `LabelStatus` that still accepts PF values.
- **Smell:** product copy hard-coded in a kit primitive, or JSX arrays in `constants.ts`. **Fix:** domain `policyItems.tsx` → `<KitList items={POLICY_ITEMS} />` inside `KitPopover` at the call site.

## Naming a product composition

`KitStatusCard` is wrong twice: "Status" names the consumer, and the `Kit` prefix is for kit exports. A card with a title, metrics, and header menu used on one surface is product code: `StatusCard`, composing `KitCard`, `KitMenu`, and `KitMetricsCount`. Promote to the kit only at ≥2 consumers, and then by resource name.

## Each layer pays once

| Layer | Pays once | Example |
| ----- | --------- | ------- |
| PF table shell | One harness | `KitDataView` (scroll, toolbar, manage columns, pagination) |
| Feature wiring | One config | `ProductDataView` + `data-view-config.ts` |
| Domain columns | One catalog + row builder | `COLUMN_CATALOG`, `buildRows` |
| Page | Outline only | `Page.tsx` — select + one conditional table slot |

**Wrong:** the demo page inlines `DataView` + column modal + sticky CSS "because it's just a demo" — that becomes the tax every production page pays. **Right:** the demo uses the same stack as production; demo-only files hold demo config (ids, storage keys), not a second PF integration.

```
Page.tsx                ← async outline only
  ↓
TableFeature            ← domain: body states + pagination props (no fetch)
  ↓
ProductDataView         ← feature config
  ↓
KitDataView             ← kit assembly
```

## Logic passthrough

```tsx
// Slot build — harness owns the title stack
<KitPageHeader title="Overview" description="…" actions={<ExportMenu />} />

// Passthrough — caller owns the interior
<KitPageHeader hero>
  <CustomChrome />
</KitPageHeader>

// Hero surface pre-config on the one header
<KitPageHeader hero title="…" />
```

## Configured statuses (extend, don't remap)

```ts
// Kit config — once. Statuses cascade to every consumer.
export const LabelStatus = { remediated: 'remediated', payAttention: 'payAttention' } as const;
// components.config.ts holds each status's presentation (color, icon).
```

```tsx
// Superset: `status` extends PF's concept. Kit statuses and PF statuses both work.
type KitLabelStatus = (typeof LabelStatus)[keyof typeof LabelStatus];
type KitLabelProps = { status?: KitLabelStatus | LabelProps['status'] } & Omit<LabelProps, 'status'>;

<KitLabel status={LabelStatus.remediated}>{text}</KitLabel>
<KitLabel status="success">{text}</KitLabel>   {/* PF value still accepted */}
<KitLabel color="blue">{text}</KitLabel>        {/* PF prop untouched */}
```

The kit drives its own statuses from config and passes PF values straight through. A `status` type that drops PF's values is a replacement, not an extension.

**Not allowed: aliases.** `kind="primary" | "danger"` that only sets `variant` / `isDanger` adds a second vocabulary for the same thing; callers keep using the PF props.

## Base-support CSS

```css
/* ✅ States the contract */
.kit-c-page-header {
  padding-inline: var(--kit-space--page-inline);
  padding-block: var(--kit-space--page-block);
}
.kit-c-page-header.kit-c-page-hero .pf-v6-c-hero__body {
  display: flex;
  flex-direction: column;
  gap: var(--kit-space--page-chrome-gap);
}

/* ❌ Infers layout from sibling count / DOM order */
.kit-c-page-hero .pf-v6-c-hero__body:has(> .kit-c-chrome-slots:nth-child(2))
  > .kit-c-chrome-slots:first-child { flex: 1 1 auto; }
.kit-c-chrome-slot:last-child:not(:only-child) { align-self: start; }
```

If a variant earns a name, use an explicit class or prop.

## Return-as-spec

```tsx
// ✅ Structure visible
return (
  <>
    <Title headingLevel="h2" id="overview-title">{title}</Title>
    {introBody}
    {hasReadme ? <ReadmeRenderer html={rest} /> : (
      <>
        <section aria-labelledby="detail-a">…</section>
        <section aria-labelledby="detail-b">…</section>
      </>
    )}
  </>
);

// ❌ Structure hidden
introContent = <div>…</div>;
tailContent = hasReadme ? <ReadmeRenderer /> : <></>;
return <Flex>{introContent}{card}{tailContent}</Flex>;
```

## File placement

```
# Bad
features/container-entry/        # fake layer
container-details-panel.tsx      # shell stem on a section
assemblies/page-header/          # Hero + plain chrome in one God unit

# Good
src/kit/components/primitives/label/label.tsx
src/kit/components/assemblies/page/
  page.config.css                # page spacers / type (CSS, not YAML)
  page-header/                   # one assembly — plain or hero surface
src/kit/components/components.config.ts    # prop defaults
src/kit/components/components.config.css   # presentational baseline
# domain wiring stays with the product, not in src/kit/
```

## More anti-patterns

| Anti-pattern | Fix |
| ------------ | --- |
| Chrome title + document `h2` with the same string | One outline owns the title |
| Per-tab Spinner dialect | Shared status primitive |
| `catalog-browse-toolbar` (type last) | `toolbar/toolbar.tsx` |
| Usage-named kit unit (`CardCatalog`) | `Card` + page-level `ImageCard` |
| Hand-copied PF `color` unions | `Pick<LabelProps, …>` + app-only fields |
| One-call-site table extraction | Keep scaffolding in the domain return |
| JS-mounted section trees on click | Scaffold mounted with the surface; hydrate values only |
| Menu half-rewritten to a kit primitive during a chrome migration | Leave shells that own real behavior (export, PDF) until that feature migrates |
| `ExportMenu` kit assembly before a second consumer | Domain configures the menu primitive; promote later |
| Raw PF `EmptyState` / `Skeleton` / `Tooltip` in kit chrome | Root-only `KitEmptyState` / `KitSkeleton` / `KitTooltip` |
| Per-page circle help button dialect | Tooltip default trigger = circle button; richer = popover + circle button |

## Extract trace — export menu → menu primitive

**Problem:** a domain `ExportMenu` mixed (1) PF Dropdown / MenuToggle / busy-lock chrome with (2) fetch, PDF building, CSV/JSON, and notifications.

**Why primitive:** A — one host, PF `Dropdown`. B — standard toggle + menu. C — same job PatternFly names. Kit props (`label`, `isBusy`, `items`) configure the base unit.

| CHECK FIRST | Answer |
| ----------- | ------ |
| Does a harness exist? | No — Dropdown tax is paid in the page |
| What is reusable? | Open/close, toggle, items, busy lock + spinner |
| What stays domain? | Fetching, payload builders, filenames, notifications |
| Promote an `ExportMenu` assembly? | No — one consumer; an empty middle layer is ceremony |

```tsx
return (
  <KitMenu
    label="Export"
    busyLabel="Exporting"
    isBusy={isExporting}
    isDisabled={!customerId}
    toggleProps={{ variant: 'secondary', ouiaId: 'export-toggle' }}
    items={[
      { id: 'csv', children: 'Export as CSV', onSelect: () => void handleExport('csv') },
      { id: 'json', children: 'Export as JSON', onSelect: () => void handleExport('json') },
    ]}
  />
);
```

Interior cascade: `children` passthrough wins; else `items` build; else empty shell. An explicit PF `toggle` wins over the harness-built one. Pure MenuToggle knobs go in `toggleProps`. **Do not kit-ify** fetch or PDF builders — they fail promotion (domain, not base-unit config). Add an export assembly only when a second surface needs the same UX; it would *consume* the menu primitive. Do not rewire page-specific shells in the same pass that lands the primitive.

## Migrate then dissolve

Kit-root migrations replace **usages**; they do not delete the old surface in the same change.

| Phase | Lands | Reviewer validates |
| ----- | ----- | ------------------ |
| **1 — Migrate** | New kit roots; pages compose them; old domain files stay on disk **unchanged** | Behavior and approach; diff is kit + pages |
| **2 — Dissolve** | Delete unused domain shells and orphan CSS | Pure dead-code removal |

Rules:

1. Replace usages first; pages point at kit roots.
2. Do not delete or edit unused domain files in the migrate PR — track them in an inventory instead.
3. Orphaned CSS may get a short marker comment; product components get none.
4. The dissolve sweep removes only inventoried entries.
5. Shells that still own real behavior stay until their feature migrates. Pure chrome with no special behavior is composed on the page from kit roots.

Inventory shape:

| Leftover (untouched) | Successor | Notes |
| -------------------- | --------- | ----- |
| `components/SlaInfoPopover.tsx` | `KitPopover` + circle `KitButton` + `KitList` | Usages replaced |
| `styles/page.scss` → `.help-btn` | Circle plain `KitButton` / `KitTooltip` | Orphan CSS |

```css
/* UNUSED — successor: <kit root / call-site pattern>. Slated for dissolution sweep. */
```

When dissolving: delete the file or rules, drop the inventory row, and confirm no remaining imports or class references.

### Example: header → kit roots

| Was | Now |
| --- | --- |
| Product-named help popover + custom help-button class | Call-site `KitPopover` + `KitButton isCircle`; the page owns the copy |
| Short icon-help | `KitTooltip` (default trigger = circle plain `KitButton`) |
| Raw `EmptyState` / `Skeleton` | Root-only `KitEmptyState` / `KitSkeleton` |
| Select with no special behavior | Page composes `KitMenu` + `KitSkeleton` + fetch |

## FlexItem before/after

**Problem:** a metrics-count assembly used PF `Flex` as its host with a nested `Flex` and five `FlexItem` wrappers, none with a per-child override. Layout intent lived in scattered JSX props. The order is slots first (still maturing), PF layout second; this trace shows why *uniform* wrappers are the part to drop.

### Before

```tsx
<Flex direction={{ default: isColumn ? 'column' : 'row' }}
      alignItems={{ default: isColumn ? 'alignItemsCenter' : 'alignItemsBaseline' }}
      gap={{ default: isColumn ? 'gapSm' : 'gapMd' }}>
  <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
    <FlexItem><Title headingLevel="h4" size="3xl">{value}</Title></FlexItem>
    <FlexItem><span className="kit-c-metrics-count__bar" aria-hidden="true" /></FlexItem>
  </Flex>
  <FlexItem>
    <Content>
      <Flex gap={{ default: 'gapXs' }}>
        <FlexItem>{label}</FlexItem>
        <FlexItem><KitTooltip>…</KitTooltip></FlexItem>
      </Flex>
    </Content>
  </FlexItem>
</Flex>
```

Cost: 2 `Flex` + 5 `FlexItem` = 7 extra nodes per render, each carrying modifier classes the UA re-evaluates on every layout pass. Three cells on a page = 21 nodes; across a product, hundreds to thousands.

### After

```tsx
<div className={mergeClassNames('kit-c-metrics-count', isColumn ? 'kit-m-column' : 'kit-m-row', className)} style={style}>
  <Title headingLevel="h4" size="3xl" className="kit-c-metrics-count__value">{value}</Title>
  {colorToken != null && <span className="kit-c-metrics-count__bar" aria-hidden="true" />}
  <Content component="small" className="kit-c-metrics-count__label">
    {label}
    {tooltip != null && <KitTooltip content={tooltip}>…</KitTooltip>}
  </Content>
</div>
```

```css
.kit-c-metrics-count { display: flex; flex-direction: column; align-items: center; gap: var(--pf-t--global--spacer--sm); }
.kit-c-metrics-count.kit-m-row { flex-direction: row; align-items: baseline; gap: var(--pf-t--global--spacer--md); }
.kit-c-metrics-count__label { display: inline-flex; align-items: center; gap: var(--pf-t--global--spacer--xs); }
```

Zero extra nodes; layout is readable in DevTools and fixed in one place for every consumer.

> Slots first, PF layout second. `FlexItem` earns its place only for a per-child override (growth, shrink, `align-self`, `flex-basis`). Identical wrappers with no props are dead weight.

## Refactor workflow

1. Propose scope — no edits.
2. Dry-run: relevance, CHECK FIRST, naming, smoke targets.
3. Review until consensus.
4. `git mv` misnamed files, then edit in place.
5. Write the return outline from design order.
6. Lift hydration into allowed slots only.
7. Leave `TODO(rehome): …` on wrong-layer code not moved this pass; list migrated-but-kept shells in the dissolution inventory without editing them.
8. Validate: compile, tests, smoke.
9. Dissolution as a separate pass.
