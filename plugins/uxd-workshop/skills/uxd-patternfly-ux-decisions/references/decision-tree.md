# PatternFly UX decision tree

This is the source of truth for how UX decisions are made. Read every section
from top to bottom. Do not skip ahead even if you think you know the answer.

This tree chooses the **PatternFly target** first. If implementation evidence
exists, compare the current surface to the target **after** reaching a leaf.
Repeated local divergence can raise an override weight, but it does **not**
change the target by itself.

After choosing the PF target, classify the current implementation as
`aligned`, `extension`, `drift`, or `unknown` before scoring drift.

Start at **0**. Follow the routing to a section. Apply the defaults and rules.
Stop at a leaf, record intent profile ID(s), then use PatternFly docs.

---

## 0. What evidence do you have?

Determine whether you can inspect the current implementation before making a
recommendation.

- **Full evidence** — repo plus running UI
- **Partial evidence** — repo only, or UI / screenshots only
- **No evidence** — no repo, no running UI, no screenshots

Rules:

1. Count only **comparable** surfaces: same user goal, similar risk, and
   similar page context.
2. One comparable divergence is an exception. Two is a candidate local
   override. Three or more is a strong local default candidate.
3. Product-only evidence stages a `project` override first. Do not call it
   cross-project until another product confirms the same divergence.
4. If evidence is partial, lower confidence and avoid claiming a site standard
   unless the pattern is obvious and repeated.
5. If there is no evidence, do **not** infer a local override from memory. Use
   the tree and ask a short preference question only if it would materially
   improve the result.
6. If PF guidance is thin and the current product behavior may be net-new, use
   `unknown` or `extension` before calling it `drift`.

---

## 1. What is the user trying to do?

First classify the job. A selection means the user needs to *choose* from
options in a group. A text input means the user needs to *type*. A display
means the user needs to *read*.

**Channel before chrome:** If the prompt says "notification," "notify," or
"alert the user" as a *product channel* (email, in-app inbox, push), do **not**
jump to `NotificationDrawer` or a masthead badge.

- Email only -> out of PatternFly chrome
- In-app inbox -> then consider `NotificationDrawer` + `NotificationBadge`
- Both -> specify each channel separately

**Feature showcase vs docs:** If the job is discover or try capabilities, route
to **6 (Lists and collections)** rather than a passive text display.

**Current implementation is not the target:** Reach the PF target first, then
compare the current implementation to it.

```text
User goal unclear?
  -> Ask one clarifying question, then restart at 1

Pick one or more items from a set?
  -> 2 (Selection)

Collect or edit structured data via text inputs?
  -> 3 (Data collection)

Confirm, warn, or block on risk?
  -> 4 (Risk and confirmation)

Read or display information without editing?
  -> 5 (Display)

Compare two or more entities on metrics over time?
  -> 5c (Compare over time)

Browse, filter, act on a collection, or showcase capabilities?
  -> 6 (Lists and collections)

Navigate sections or hierarchy?
  -> LEAF: navigate-hierarchy

Show progress, success, warning, or error?
  -> LEAF: status-feedback

Primary CTA for the current view?
  -> LEAF: primary-action
```

---

## 2. Selection

### 2a. Single select

- **Default:** Radio button
- **Use switch only for:** one binary state, not mutually exclusive alternatives
- **Use tabs only for:** navigation between peer sections, not as the default
  control for choosing one option in a field
- **LEAF:** `select-one`

### 2b. Multi-select

- **Default:** Checkbox
- **Alternatives:** table with selectable rows, DualListSelector
- **LEAF:** `select-many`

### 2c. Removable filter or category chips

- **LEAF:** `allow-remove`

Typography and spacing rules:

- Show checkboxes and radio buttons with labels
- Give the group the same bottom spacing as a text input
- Required groups should return the user to the section with clear error text

---

## 3. Data collection

### Text input rules

- Do not use placeholder text as the only instruction
- Always use a label
- Always provide helper text describing the exact expected format
- Use failure states for format issues; do not add decorative success states

### Routing

```text
One screen
  -> LEAF: single-page-data-collection or settings-edit
  -> Default: Form, FormSection

Multiple steps, user must complete sequence
  -> LEAF: sequential-data-collection
  -> Default: Wizard plus Form

Focused task without leaving page context
  -> LEAF: workflow-overlay
```

**Overlay gate:** High risk, destructive submit, or more than five fields with
complex validation -> lean overlay. Low risk, settings-style -> prefer inline.

When the leaf is `workflow-overlay`, pick the host explicitly:

- **Modal** — critical interruption, hard stop, confirmation, or strict task
  focus
- **Drawer** — contextual review or editing tied to an object already visible on
  the page
- **Inline** — low-risk settings or short edits that benefit from staying in
  flow

If the current product already uses low-risk modals for a comparable task, that
is **divergence evidence**, not a silent PF default.

---

## 4. Risk and confirmation

```text
Irreversible or destructive?
  -> LEAF: confirm-destructive
  -> Pattern: Modal plus explicit confirm

Critical interruption that must block the current task?
  -> LEAF: workflow-overlay
  -> Pattern: Modal

Reversible but needs attention?
  -> LEAF: status-feedback or workflow-overlay
```

If three or more comparable non-critical modals exist on the site, record:

- a **high drift weight** because the product is still far from the PF target
- a **high override weight** because the product may have a strong local
  convention

---

## 5. Display

Text-based displays only. If the user needs to interact with anything beyond
links or buttons, re-check whether this is really a display or a form.

### Host-surface gate

When adding a signal, badge, lock, status, or secondary CTA to an object the
user is already inspecting:

1. Is there already a drawer, detail panel, table, toolbar, or tag list?
2. **Yes** -> decorate that host. Do **not** invent a parallel surface.
3. **No** -> only then consider a new surface.
4. **Never** let this gate override destructive confirmation needs.

### 5a. Read-only details

- **LEAF:** `display-details`
- **Default:** DescriptionList, read-only form layout, or detail header plus
  metadata

### 5b. Secondary action in a display surface

- **LEAF:** `secondary-action`
- **Default:** Button or link placed in the existing host

### 5c. Compare over time

Use this only when the comparison is explicit.

- **LEAF:** `compare-metrics`
- **Default:** existing detail surface plus table, chart, or status group that
  fits the metric story

---

## 6. Lists and collections

Use this when users browse, filter, compare, or act on a group of things.

### 6a. Operational lists

- **Default:** Table or data list
- **LEAF:** `filter-list`

### 6b. Discovery or capability showcase

- **Default:** Card grid or gallery with optional filters
- **Keep an existing hero** if the page already has one
- **LEAF:** `filter-list`

### 6c. Row or card actions

- Prefer row-level or card-level actions inside the existing list shell
- Escalate to overlay only when the action itself becomes a workflow

---

## Final checks

Before you deliver:

1. Record the leaf intent profile IDs.
2. Name the PF target surface before naming specific components.
3. Compare the current implementation to that target.
4. Score `PatternFly fit`, `drift_weight`, and `override_weight`.
5. If the fit is `unknown`, return an open design question instead of pretending
   the current pattern is definitely wrong.
