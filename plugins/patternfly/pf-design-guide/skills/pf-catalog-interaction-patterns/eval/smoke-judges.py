#!/usr/bin/env python3
"""Offline text-judge smoke tests: python3 /absolute/path/to/eval/smoke-judges.py.

Uses the eval's PyYAML dependency and the harness's (outputs, arguments) wrapper.
Synthetic recommendations test guidance coverage, not a running UI or model output.
No model, MCP, network, or new test framework is involved.
"""

from pathlib import Path
import textwrap

import yaml

ROOT = Path(__file__).resolve().parent
CONFIG = yaml.safe_load((ROOT / "eval.yaml").read_text())
CASES = {
    path.parent.name: yaml.safe_load(path.read_text())
    for path in sorted((ROOT / "cases").glob("*/annotations.yaml"))
}
CHECKS = {}
for judge in CONFIG["judges"]:
    scope = {}
    exec("def check(outputs, arguments):\n" + textwrap.indent(judge["check"], "    "), scope)
    CHECKS[judge["name"]] = (judge, scope["check"])

WIZARD = (
    "Use Wizard and Form. Guard every forward navigation path, including Next and "
    "sidebar links, using current prerequisite validity. Visited does not imply valid. "
    "If earlier Details input becomes invalid, recheck even previously visited steps. "
    "Allow backward navigation to correct errors."
)
EXITS = (
    "Use Modal and Wizard with a shared dirty-work confirmation guard for Cancel, "
    "Close, Escape, backdrop and route changes. Exit unchanged work without a warning. "
    "Continue editing preserves entered data and the current step. "
    "Cancel does not save or submit; confirmed discard abandons the work."
)
ERRORS = (
    "Use Form, FormGroup, HelperText and Alert. Set aria-describedby to unique error "
    "element IDs that exist in the rendered DOM. Expose aria-invalid and error text, "
    "not color alone. Announce relevant error updates with contextual live regions "
    "near the affected field. Offer an error summary with links to fields and focus "
    "the first invalid field."
)
ASYNC = (
    "Use Button, Spinner and Alert. While pending show loading feedback. An in-flight "
    "guard in the submit handler prevents duplicate requests across all submit paths. "
    "On failure preserve input and offer a retry. A timeout has an unknown outcome: "
    "reconcile server status or reuse the same idempotency key for a safe retry. "
    "Show success only after a confirmed server result."
)
POSITIVES = {
    "provisioning-wizard-navigation": WIZARD,
    "dirty-modal-wizard-exit": EXITS,
    "long-form-validation": ERRORS,
    "submission-recovery": ASYNC,
    "unchanged-modal-exit": "Use Modal and Wizard. If nothing was edited, dismiss immediately.",
    "hover-reveal-content": "Tooltip and Truncate support this interaction.",
    "drag-reorder-items": "DragDrop, DualListSelector, Table and DataList are options.",
    "negative-non-pf": "Use Vuetify's v-tooltip in this Vue application.",
}
EXPECTED_ROUTES = {
    "provisioning-wizard-navigation": {"correct_components", "wizard_all_navigation_paths", "wizard_visited_is_not_valid"},
    "dirty-modal-wizard-exit": {"correct_components", "unsaved_shared_exit_policy", "unsaved_exit_state_semantics"},
    "long-form-validation": {"correct_components", "field_error_associations", "field_error_updates_and_discovery"},
    "submission-recovery": {"correct_components", "async_pending_and_input_recovery", "async_unknown_outcome_and_confirmed_success"},
    "unchanged-modal-exit": {"correct_components", "unsaved_exit_state_semantics"},
    "hover-reveal-content": {"correct_components", "hover_not_popover"},
    "drag-reorder-items": {"correct_components", "multiple_options"},
    "negative-non-pf": {"gate_non_pf"},
}

count = 0


def test(judge_name, case, text, expected, label):
    global count
    _, check = CHECKS[judge_name]
    result, reason = check({"conversation": text, "annotations": CASES[case]}, {})
    assert isinstance(result, bool), (judge_name, result)
    assert result == expected, (label, judge_name, expected, result, reason)
    count += 1


# Validate configuration, schema, conditional routing, and all old/new positive cases.
assert CONFIG["skill"] == "pf-design-guide:pf-catalog-interaction-patterns"
assert "mcp__*" in CONFIG["permissions"]["deny"]
assert set(CASES) == set(EXPECTED_ROUTES)
assert set(CONFIG["thresholds"]) == set(CHECKS)
for case, metadata in CASES.items():
    prompt = yaml.safe_load((ROOT / "cases" / case / "input.yaml").read_text())["prompt"]
    assert isinstance(prompt, str) and prompt.strip()
    active = {
        name for name, (judge, _) in CHECKS.items()
        if eval(judge["if"], {}, {"annotations": metadata})
    }
    assert active == EXPECTED_ROUTES[case], (case, active)
    for name in active:
        test(name, case, POSITIVES[case], True, "case positive")
        test(name, case, "", name == "gate_non_pf", "empty output")

# Additional phrasings should not require verbatim reference prose.
PARAPHRASES = [
    ("wizard_visited_is_not_valid", "provisioning-wizard-navigation",
     "Visitation and validity are separate state. Revalidate when earlier input becomes invalid. Permit backward navigation."),
    ("unsaved_exit_state_semantics", "dirty-modal-wizard-exit",
     "Exit unchanged forms without a discard warning. Continue editing preserves values, validation context, and wizard position. Cancel never invokes save; discard exits without saving."),
    ("field_error_associations", "long-form-validation",
     "Use stable, unique control and helper/error IDs. Connect error messages with aria-describedby to existing helper IDs. Expose invalid state programmatically, not color alone."),
    ("field_error_updates_and_discovery", "long-form-validation",
     "Make relevant dynamic feedback perceivable. Use a polite live region for dynamically rendered helper messages when appropriate. Focus an invalid control."),
    ("async_unknown_outcome_and_confirmed_success", "submission-recovery",
     "A timeout can leave an unknown outcome: reconcile status before retry. Report success only when the intended outcome is confirmed."),
    ("wizard_all_navigation_paths", "provisioning-wizard-navigation",
     "Wizard: guard both Next and sidebar links using current prerequisite validity."),
    ("wizard_visited_is_not_valid", "provisioning-wizard-navigation",
     "Completed does not imply valid. Recompute validity when earlier input is invalid. Allow back to fix it."),
    ("unsaved_shared_exit_policy", "dirty-modal-wizard-exit",
     "Centralize unsaved-work confirmation: Cancel, Close, Esc, outside-click dismissal and page navigation use the same guard."),
    ("unsaved_exit_state_semantics", "dirty-modal-wizard-exit",
     "Prompt only for modified work. Keep editing retains values and the same step. Never save on Cancel."),
    ("field_error_associations", "long-form-validation",
     "Give each helper message distinct IDs matching rendered elements, referenced via aria-describedby. Set the invalid state and textual feedback beyond colour."),
    ("field_error_updates_and_discovery", "long-form-validation",
     "Use aria-live=polite to announce local changes. Scroll to the first error."),
    ("async_pending_and_input_recovery", "submission-recovery",
     "While awaiting the response show a Spinner. Lock the request guard to permit one request in flight. Keep values on rejection so users can correct and try again."),
    ("async_unknown_outcome_and_confirmed_success", "submission-recovery",
     "A connection timeout is ambiguous: check the operation status before retry. Show success only after HTTP 201 Created."),
]
for name, case, text in PARAPHRASES:
    test(name, case, text, True, "paraphrase")

# Each mutation changes one behavior while leaving the remaining guidance intact.
NEGATIVES = [
    ("wizard_all_navigation_paths", "provisioning-wizard-navigation", WIZARD,
     "Guard every forward navigation path, including Next and sidebar links, using current prerequisite validity.",
     "Validate required Details on Next; disable Next while invalid. All sidebar navigation stays available."),
    ("wizard_visited_is_not_valid", "provisioning-wizard-navigation", WIZARD,
     "Visited does not imply valid.", "Visited steps always count as valid."),
    ("wizard_visited_is_not_valid", "provisioning-wizard-navigation", WIZARD,
     "Visited does not imply valid.", "Visited steps never need revalidation."),
    ("wizard_visited_is_not_valid", "provisioning-wizard-navigation", WIZARD,
     "recheck even previously visited steps", "recheck new steps, but visited links remain available"),
    ("unsaved_shared_exit_policy", "dirty-modal-wizard-exit", EXITS,
     "with a shared dirty-work confirmation guard for Cancel, Close, Escape, backdrop and route changes",
     "where only Cancel calls the shared dirty-work confirmation handler; Close, Escape, backdrop and route changes dismiss directly"),
    ("unsaved_shared_exit_policy", "dirty-modal-wizard-exit", EXITS,
     "Close, Escape, backdrop", "Close, backdrop"),
    ("unsaved_exit_state_semantics", "dirty-modal-wizard-exit", EXITS,
     "Exit unchanged work without a warning.", "Warn before every exit, including unchanged work."),
    ("unsaved_exit_state_semantics", "dirty-modal-wizard-exit", EXITS,
     "Continue editing preserves entered data and the current step.",
     "Continue editing keeps input but resets the current step."),
    ("unsaved_exit_state_semantics", "dirty-modal-wizard-exit", EXITS,
     "Cancel does not save or submit", "Cancel saves the draft"),
    ("unsaved_exit_state_semantics", "dirty-modal-wizard-exit", EXITS,
     "Cancel does not save or submit", "Cancel must not exit without saving"),
    ("field_error_associations", "long-form-validation", ERRORS,
     "Set aria-describedby to unique error element IDs that exist in the rendered DOM.",
     "Give inputs unique IDs, but use the same rendered error ID for every aria-describedby."),
    ("field_error_associations", "long-form-validation", ERRORS,
     "IDs that exist in the rendered DOM", "IDs even when the elements are absent"),
    ("field_error_associations", "long-form-validation", ERRORS,
     "aria-describedby", "title"),
    ("field_error_associations", "long-form-validation", ERRORS,
     "Expose aria-invalid and error text", "Expose error text"),
    ("field_error_associations", "long-form-validation", ERRORS,
     "error text, not color alone", "error text in red"),
    ("field_error_associations", "long-form-validation", ERRORS,
     "Expose aria-invalid and error text, not color alone.", "Mark errors red only."),
    ("field_error_updates_and_discovery", "long-form-validation", ERRORS,
     "live regions", "static helper text"),
    ("field_error_updates_and_discovery", "long-form-validation", ERRORS,
     "Announce relevant error updates with contextual live regions near the affected field.",
     "Render local helper text; announce every field's errors globally through aria-live on each change."),
    ("field_error_updates_and_discovery", "long-form-validation", ERRORS,
     "Offer an error summary with links to fields and focus the first invalid field.",
     "Add an error summary without links or focus movement."),
    ("async_pending_and_input_recovery", "submission-recovery", ASYNC,
     "An in-flight guard in the submit handler prevents duplicate requests across all submit paths.",
     "Disable only the Create Button to prevent duplicate requests; leave Enter submission unrestricted."),
    ("async_pending_and_input_recovery", "submission-recovery", ASYNC,
     "On failure preserve input and offer a retry.", "On failure clear the form and offer a retry."),
    ("async_unknown_outcome_and_confirmed_success", "submission-recovery", ASYNC,
     "reconcile server status or reuse the same idempotency key for a safe retry",
     "retry immediately with a new idempotency key"),
    ("async_unknown_outcome_and_confirmed_success", "submission-recovery", ASYNC,
     "Show success only after a confirmed server result.", "Show success after the user confirms Create."),
    ("async_unknown_outcome_and_confirmed_success", "submission-recovery", ASYNC,
     "Show success only after a confirmed server result.", "Show success after a three-second timer."),
]
for name, case, base, old, new in NEGATIVES:
    assert old in base
    test(name, case, base.replace(old, new), False, new)

test("unsaved_exit_state_semantics", "unchanged-modal-exit",
     "An unchanged Modal/Wizard must not close without confirmation.", False, "clean visit warned")
print(f"PASS: {count} direct checks; {len(CASES)} cases routed; "
      f"{len(CHECKS)} judge blocks compiled; no models or MCP")
