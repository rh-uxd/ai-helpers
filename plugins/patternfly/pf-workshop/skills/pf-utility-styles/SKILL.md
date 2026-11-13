---
name: pf-utility-styles
version: 0.1.0
description: >-
  Audit SCSS, CSS, and inline styles in the current project and report which
  declarations can be replaced by that project's PatternFly utility classes
  (pf-v5-u-* or pf-v6-u-*, matching the installed @patternfly/patternfly).
  Use when the user asks whether custom styles, CSS, SCSS, or inline styles
  can use PatternFly utilities, PF utility classes, or pf-v*-u classes, asks
  to replace stylesheet rules with utilities, or asks to walk through or
  implement the suggested updates. After a run, ask whether to summarize
  the changes that actually landed on the branch. Works in any project
  that depends on PatternFly.
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
- A whole project, or no path (the current directory): run `--summary --queue`. Do not paste the queue into the answer.
- `--queue` groups each suggested rule into one item. Component stylesheets come first, then inline styles, then other project CSS. `base.scss`, override stylesheets, and email or mailer CSS are last. Inline styles are included. Hidden PatternFly selectors, pseudos, media queries, and bare elements are not. Dependency directories (`node_modules`, `vendor`, `.vendor`) are not scanned.
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

For a whole project, lead with the scanner counts, the class prefix, whether a utility stylesheet import was seen, and how many hidden hits are PatternFly overrides or media queries. Name any legacy `pf-u-*` hit. Do not list every candidate. Name the files with the most listed matches.

After a file report or a project summary, stop. Ask the user which they want:

- **Walk through** the suggested updates, one at a time.
- **Implement all** suggested updates that pass the Keep checks.

Do not edit files, and do not start the walkthrough, until they choose.

## Walk through updates

Use this only after the user chooses to walk through. Apply a change only after the user accepts that suggestion.

1. Run `--summary --queue` on the project that contains `@patternfly/patternfly`. If the user named a file or directory, pass that path and start there.
2. Read the queue in order. For each group, open the rule and apply the Keep checks. Skip it when any check fails, including these:
   - The stylesheet exists to override PatternFly, Bootstrap, or another library.
   - The selector uses a sibling combinator, `:not()`, or another condition a class on the element would ignore.
   - The selector is a shared helper (`.fr`, `.ellipsis`) used from many templates.
   - The file is email or mailer CSS.
   - Script later sets the same property (`.show()`, `.hide()`, `.width()`, or a caller-passed `style`).
   - A PatternFly component prop already covers it (`Flex` `spaceItems`, `MenuToggle` `isFullWidth`).
   - The verdict is `approximate`. Mention those once in the summary, not as a suggestion.
3. Batch the skips. In one turn, skip every group that fails a Keep check until the next group that can move. Tell the user the count and the reasons in one or two lines. Do not ask them to reject those.
4. Show one suggestion, then stop. Do not edit in that turn.

```markdown
### Suggestion <n>
`<file>:<line>`
Current: `<property>: <value>` on `<selector or JSX element>`
Change: add `<classes>` on `<the element the declaration targets>`. Remove that declaration. Leave the rest of the rule.
Why: <one line>

Reply **apply**, **skip**, or **stop**.
```

5. On the next turn:
   - **apply**: make that one change, then continue from step 3 and show the next suggestion.
   - **skip**: leave the file unchanged, then continue from step 3.
   - **apply the rest of this file**: apply the remaining suggestions in the current file that already passed the Keep checks. Do not apply groups you have not read.
   - **stop**: end the queue, then ask about a change summary as described below.

When the queue is finished, or the user stops, do not list the skipped suggestions again. Ask about a change summary as described below.

A legacy `pf-u-*` class with no installed equivalent is one suggestion: remove the class, and say there is no utility to put in its place. Do not invent a substitute.

## Implement all

Use this only after the user chooses to implement all.

1. Read every queued group and apply the Keep checks. Drop hidden hits, off-scale values, `approximate` matches, and anything in the skip list above.
2. Apply each group that passes. Use the same edit steps as a single accepted suggestion.
3. Say how many groups were applied and how many were left in place. Do not list every leave. Then ask about a change summary as described below.

## Change summary

Ask only when the walkthrough ends or **implement all** finishes. The walkthrough ends when the user says **stop** or the queue has no suggestions left.

Ask: do you want a summary of the changes?

Write the summary only if they say yes. Build it from the branch, not from the suggestion list.

1. Remember which files this run edited.
2. Read `git status` and `git diff` for those files, including staged changes. If this run committed them, read `git diff <base>...HEAD` for those same files. Use the merge base of the upstream or default branch.
3. Include a change only when the diff shows it. Leave out skipped suggestions, suggestions that were not applied, and edits this run did not make, even when they are in the same file or already on the branch.
4. For each included change, name the file, the utility class added, and the declaration removed.

If this run changed nothing, say that and do not invent entries.

## Applying a change

Only for a suggestion the user accepted:

1. Add the class on the element the declaration targets (`class` / `className` in the template or JSX).
2. Remove that declaration. Leave the rest of the rule.
3. Do not add a utility to a PatternFly internal selector to "fix" an override.
4. Do not apply `approximate` matches unless the user accepts the calc width.
