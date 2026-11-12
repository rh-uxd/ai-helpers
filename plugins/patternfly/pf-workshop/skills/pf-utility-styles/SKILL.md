---
name: pf-utility-styles
version: 0.1.0
description: >-
  Audit SCSS, CSS, and inline styles in the current project and report which
  declarations can be replaced by that project's PatternFly utility classes
  (pf-v5-u-* or pf-v6-u-*, matching the installed @patternfly/patternfly).
  Use when the user asks whether custom styles, CSS, SCSS, or inline styles
  can use PatternFly utilities, PF utility classes, or pf-v*-u classes, or
  asks to replace stylesheet rules with utilities. Works in any project that
  depends on PatternFly.
---

# PatternFly utility styles

Decide whether a style declaration can become a PatternFly utility class for the project you are in. Report first. Change files only when the user asks to apply the replacements.

The class prefix comes from the installed `@patternfly/patternfly` major version: `pf-v5-u-` on PatternFly 5, `pf-v6-u-` on PatternFly 6. Unversioned `pf-u-*` is the PatternFly 4 form. Do not recommend a class from a different major version than the one the scanner prints.

Utilities are not in the main component stylesheet. PatternFly 5 ships them in `patternfly-addons`. Before recommending a class, confirm this project imports that stylesheet (or `@patternfly/patternfly/utilities`). The scanner reports whether it saw that import in the files it scanned. A single component file will not contain the import; look at the app's CSS entry before deciding the classes are missing. If the project does not load utilities, say so and do not tell the user to add classes that are absent from the bundle.

Utilities set one property with `!important`. They are not a substitute for a selector that retargets a PatternFly component.

## Requirements

This skill requires Python 3 and a project with PatternFly 5 or later installed at `node_modules/@patternfly/patternfly`.

Before scanning, verify Python is available:

```bash
command -v python3 >/dev/null 2>&1 || { echo "Error: pf-utility-styles requires Python 3." >&2; exit 1; }
```

## Scan

Run the scanner from the project that depends on `@patternfly/patternfly`, or pass a path inside that project. It walks up from that path, then from the current directory, and reads `node_modules/@patternfly/patternfly`. It does not edit files. If it cannot find that package, stop. Do not reuse class names from a different project.

```bash
python3 "$CLAUDE_SKILL_DIR/scripts/scan_pf_utilities.py" PATH
```

- One file or directory: run it with no extra flags. Add `--review` when the user wants the hidden PatternFly-selector, pseudo, and media-query hits explained.
- A whole project, or no path (the current directory): run `--summary`. Do not paste every hit into the answer.
- `--off-scale` lists utility properties whose values are not on the installed scale. `--tests` includes test and fixture files.

Token tables, the breakpoint rule, and properties that have no utility are in [reference.md](reference.md). Those examples use the PatternFly 5 prefix. Use the prefix the scanner prints for this project. If the scanner and the reference disagree, the installed SCSS wins. Do not invent a utility class the scanner did not emit. PatternFly 4 is out of scope.

## What a hit means

`candidate` means the value matches a real utility. It is safe to recommend only after the checks below.

`partial` means some sides of a margin or padding shorthand match and others do not. Recommend it when the matched sides are the ones that matter, such as `margin: 40px auto` to `pf-v5-u-mx-auto` while the 40px stays custom. If the only matches are `0` and the non-zero sides have no utility, keep the shorthand.

`approximate` is `33%` or `66%`. The PF class is `calc(100% / 3)` or twice that, not the literal percent. Say so. Do not treat it as exact.

`legacy-missing` is an unversioned `pf-u-*` class with no equivalent in the installed PatternFly. `pf-u-max-width-100` is the known case: PatternFly 5 has `pf-v5-u-w-100` (width 100%) and `pf-v5-u-max-width` (max-width auto). It has no max-width 100% utility. Swap the prefix for the version the scanner printed.

Hidden by default, and kept as CSS unless the user is asking about that specific rule:

- The selector contains a PatternFly component or layout class (`pf-v5-c-`, `pf-v6-c-`, `pf-v5-l-`, `pf-v6-l-`, unversioned `pf-c-` / `pf-l-`) or a modifier (`pf-m-`).
- The declaration is on a pseudo-class or pseudo-element.
- The declaration is inside `@media`, `@supports`, or `@container`.
- The selector is a bare element (`a`, `td`, `li`) with no class or id.

A descendant selector (`.parent .child`) can still move. Put the class on the element the declaration targets (`.child`), and only where that ancestor restriction still holds. Do not put a non-inherited utility on the ancestor.

## Keep the declaration

Leave the CSS in place when any of these are true:

- The rule overrides a PatternFly component or layout, including a stylesheet whose job is those overrides, even if the length is a spacer.
- The value is not on the installed scale. On PatternFly 5, font weight is only 400 (`pf-v5-u-font-weight-normal`) and 700 (`pf-v5-u-font-weight-bold`). Weight 300 stays custom. `max-height: 400px`, negative margins, and `2px` / `10px` stay custom. Use the prefix the scanner printed.
- The property has no utility. Gap, overflow, position, inset, vertical-align, z-index, opacity, border, line-height, text-transform, order, and grid stay custom. `column-gap: 8px` stays custom even though 8px is spacer `sm`.
- `min-width` / `min-height` other than `0`. The min-width utility only sets the minimum to 0. `max-width` / `max-height` other than the initial `auto` have no utility length.
- The declaration is inside a max-width query. `-on-sm|md|lg|xl|2xl` means min-width 576, 768, 992, 1200, and 1450. A `max-width: 768px` rule is not `-on-md`. Box-shadow and font-family utilities have no breakpoint suffix.
- `align-items`, `justify-content`, or `align-content` would land on an element that is not a flex or grid container. If the same rule sets `display: flex`, move both classes together.
- The rule mixes a match with custom properties. Move only the matched declarations. Delete the rule only when nothing is left.

`font-size: 16px` is the PatternFly 5 `font-size-md` utility, which is the body size. Recommend it when it overrides a smaller parent. Skip it when it only restates the default. Confirm the size token against the scanner when the project is not on PatternFly 5.

## Prefer a component prop

On an element that is already a PatternFly component, prefer the component prop over a utility class. See [reference.md](reference.md). `Flex` `spaceItems` and `alignItems`, and `FlexItem` `spacer`, replace spacing and alignment utilities on that component. A utility is the right recommendation for a plain element, or for a component with no such prop.

## Report

For a file or component, use this shape:

```markdown
## PatternFly utility audit

Scope: <path>
PatternFly <version> utilities (`<prefix>` from the scanner).

### Can move
| Location | Current | Class | Where the class goes |
| --- | --- | --- | --- |
| file:line | `margin-top: 16px` | `pf-v5-u-mt-md` | on `.card` |

### Keep
- <rule>: <reason in one line>
```

For a whole project, lead with the scanner counts, the class prefix, whether a utility stylesheet import was seen, and how many hidden hits are PatternFly overrides or media queries. Name any legacy `pf-u-*` hit. Do not list every candidate. Offer the top files as the places worth cleaning up, and audit one of them in the format above only if the user pointed at it or asked for the detail.

## Applying a change

Only when the user asks:

1. Add the class on the element the declaration targets (`class` / `className` in the template or JSX).
2. Remove that declaration. Leave the rest of the rule.
3. Do not add a utility to a PatternFly internal selector to "fix" an override.
4. Do not apply `approximate` matches unless the user accepts the calc width.
