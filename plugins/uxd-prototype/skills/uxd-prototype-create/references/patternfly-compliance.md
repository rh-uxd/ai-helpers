# PatternFly Selection and Code Checks

Apply during initial creation and refinement. Standalone uses PatternFly 6; workspace mode uses the project's installed version. If the workspace uses another design system, preserve its conventions and briefly mention that PatternFly checks are not applicable and why. Do not migrate the workspace implicitly.

## Load supporting skills

These are workflow dependencies, not automatic plugin installs. Discover and read their instructions through the host's skill mechanism. If working from this marketplace checkout, the sources are under:

| Skill | Repository path | When to load |
|---|---|---|
| `pf-catalog-interaction-patterns` | `plugins/patternfly/pf-design-guide/skills/pf-catalog-interaction-patterns/` | Before component selection, including its `references/interaction-catalog.md` |
| `pf-component-check` | `plugins/patternfly/pf-react/skills/pf-component-check/` | Relevant hierarchy references before generation; full audit after generation |
| `pf-component-reuse-check` | `plugins/patternfly/pf-react/skills/pf-component-reuse-check/` | After generation, before final build and handoff |

Do not assume separately installed plugins are siblings of this skill. If a helper is unavailable, use the manual checks below with PatternFly documentation; mention the missing helper and fallback used in the final summary. If neither documentation nor local package examples/types can verify a choice, flag it as unverified rather than inventing an API or claiming compliance. Surface missing helpers and suggest the `pf-design-guide` / `pf-react` plugins without installing them automatically.

## Before generation: select by interaction

1. Extract UI roles and interactions from `journeys.json` and `states.json`, including empty, loading, and error states. Include keyboard, focus, selection, and dismissal behavior rather than matching visual appearance alone.
2. Load the catalog and look up each distinct interaction. For example, choosing one item from a menu points to Select; revealing contextual help by click points to Popover, while brief help on hover/focus points to Tooltip. Verify the specific variant and behavior in documentation.
3. Use the PatternFly docs MCP when available to verify candidate components, props, examples, and required wrappers for the project's version. Otherwise use official PatternFly documentation or installed package source/types/examples. The catalog narrows the search; it does not establish API compatibility.
4. Check existing workspace components for a suitable PatternFly composition before adding a new one. Prefer documented components and compositions over custom controls. Preserve domain-specific orchestration wrappers.
5. Read the applicable hierarchy references from `pf-component-check` (page layout, containers, data components, navigation/toolbar). Start with the complete wrapper tree rather than adding CSS to repair spacing later.

## During generation: composition and styling

- Use supported props/variants and required structural wrappers first, then PatternFly layout components/utilities and design tokens for application layout.
- Do not recreate a shipped control with raw HTML or a custom React component when a documented PatternFly equivalent fits.
- Do not override PatternFly component internals, `.pf-v*` selectors, or spacing/padding to compensate for missing wrappers. Review inline styles, CSS modules, stylesheets, CSS-in-JS, and local token overrides as well as obvious selectors.
- If custom CSS is necessary for an unsupported requirement, keep it narrowly scoped. Verify why supported props, composition, utilities, or tokens are insufficient, and briefly explain the exception in the final summary. Using a token alone does not justify an override.
- For standalone HTML, use documented PatternFly HTML component structures/classes for the selected version. Supply JavaScript, ARIA state updates, focus management, and keyboard behavior required by those examples. Do not emit React-only props into HTML or treat styled markup as a working control.

## Post-generation code checks

Review changed source after prototype generation and bar installation, before final build/export/handoff, and after refinements that change UI. These are code-level checks. Keep the prototype server and browser for the final user handoff; do not run journey, state, interaction, or keyboard walkthroughs here.

1. **Scope:** supply an explicit list of files created/modified by this prototype, including associated styles. In a git workspace, intersect the changeset with staged, unstaged, and untracked changes; exclude unrelated pre-existing edits and generated/vendor files. For standalone or a non-git workspace, use the explicit prototype file list rather than a whole-repository scan.
2. **Structure:** apply `pf-component-check` to scoped PatternFly React files, reading the relevant family references. Check required wrappers, parent/child placement, slots, labels, and semantic structure. Follow the target version's documented examples when a reference differs.
3. **Reuse:** apply `pf-component-reuse-check` to scoped new/changed React controls. Verify matches by role, interaction, and prop coverage. Preserve valid PatternFly compositions and domain wrappers. Honor the helper's replacement approval rules: apply replacements when already authorized; otherwise report the proposed change and request the required choice. Do not expand into untouched committed components.
4. **CSS:** inspect all scoped styles affecting PatternFly components, even when no structural violation was found. Remove compensating overrides after fixing structure; replace unnecessary overrides with supported APIs/utilities. Document necessary exceptions as above.
5. **Standalone equivalent:** the React audits do not scan plain HTML. Compare generated source with the selected HTML examples for wrapper hierarchy, shipped controls, CSS exceptions, event handlers, and ARIA attributes. Label this as an HTML source review, not a React skill pass or browser test.
6. **Fix and recheck:** correct unambiguous issues introduced by this run within the authorized scope; preserve handlers, mocks, routes, and states. Resolve behavior-changing choices through the existing decision flow or report them as pending. Re-run affected source checks and applicable lint/build/type checks after fixes. Leave runtime behavior and visual confirmation for the user to review at handoff or for a separately requested evaluation.

## Completion

Briefly mention the PatternFly structure, reuse, and CSS source checks actually performed. Flag unresolved findings, blocked checks, missing-helper fallbacks, pending replacement decisions, and necessary custom CSS/components only when relevant. Do not generate a separate compliance artifact or full report.

Describe the scope as a code-level review. Do not claim full PatternFly compliance or runtime verification from source inspection or a successful build. Deferred browser review is an expected handoff step, not a failed or blocked code check; never describe an unperformed check as passed.
