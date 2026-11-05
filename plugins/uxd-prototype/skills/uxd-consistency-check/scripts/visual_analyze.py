#!/usr/bin/env python3
# AI-generated script by GPT-6 Luna.
"""Package workspace-local visual evidence; offline use requires only Python."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4


def _safe_path(workspace, value):
    """Reject traversal, outside paths and symlinks before resolving anything."""
    value = Path(value)
    if ".." in value.parts:
        raise ValueError("Path traversal is not allowed")
    path = workspace / value
    if not path.is_relative_to(workspace):
        raise ValueError("Evidence paths must stay inside the workspace")
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError("Symlink evidence paths are not allowed")
    return path


def package_screenshots(workspace, screenshots, output=None, *, page=None,
                        viewport=None, state=None, revision=None, url=None):
    """Return the manifest Path. Relative inputs/outputs are workspace-relative.

    Offline metadata is caller-supplied, never inferred from image dimensions or
    filenames. Only an explicit url opts into browser launch. DOM is serialized
    HTML, not a model interpretation or a guideline compliance assessment.
    """
    workspace = Path(workspace).absolute()
    workspace = _safe_path(workspace, workspace)
    if not workspace.is_dir():
        raise ValueError("Workspace must be an existing directory")
    screenshots = list(screenshots)
    if not screenshots and not url:
        raise ValueError("Supply at least one --screenshot or --url")
    output = _safe_path(workspace, output if output is not None else
                        Path(".artifacts/consistency/evidence") / uuid4().hex / "evidence.json")
    if output.exists():
        raise FileExistsError("Evidence output already exists")
    if not output.is_relative_to(workspace / ".artifacts") or output.suffix != ".json":
        raise ValueError("Evidence JSON output must be inside workspace .artifacts")
    if url and (urlsplit(url).scheme not in ("http", "https") or not urlsplit(url).hostname):
        raise ValueError("Live capture URL must use http or https with a hostname")
    sources = [_safe_path(workspace, source) for source in screenshots]
    if any(not source.is_file() for source in sources):
        raise ValueError("Screenshot inputs must be regular files")
    metadata = {"page": page, "viewport": viewport, "state": state, "revision": revision}
    payloads = [(source.suffix, source.read_bytes(), metadata) for source in sources]
    suffixes = [source.suffix for source in sources] + ([".png"] if url else [])
    targets = [_safe_path(workspace, output.parent / f"screenshot-{index:03d}{suffix}")
               for index, suffix in enumerate(suffixes, 1)]
    dom_target = _safe_path(workspace, output.parent / "dom.html") if url else None
    for target in [*targets, *([dom_target] if dom_target is not None else [])]:
        if target == output:
            raise ValueError("Manifest cannot alias a generated artifact")
        if target.exists():
            raise FileExistsError("Evidence artifact already exists")
    live = _capture(url) if url else None
    live_metadata = metadata
    if live:
        live_metadata = {**metadata, "page": live["page"], "viewport": live["viewport"]}
        payloads.append((".png", live["png"], live_metadata))
    output.parent.mkdir(parents=True, exist_ok=True)
    entries = []
    for target, (_, data, item_metadata) in zip(targets, payloads):
        with target.open("xb") as stream:
            stream.write(data)
        entries.append({"path": target.relative_to(workspace).as_posix(),
                        "sha256": hashlib.sha256(data).hexdigest(), **item_metadata})
    report = {"schema_version": "1.0.0", "screenshots": entries}
    if live and dom_target is not None:
        data = live["dom"].encode("utf-8")
        with dom_target.open("xb") as stream:
            stream.write(data)
        report["dom"] = {"path": dom_target.relative_to(workspace).as_posix(),
                         "sha256": hashlib.sha256(data).hexdigest(), **live_metadata}
    with output.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(report, indent=2) + "\n")
    return output


def _playwright():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Live capture requires requirements-visual.txt and "
            "`python -m playwright install chromium`; use --screenshot for offline evidence."
        ) from exc
    return sync_playwright


def _capture(url):
    provider = _playwright()
    try:
        with provider() as engine:
            browser = engine.chromium.launch(headless=True)
            try:
                page = browser.new_page(viewport={"width": 1280, "height": 800})
                page.goto(url, wait_until="load", timeout=30000)
                return {"dom": page.content(),
                        "png": page.screenshot(type="png", full_page=False),
                        "page": page.url, "viewport": page.viewport_size}
            finally:
                browser.close()
    except Exception as exc:
        raise RuntimeError(f"Live capture failed: {exc}") from exc


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True, type=Path)
    parser.add_argument("--screenshot", action="append", default=[])
    parser.add_argument("--url", help="Explicitly opt in to live Chromium capture")
    parser.add_argument("--output")
    args = parser.parse_args(argv)
    try:
        output = package_screenshots(args.workspace, args.screenshot, args.output, url=args.url)
    except (OSError, ValueError, RuntimeError) as exc:
        parser.error(str(exc))
    print(output.relative_to(args.workspace.absolute()).as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
