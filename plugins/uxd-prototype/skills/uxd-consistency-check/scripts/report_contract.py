# AI-generated script by GPT-6 Luna.
"""Stdlib producer invariants; full JSON Schemas live under schemas/v1."""


def validate_report(report):
    if report.get("schema_version") != "1.0.0" or report.get("source") != "uxd-consistency-check":
        raise ValueError("unsupported consistency report contract")
    summary = report["summary"]
    fields = ("total_guidelines_checked", "violations", "warnings", "passes")
    if any(type(summary.get(field)) is not int or summary[field] < 0 for field in fields):
        raise ValueError("summary counts must be nonnegative integers")
    if summary["total_guidelines_checked"] != sum(summary[field] for field in fields[1:]):
        raise ValueError("guideline-group summary math does not match")
    evaluated = report["coverage"]["evaluated_rules"]
    if len(evaluated) != len(set(evaluated)) or len(evaluated) != summary["total_guidelines_checked"]:
        raise ValueError("evaluated guideline groups do not match summary")
    if set(evaluated) & set(report["coverage"]["unevaluated_rules"]):
        raise ValueError("a rule cannot be both evaluated and unevaluated")
    for finding in report["source_mode"]["violations"]:
        if finding["guideline_id"] not in evaluated:
            raise ValueError("finding references an unevaluated guideline")
        if finding["review_candidate"] and (finding["severity"], finding["verdict"], finding["confidence"], finding["check_method"]) != ("warning", "FLAGGED", "low", "automated_candidate"):
            raise ValueError("review candidates cannot be promoted to errors")
    errors = {finding["guideline_id"] for finding in report["source_mode"]["violations"] if finding["severity"] == "error"}
    warnings = {finding["guideline_id"] for finding in report["source_mode"]["violations"]} - errors
    if (len(errors), len(warnings)) != (summary["violations"], summary["warnings"]):
        raise ValueError("source finding groups do not match summary")
