# PatternFly utility reference

Examples below use the PatternFly 5 prefix `pf-v5-u-` and the PatternFly 5 spacer scale. The scanner prints the prefix and reads lengths from the installed `@patternfly/patternfly`. Use that output for the project you are in. PatternFly 6 uses `pf-v6-u-` and the same utility names. PatternFly 4 (`pf-u-*`) is out of scope.

Utilities ship in `patternfly-addons` for PatternFly 5, not in the base component CSS. Confirm the project imports them.

## Spacer scale

| Token | Length | Example class |
| --- | --- | --- |
| 0 | 0 | `pf-v5-u-m-0` |
| xs | 4px / 0.25rem | `pf-v5-u-m-xs` |
| sm | 8px / 0.5rem | `pf-v5-u-mt-sm` |
| md | 16px / 1rem | `pf-v5-u-p-md` |
| lg | 24px / 1.5rem | `pf-v5-u-mx-lg` |
| xl | 32px / 2rem | `pf-v5-u-my-xl` |
| 2xl | 48px / 3rem | `pf-v5-u-mb-2xl` |
| 3xl | 64px / 4rem | `pf-v5-u-p-3xl` |
| 4xl | 80px / 5rem | `pf-v5-u-mt-4xl` |
| auto | auto (margin only) | `pf-v5-u-mx-auto` |

Sides: `m` `mt` `mr` `mb` `ml` `mx` `my` and the same with `p`. `mt` is `margin-block-start`, `ml` is `margin-inline-start`. There is no negative spacer.

`padding: 8px 16px` is `pf-v5-u-py-sm pf-v5-u-px-md`. `margin: 0 auto` is `pf-v5-u-my-0 pf-v5-u-mx-auto`.

## Type, color, size

| Declaration | Class |
| --- | --- |
| font-size 12 / 14 / 16 / 18 / 20 / 24 / 28 / 36 px | `pf-v5-u-font-size-xs` through `4xl` (xs sm md lg xl 2xl 3xl 4xl) |
| font-weight 400 or normal | `pf-v5-u-font-weight-normal` |
| font-weight 700 or bold | `pf-v5-u-font-weight-bold` |
| text-align left, center, right, justify | `pf-v5-u-text-align-*` |
| white-space nowrap / normal | `pf-v5-u-text-nowrap` / `pf-v5-u-text-wrap` |
| word-break break-word | `pf-v5-u-text-break-word` |
| overflow hidden + ellipsis + nowrap | `pf-v5-u-text-truncate` (one class for the set) |
| `var(--pf-v5-global--Color--200)` | `pf-v5-u-color-200` (100–400, plus status, link, disabled, and primary color classes) |
| `var(--pf-v5-global--BackgroundColor--100)` | `pf-v5-u-background-color-100` |
| width/height 0, 25%, 50%, 75%, 100%, auto | `pf-v5-u-w-*` / `pf-v5-u-h-*` |
| min-width 0 or min-height 0 | `pf-v5-u-min-width` / `pf-v5-u-min-height` |

`pf-v5-u-w-33` is `calc(100% / 3)`, not `33%`. Same for 66, and for `vw` / `vh` variants.

Display: `none`, `inline`, `inline-block`, `block`, `flex`, `inline-flex`, `grid`, `inline-grid`, `table`, `table-cell`, `table-row`.

Flex: direction, wrap, align-items, align-self, align-content, justify-content, grow/shrink 0 or 1, basis 0 or auto, `flex: 1` (`pf-v5-u-flex-1`), `flex: none`, `flex: 1 1 auto` (`pf-v5-u-flex-fill`). `justify-content: space-evenly` and `align-items: start` are not in the set (`flex-start` is).

Float: `pf-v5-u-float-left`, `pf-v5-u-float-right`.

## Breakpoints

| Suffix | Applies at |
| --- | --- |
| (none) | all widths |
| `-on-sm` | min-width 576px |
| `-on-md` | min-width 768px |
| `-on-lg` | min-width 992px |
| `-on-xl` | min-width 1200px |
| `-on-2xl` | min-width 1450px |

These are mobile-first. `@media (max-width: 768px)` cannot be written as `-on-md`. Height variants use `-on-md-height` and are a different query. Box-shadow and font-family utilities are not responsive.

## No utility exists

Do not invent classes for:

- gap, row-gap, column-gap
- overflow, except the truncate bundle
- position, inset, top, right, bottom, left, z-index
- vertical-align
- opacity, cursor, border, outline, box-shadow raw values (only `var(--pf-v5-global--BoxShadow--*)`)
- line-height, letter-spacing, text-decoration, text-transform, font-style
- font-weight other than 400 and 700
- order, grid-template, place-items
- max-width or max-height at a chosen length (`pf-v5-u-max-width` defaults to auto)
- arbitrary hex colors that are not the global color token the utility sets

## Component props instead of utilities

When the JSX element is already that component:

| Component | Prop | Replaces |
| --- | --- | --- |
| `Flex` | `direction`, `flexWrap`, `alignItems`, `justifyContent`, `spaceItems` | flex utilities and the gap between items |
| `FlexItem` | `spacer`, `grow`, `shrink`, `alignSelf` | margin before the item, flex grow/shrink, align-self |
| `Stack` | `hasGutter` | the stack's own gap, not an arbitrary `column-gap` |
| `Grid` | `hasGutter` | the grid's own gutter |

`spaceItems={{ default: 'spaceItemsMd' }}` uses spacer `md`. Default Flex spacing is not `md` (column gap defaults to `lg`, row gap to `sm`), so do not delete a custom margin just because a Flex is present.

## Worked judgments

These use PatternFly 5 class names. Substitute the prefix the scanner printed.

Keep:

- `font-weight: 300` has no utility (only 400 and 700).
- `max-height: 400px` and `overflow: auto` have no utility.
- `column-gap: 8px` is spacer `sm` but gap is not a utility.
- `vertical-align: top` is not `align-items`.
- `padding-top: var(--pf-v5-global--spacer--sm)` on `td.pf-v5-c-table__td` matches `pf-v5-u-pt-sm` and still stays, because the selector overrides a PatternFly table cell.
- `@media (max-width: 768px) { margin-block-start: 0 }` matches `pf-v5-u-mt-0` and still stays. `-on-md` would apply from 768px upward, which is the opposite query.
- `display: none` or `width: 0%` that script later shows or resizes. A utility is `!important`, so jQuery `.show()`, `.hide()`, or `.width()` will not override it.

Move, when the selector is the project's own element and the utility stylesheet is loaded:

- `.card { margin-top: 16px; display: flex; align-items: center; }` becomes `pf-v5-u-mt-md pf-v5-u-display-flex pf-v5-u-align-items-center` on that element.
- `style={{ marginRight: '0.5rem', minWidth: 0 }}` becomes `pf-v5-u-mr-sm pf-v5-u-min-width`.
- `style={{ padding: 24 }}` becomes `pf-v5-u-p-lg` (React numbers are px).
