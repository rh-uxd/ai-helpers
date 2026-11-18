# Design spec

Written during Step 9 to `artifacts/{ID}/{ID}-design-spec.md`, then refreshed when refinement changes screens, journeys, states, or visible copy.

This file is the companion that QE test planning ingests. `journeys.json` and `states.json` stay the export and Prototype Bar schemas. The design spec is a projection of those files plus the built screen markup.

Discovery treats a file as a design spec when the filename matches `design-spec` / `design_spec`, or the first heading matches `# Design Spec`. The preferred filename is `{ID}-design-spec.md` so a Jira attachment named `{KEY}-design-spec.md` is selected exactly. Pass the local path when planning starts before that attachment exists.

## Template

Fill [templates/design-spec.md](templates/design-spec.md). Keep its headings (`## Screens`, `## Journeys`, `## Out of scope`, `## Test environment`, `### Roles`, `### Sample data`) and the ID prefixes `SCR-`, `J-`, `TU-`, and `DATA-`.

## Mapping

| Design spec | Source |
|-------------|--------|
| `SCR-N` | One screen per distinct journey `route`, in first-seen order. N starts at 1. |
| Screen HTML | Built markup for that route: labels, headings, buttons, links, alerts, and empty or error copy. Default state first. Add a `#### State:` block only when another state changes that copy. |
| `J-N` | `journeys[].id` of `journey-N`. Otherwise assign `J-1`… in file order. |
| Journey steps | Numbered. Each step names its `SCR-*`, route, and any user action from `actions` in words ("click Create API key"). |
| `STRAT AC: #N` | Numeric part of `ac_ids` such as `AC-1`. Put the line on the journey and on each screen that journey uses. Omit the line when the source has no numbered criteria. Do not renumber. |
| **Outcome** | Success end-state of the journey, usually the last step or the page's default state description. |
| `## Out of scope` | Only exclusions the source states. If there are none, write `None stated in the source.` |
| `TU-N` | One row per distinct journey `persona`. |
| `DATA-N` | One row per state. Purpose is the state name. Starting state is its `description`. |

## HTML rules

Copy user-visible markup from the prototype that was just built. Standalone: the screen region in `artifacts/{ID}/prototype/`. Workspace: the component markup for that route, reduced to the structure a reader can see (headings, buttons, fields, alerts, empty and error text).

Leave out scripts, the Prototype Bar, and app chrome that is not part of the screen. Do not add controls, validation messages, or routes that are not in the prototype or the source.

## Roles and sample data

Role columns are ID, Role, Permissions, Resource scope, and Journeys (`J-*` ids). Permissions and resource scope come from what that persona does in the cited journeys and the source text. Do not write a bare `TBD`. If the source does not support a permission or resource claim, omit that role row.

Sample-data columns are ID, Screen (`SCR-*`), Purpose, and Starting state. The table heading stays **Sample data** so readers treat the rows as fixtures.

## After writing

Set `design_spec_path` in `metadata.json` and `prototype-summary.yaml` to the file written. On refinement, rewrite the file from the updated prototype, `journeys.json`, and `states.json` so the HTML stays the built UI.
