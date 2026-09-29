# Settings Page — Two Design Directions

## Option A: Single-page accordion layout

### Layout
- Full-width page with a top heading "Settings"
- Six accordion panels stacked vertically: General, Notifications, Integrations,
  Security, Appearance, Advanced
- Only one accordion open at a time; opening a new one collapses the previous
- Each panel contains its form fields inline when expanded

### Visual hierarchy
- Section headings are 18 px semibold with a subtle bottom border
- Form labels are 14 px regular; inputs use default PatternFly styling
- Primary "Save" button fixed at the bottom-right of the viewport

### Accessibility
- Accordion headers are `<button>` elements with `aria-expanded`
- Focus order follows DOM order top-to-bottom
- No skip-links to jump between sections
- Colour contrast on section descriptions is 3.8:1 (below 4.5:1 AA threshold)

### Content & microcopy
- Section descriptions are one sentence each, placed below the heading
- Error messages appear inline beneath each invalid field
- "Save" button label does not change to indicate unsaved state
- No confirmation dialog before discarding unsaved changes

### State coverage
- Loading state: skeleton placeholders inside each accordion panel
- Error state: inline field-level errors only; no page-level error banner
- Empty state: default values pre-filled; no explicit empty-state message
- Success state: toast notification "Settings saved" appears top-right

---

## Option B: Side-nav tabbed layout

### Layout
- Left vertical tab nav (200 px) listing six sections: General, Notifications,
  Integrations, Security, Appearance, Advanced
- Content area to the right shows the selected section's form
- Active tab highlighted with a blue left-border accent
- URL updates with section slug (e.g. /settings/notifications)

### Visual hierarchy
- Page heading "Settings" is 24 px bold, left-aligned above the tab nav
- Active section title repeated as a sub-heading (18 px semibold) in the content area
- Form fields grouped with fieldset + legend for related controls
- Primary "Save" and secondary "Reset" buttons anchored at the bottom of the
  content area, inside a sticky footer bar

### Accessibility
- Tab nav uses `role="tablist"` with `aria-selected` on active tab
- Each section content wrapped in `role="tabpanel"` with `aria-labelledby`
- Focus moves to the content area heading when a tab is activated
- Colour contrast on all text meets 4.5:1 AA minimum
- Keyboard: arrow keys navigate tabs, Enter/Space activates

### Content & microcopy
- Each section has a two-sentence description plus a "Learn more" link to docs
- "Save" button changes to "Save changes" with a dot indicator when form is dirty
- "Reset" button tooltip reads "Revert to last saved values"
- Confirmation modal on navigation away with unsaved changes:
  "You have unsaved changes. Discard or continue editing?"

### State coverage
- Loading state: full-page spinner on initial load, skeleton inside content area
  when switching tabs
- Error state: field-level inline errors plus a page-level alert banner
  summarizing the count of errors
- Empty state: integrations section shows an empty-state illustration with a
  "Connect your first integration" CTA
- Success state: inline success alert below the form that auto-dismisses after 5 s
