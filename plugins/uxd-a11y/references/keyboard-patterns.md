# Keyboard patterns

Choose by actual role, task, and interaction model, not component name alone. Native browser controls can use platform conventions. APG pattern deviations are not automatically WCAG failures; demonstrate the barrier and cite its authority separately. Test only applicable patterns and record which variants were exercised.

## KEY-04 — Activation and composite navigation

| Pattern | Checks and valid alternatives |
|---|---|
| Button/link | Buttons activate with Enter and Space; links with Enter. Space activation is not required for links. Verify actual outcome and no accidental duplicate activation. |
| Checkbox/switch/radio | Space changes state. For radio groups, check pattern-appropriate arrows and selection; toolbar variants differ. Verify state exposure as well as appearance. |
| Tabs | Arrow keys move among tabs by orientation; Tab enters/leaves the tablist. Manual activation uses Enter/Space; automatic activation is valid when appropriate. Verify selected panel, entry, and exit. |
| Menu/menu button | Open from trigger, navigate items with appropriate arrows, activate, dismiss with Escape, and verify focus return. Check submenu direction and disabled-item behavior against the chosen pattern; Home/End/typeahead support varies. |
| Listbox/combobox | Distinguish select-only, editable, and multiselect models from menus. Check navigation, selection/commit, dismissal, and editing. Editable combobox DOM focus may stay on input with active-descendant navigation; do not force focus onto each option or consume normal text-editing keys. |
| Disclosure | Keyboard toggles content and expanded state; trigger focus can remain. Verify content reachability without imposing modal containment. |
| Tooltip | Reach useful supplementary content by keyboard; test Escape and retained trigger focus where applicable. For author-controlled hover/focus content assess dismissible, hoverable, persistent behavior and exceptions. Equivalent available information matters; do not automatically add a tab stop to every decorated static element. |
| Basic tree | Up/Down traverse visible nodes; Right expands or enters children; Left collapses or reaches parent. Check Home/End and activation/selection appropriate to the single/multiple-selection model. Focus and selection need not move together. |

## KEY-05 — Task-specific patterns

- **Calendar:** test all four day arrows, week movement, month boundaries, selection, and retained context; match the calendar's documented pattern rather than treating every grid as a date picker.
- **Jump links/back to top:** activate using the actual control's keys; verify the destination is available and subsequent keyboard navigation continues meaningfully there. Scrolling alone is insufficient evidence, but a particular tabindex implementation is not mandatory.
- **Reordering/dragging:** exercise the offered keyboard alternative. For a lift/move/drop model, test initiation, movement, commit, cancellation, and retained focus. Move-up/down buttons or another operable method may be valid alternatives. Tree/status text is not proof of speech. Keyboard success alone does not prove the separate single-pointer, no-drag requirement of WCAG 2.5.7.
- **Navigation flyout:** distinguish disclosure navigation, links with separate toggles, and menu semantics. Check opening, access to children, closing, and meaningful return. Do not force Space activation on links or menu arrows onto ordinary site navigation.

## PF-03 — Conditional PatternFly variants

Verify installed version, composition, and documented interaction before selecting these checks. These are variant probes, not requirements imposed on all custom widgets:

- **Drilldown menu:** enter the child context, operate its items, use its supported back mechanism, and verify return to the originating parent item.
- **Tree with separate selection/expansion:** where horizontal arrows traverse row controls, test that path and vertical movement between rows, then activate expansion and selection independently. Do not replace every basic tree's Left/Right expansion with this model.
- **Menu items with additional actions:** test horizontal access to actions, return to primary item, vertical row movement, and activation of the focused action.
- For PF CalendarMonth, JumpLinks, BackToTop, tooltips, and flyouts, apply the task checks above and investigate ownership with [PF source responsibilities](patternfly-source.md). Do not infer correct behavior just from a PF import.

## Sources

- [APG pattern index](https://www.w3.org/WAI/ARIA/apg/patterns/) — select the exact interaction model.
- [APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [APG combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [APG tree view](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
- [WCAG hover/focus content](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)
- [WCAG dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
