"""Prepare a read-only Productize handoff from host-reviewed local inputs (Python 3)."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import quote


def prepare(*, workflow, result, support, link_from, target, observed, producer,
            catalog=None, pf_router=None, direct_reason=None):
    """Open only the caller's selected sources. Never invoke a producer or mark a check complete."""
    unknown = {"", "unknown", "unverified", "n/a"}
    target = target.strip()
    observed = (observed or "").strip()
    if target.lower() in unknown or not producer.strip():
        raise ValueError("Supply the confirmed target revision and actual evidence producer")
    if pf_router and direct_reason:
        raise ValueError("Choose the PF router or the documented direct-catalog fallback")
    if bool(catalog) != bool(pf_router or direct_reason):
        raise ValueError("PF fit needs a catalog and either the router or its fallback reason")
    if not Path(link_from).is_dir():
        raise ValueError("Link base must be the existing reviewer-facing document directory")

    sources = {}
    def opened(label, filename):
        path = Path(filename)
        data = path.read_bytes()
        if not data.strip():
            raise ValueError(f"Empty {label}: {path}")
        href = quote(os.path.relpath(path.absolute(), Path(link_from).absolute()), safe="/.")
        sources[label] = {"path": str(path), "sha256": hashlib.sha256(data).hexdigest(),
                          "text": data.decode("utf-8"), "link": f"[{label}]({href})"}

    opened("Productize workflow", workflow)
    if pf_router:
        opened("PatternFly router", pf_router)
    if catalog:
        opened("Interaction catalog", catalog)
    opened("Result", result)
    opened("Supporting evidence", support)
    scope = ("unknown" if observed.lower() in unknown else
             "current_observation" if observed == target else "prior_build_only")
    label = {"unknown": "build unknown", "current_observation": "matching build",
             "prior_build_only": "prior build only"}[scope]
    route = ("PF router and interaction catalog opened. " if pf_router else
             f"Direct interaction catalog ({direct_reason}). " if catalog else "")
    return {"scope": scope, "checked_now": False, "sources": sources,
            "direct_catalog_reason": direct_reason,
            "interpretation": ("Give one verdict for the observed variant. Apply the specific "
                               "versioned guidance before the general catalog. If this variant "
                               "allows the observed behavior, say it fits; do not also call it "
                               "a mismatch. If variant or guidance is unclear, say unverified."
                               if catalog else
                               "Describe only what the cited result supports on its revision."),
            "record_line": (f"Supplied evidence from {producer}; target: {target}; "
                            f"evidence revision: {observed or 'unknown'} ({label}). "
                            f"{route}{sources['Result']['link']} · {sources['Supporting evidence']['link']}. "
                            "No new runtime observation.")}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workflow", default=Path(__file__).resolve().parents[1] / "SKILL.md")
    for key in ("result", "support", "link-from", "target", "producer"):
        parser.add_argument(f"--{key}", required=True)
    for key in ("observed", "catalog", "pf-router", "direct-reason"):
        parser.add_argument(f"--{key}")
    try:
        print(json.dumps(prepare(**vars(parser.parse_args())), ensure_ascii=False))
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Evidence handoff blocked: {exc}\n")
