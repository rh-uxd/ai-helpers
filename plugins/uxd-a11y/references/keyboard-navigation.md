# Keyboard navigation and focus

Use for live interaction or attributed manual observations. Match the actual pattern using [widget patterns](keyboard-patterns.md); load [modal expectations](modal-dialog.md) only for dialogs.

## KEY-01 — Establish a reproducible keyboard journey

- Record URL/task, initial state, browser/platform, viewport, and relevant library version. Identify full app versus isolated demo; apply page checks where relevant.
- Inspect initial names/roles and focus. Use actual keyboard input for the journey, including Tab and Shift+Tab. Record keys and focused role/name before and after significant transitions.
- Distinguish setup through direct focus/click/scripts from user keyboard actions. Synthetic events alone do not establish native keyboard operability.
- Inspect the deepest available active element across shadow roots/frames. If inspection cannot identify focus after an attempted action, report Inconclusive, not a fabricated target.
- Capture screenshots for visibility failures and DOM/tree evidence for semantic/focus failures when available. Lack of screenshots does not invalidate sufficient other evidence.

## KEY-02 — Bypass and sequential navigation

- On pages with repeated blocks, exercise the available bypass mechanism. Accept permanently visible or focus-revealed skip links and valid alternatives; do not universally require a hidden first-tab link. Verify the target and subsequent keyboard continuation.
- Traverse the task forward and backward, including composite entry/exit and meaningful boundaries. Do not equate an arbitrary number of Tab presses with complete coverage.
- Check logical order, visible focus, and whether author-created content entirely obscures the focused component (WCAG 2.4.11). Apply the criterion’s notes for configurable layouts and user-opened content that can be revealed without advancing focus. Partial obscuring can still be a usability concern; do not mislabel it as that AA failure automatically.
- Check hidden/inert controls and disabled behavior. Native disabled controls and aria-disabled controls differ; ARIA alone neither removes focus nor prevents activation. Roving-tabindex composites need not put every item in the Tab sequence.
- Check access to truncated information through the available expansion/description mechanism. Do not add tab stops to every static text node.

## KEY-03 — Scrolling and transitions

- Reach overflow content with keyboard input, including content near the far end. A focusable container is one solution; native scrolling or reachable children can also work. Do not demand `tabindex`, a region role, and a name on every overflow container.
- After opening, closing, deleting, navigating, or validating, inspect actual focus and meaningful continuation. Nonmodal disclosure can keep trigger focus; modal behavior follows its own reference.
- Portaled content needs a usable keyboard path appropriate to its pattern. ID relationships alone do not implement it; do not mandate an arbitrary one-key path for all patterns.
- Verify a way out of nonmodal contexts; distinguish intentional modal containment with dismissal from a prohibited keyboard trap. Avoid completing real destructive actions when safe data/cancel paths suffice.

## Sources

- [WCAG keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- [WCAG bypass blocks](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)
- [WCAG focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [WCAG focus not obscured, minimum](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
