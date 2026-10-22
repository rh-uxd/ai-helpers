# AI-generated script by GPT-6 Luna.
"""Conservative same-label peer comparisons; never infer a normative rule."""
from collections import defaultdict
import re
from scoped_sources import mask_comments

ELEMENT = re.compile(r"<(Button|button|a|Link|Label|label)\b([^>]*)>([^<{}]+)</\1>")
ATTRIBUTE = re.compile(r"\b(variant|className|class|role)\s*=\s*['\"]([^'\"]+)['\"]")


def compare_internal(files, changed_lines=None, aliases=None):
    aliases = aliases or {name: name for name in files}
    groups = defaultdict(list)
    targets = []
    for file, text in files.items():
        text = mask_comments(text)
        for match in ELEMENT.finditer(text):
            component, attributes, label = match.groups()
            label = " ".join(label.split()).casefold()
            line = text.count("\n", 0, match.start()) + 1
            end = text.count("\n", 0, match.end()) + 1
            record = {"file": file, "line_start": line, "line_end": end, "evidence": match.group(),
                      "signature": {"component": component, **dict(ATTRIBUTE.findall(attributes))}}
            family = {"Button": "button", "Link": "a", "Label": "label"}.get(component, component)
            key = (family, label)
            groups[key].append(record)
            if changed_lines is None or any(number in changed_lines.get(file, set()) for number in range(line, end + 1)):
                targets.append((key, record))
    findings = []
    comparisons = []
    missing = []
    for key, target in targets:
        # Compare independent instances, not whole files. Aliases, overlapping
        # line ranges, and repeated quotes are not independent source evidence.
        peers = []
        seen = {(aliases[target["file"]], target["evidence"])}
        occupied = defaultdict(list)
        occupied[aliases[target["file"]]].append((target["line_start"], target["line_end"]))
        for peer in sorted(groups[key], key=lambda item: (item["file"], item["line_start"], item["line_end"], item["evidence"])):
            physical = aliases[peer["file"]]
            start, end = peer["line_start"], peer["line_end"]
            evidence = (physical, peer["evidence"])
            if evidence in seen or any(start <= right and left <= end for left, right in occupied[physical]):
                continue
            seen.add(evidence)
            occupied[physical].append((start, end))
            peers.append(peer)
        if not peers:
            missing.append({"file": target["file"], "line_start": target["line_start"], "label": key[1]})
            continue
        differs = any(peer["signature"] != target["signature"] for peer in peers)
        comparison = {**target, "label": key[1], "peers": peers, "different": differs}
        comparisons.append(comparison)
        if differs:
            findings.append({**comparison, "severity": "warning", "verdict": "FLAGGED", "confidence": "low",
                             "review_candidate": True, "check_method": "internal_comparison",
                             "description": "Same-label controls differ in source treatment; confirm their contexts are comparable.",
                             "suggestion": "Review both contexts; existing peers are not normative design guidance."})
    return {"status": "partially_evaluated" if comparisons and missing else "evaluated" if comparisons else "insufficient_comparators",
            "reason": "Some controls have no comparable peers." if comparisons and missing else "Source comparison only; not a rendered or guideline compliance verdict." if comparisons else "insufficient comparable examples",
            "comparisons": comparisons, "findings": findings, "uncompared_targets": missing}
