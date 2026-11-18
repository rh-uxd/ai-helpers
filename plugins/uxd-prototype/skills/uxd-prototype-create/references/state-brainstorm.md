# State brainstorm checklist

Required during Step 4 **before** writing `artifacts/{ID}/states.json`.
Do not stop at “happy path + one error.” Walk each page/route through the
condition axes below and keep every axis that produces a **distinct on-load
visual**.

Field rules (`id`, `name`, `description`, `default`): `uxd-prototype-export/references/states-schema.md`.
Write the file as `states.json` and name each page's collection `states`.
Mock wiring (end-state on load): [state-mocks.md](state-mocks.md).

## Condition axes

For each distinct journey `route`, brainstorm:

| Axis | Typical variants |
|------|------------------|
| Data presence | populated / empty / partial |
| Association | present / absent / stale |
| Match quality | exact / fuzzy-or-suffix / none *(when the feature involves matching)* |
| Availability / permission | available / unavailable / forbidden |
| Outcome after primary action | success toast, warning toast, inline alert, unchanged selection |
| Recovery | user overrode the suggested or failed path |
| Load / validation errors | fetch failure, field validation, conflict |

Derive candidates from acceptance criteria **and** these axes. ACs often name
only the happy path and one failure; matching, absence, and recovery branches
are easy to miss and must still be considered.

## Selection rules

1. Prefer **3–7 states per page** that change what is visible on load.
2. Skip duplicates that would look identical after load (same prompt, model,
   alerts, empty state, etc.).
3. Keep modal/drawer/open overlays in journey step `actions`.
4. Every state entry must name the **end-state the page should render on
   load** in one line (use `description` for this).
5. Always include a `default` state (or mark exactly one `default: true`).

## Description format

Write `description` as the on-load end-state, not the user journey to get there:

```text
Good: "Prompt loaded; associated model exact-selected; info toast visible"
Bad:  "User opens Load prompt, picks a row, and confirms"
```

## Quick self-check before writing states.json

- [ ] Walked every axis above for each page (not only AC bullets)
- [ ] Each state has a one-line on-load end-state in `description`
- [ ] No two states would render the same UI after load
- [ ] Modal and drawer open belong in journey `actions`
