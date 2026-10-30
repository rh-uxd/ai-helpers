# Evaluation Rubric

Criteria for each evaluation dimension.

Each check is classified as **ERROR** (violates a standard — must fix)
or **WARN** (best-practice gap — should fix).

---

## Dimension 1: State Coverage

Evaluates whether components that render dynamic data account for the
full range of states beyond the happy path.

**Code signals — scan for these in the diff:**
- Components that render data from API responses, queries, or props
- Iteration over data arrays (`.map()`, `v-for`, `*ngFor`, `#each`)
- Data fetching patterns (API calls, query hooks, async data loading)
- Conditional rendering based on data state
- Components with loading/error state variables

**ERROR — flag these:**
- Data-dependent component renders with no empty state handling — user
  sees a blank container when data is an empty array
- Data fetch with no error state — fetch failure silently renders
  nothing, returns null, or crashes
- Data-dependent UI renders before data arrives with no loading
  indicator

**WARN — flag these:**
- Loading state exists but empty state is missing, or vice versa
- No overflow handling for user-generated content (long text, large
  numbers, many items)
- No first-run or onboarding state when applicable

**When to skip:**
- Pure layout components, icons, and static content
- Components where a parent already handles the state

---

## Dimension 2: Content & Microcopy

Evaluates the quality of user-facing text — labels, headings, error
messages, and calls to action.

**Code signals — scan for these in the diff:**
- Button labels, link text, heading text
- Error message strings or error rendering components
- Placeholder text, helper text, form labels
- Tooltip content, confirmation dialog text
- User-facing string constants or i18n keys

**ERROR — flag these:**
- Placeholder text ("Lorem ipsum", "TODO", "TBD") in production code
- Error message shows raw error object, stack trace, or status code
  with no user-facing explanation

**WARN — flag these:**
- Generic CTA labels ("Submit", "OK", "Click here") where a specific
  action verb is possible ("Delete user", "Save changes")
- Error message says what went wrong but not what to do next
- Inconsistent terminology (same concept called different things in
  different places)
- Internal engineering jargon exposed to users

**When to skip:**
- Code with no user-facing text (pure logic, data transforms, tests)
- i18n key definitions where the actual text lives elsewhere

---

## Dimension 3: Destructive Action Safety

Evaluates whether code that performs destructive, irreversible, or
high-impact operations includes appropriate confirmation and safety
mechanisms.

**Code signals — scan for these in the diff:**
- Functions or handlers with destructive verbs: `delete`, `remove`,
  `purge`, `destroy`, `drop`, `truncate`, `overwrite`, `revoke`,
  `terminate`
- Click/submit handlers that directly invoke destructive callbacks
  with no intermediate confirmation step
- HTTP DELETE endpoints or destructive mutations
- Batch operations that affect multiple records
- UI controls (buttons, menu items) wired to destructive actions

**ERROR — flag these:**
- Destructive action fires directly on click/submit with no
  confirmation step — user can accidentally delete/remove with a
  single click
- Batch destructive operation with no scope visibility — user cannot
  see how many items will be affected before confirming
- No success/failure feedback after destructive action executes —
  user cannot tell whether the operation completed (state coverage
  applied to destructive context)

**WARN — flag these:**
- Confirmation exists but is generic ("Are you sure?") without
  stating what will happen or what will be affected
- No undo or recovery path for an irreversible action, and
  irreversibility is not communicated to the user
- Destructive action is not visually distinguished from
  non-destructive actions in the same context

**When to skip:**
- Low-risk, easily reversible operations (removing a filter, clearing
  a search, dismissing a notification)
- Internal implementation details not exposed to users (cache
  invalidation, temporary file cleanup)

---

## Per-finding reporting

Report individual findings, not dimension scores. Each finding should
cite the specific file, line, dimension, severity (ERROR or WARN), gap,
and the standard or principle that defines the expectation.
