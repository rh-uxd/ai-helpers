#!/usr/bin/env python3
"""Find style declarations that match the project's PatternFly utility classes.

Looks up node_modules/@patternfly/patternfly from the path you pass (or the
current directory) and scans SCSS, CSS, and inline styles. Prints candidates.
Does not edit files.

Class names follow the installed major version (pf-v5-u-* for PatternFly 5,
pf-v6-u-* for PatternFly 6). PatternFly 4 is not supported. There is no
utility for gap, overflow, position, vertical-align, or lengths that are not
on that package's spacer or font scale.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

BP_SUFFIX = re.compile(r"-on-(?:sm|md|lg|xl|2xl)(?:-height)?$")
UTILITY_IMPORT = re.compile(
    r"patternfly-addons|@patternfly/patternfly/utilities|patternfly/utilities/"
)
PF_SELECTOR = re.compile(r"pf-(?:v\d+-)?[cl]-|pf-m-")
SKIP_DIRS = {
    "node_modules",
    "vendor",
    "dist",
    "coverage",
    "tmp",
    "log",
    "public",
    ".git",
    "builds",
    "locale",
    "pkg",
}
STYLE_EXT = {".scss", ".css", ".sass", ".erb", ".html"}
SCRIPT_EXT = {".js", ".jsx", ".ts", ".tsx"}
LONGHAND = {
    "margin-top": "mt",
    "margin-block-start": "mt",
    "margin-right": "mr",
    "margin-inline-end": "mr",
    "margin-bottom": "mb",
    "margin-block-end": "mb",
    "margin-left": "ml",
    "margin-inline-start": "ml",
    "padding-top": "pt",
    "padding-block-start": "pt",
    "padding-right": "pr",
    "padding-inline-end": "pr",
    "padding-bottom": "pb",
    "padding-block-end": "pb",
    "padding-left": "pl",
    "padding-inline-start": "pl",
}
AXIS = {
    "margin-inline": "mx",
    "padding-inline": "px",
    "margin-block": "my",
    "padding-block": "py",
}
UTILITY_PROPS = set(LONGHAND) | set(AXIS) | {
    "margin",
    "padding",
    "display",
    "flex-direction",
    "flex-wrap",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
    "flex",
    "align-items",
    "align-self",
    "align-content",
    "justify-content",
    "float",
    "width",
    "height",
    "min-width",
    "min-height",
    "max-width",
    "max-height",
    "text-align",
    "font-size",
    "font-weight",
    "font-family",
    "color",
    "background-color",
    "background",
    "box-shadow",
    "white-space",
    "word-break",
}
APPROX_WIDTH = {
    "33%": "w-33",
    "33.3%": "w-33",
    "33.33%": "w-33",
    "33.333%": "w-33",
    "66%": "w-66",
    "66.6%": "w-66",
    "66.66%": "w-66",
    "66.67%": "w-66",
    "66.666%": "w-66",
}
def find_patternfly(starts):
    """Return the PatternFly package nearest to a scan path, else from cwd."""
    seen = set()
    points = [Path(start) for start in starts] or [Path.cwd()]
    if all(Path(start) != Path.cwd() for start in starts):
        points.append(Path.cwd())
    for start in points:
        current = start.resolve()
        if current.is_file():
            current = current.parent
        for parent in [current, *current.parents]:
            candidate = parent / "node_modules" / "@patternfly" / "patternfly"
            key = str(candidate)
            if key in seen:
                continue
            seen.add(key)
            if (candidate / "utilities").is_dir():
                return candidate
    return None


def balanced(text, open_index):
    """text[open_index] is '(' or '{'. Return the index of the matching close."""
    opener = text[open_index]
    closer = ")" if opener == "(" else "}"
    depth = 0
    quote = None
    i = open_index
    while i < len(text):
        char = text[i]
        if quote:
            if char == "\\":
                i += 2
                continue
            if char == quote:
                quote = None
            i += 1
            continue
        if char in ("'", '"', "`"):
            quote = char
            i += 1
            continue
        if char == opener:
            depth += 1
        elif char == closer:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return None


def extract_parens(text, start_after_name):
    idx = text.find("(", start_after_name)
    if idx < 0:
        return ""
    end = balanced(text, idx)
    if end is None:
        return ""
    return text[idx + 1 : end]


def version_token(pf_root: Path, version: str):
    """Return 'v5' or 'v6' from the installed package. None when unsupported."""
    major = version.split(".", 1)[0] if version and version[0].isdigit() else ""
    if major.isdigit() and int(major) >= 5:
        return f"v{int(major)}"
    variables = pf_root / "sass-utilities" / "scss-variables.scss"
    if variables.is_file():
        text = variables.read_text(encoding="utf-8", errors="ignore")
        match = re.search(r"\$pf-(v\d+)-global--spacer-map:", text)
        if match and int(match.group(1)[1:]) >= 5:
            return match.group(1)
    return None


def parse_pairs(body, global_name, prefix_stem):
    pairs = []
    name_re = re.compile(r"([a-z0-9-]+)\s*:\s*\(")
    pos = 0
    while True:
        match = name_re.search(body, pos)
        if not match:
            break
        name = match.group(1)
        end = balanced(body, match.end() - 1)
        if end is None:
            break
        inner = body[match.end() : end].strip()
        prop, _, value = inner.partition(" ")
        value = value.strip().strip('"').strip("'")
        value = re.sub(r"\s+", " ", value)
        value = value.replace("#{$pf-global}", global_name)
        value = value.replace("#{$pf-prefix}", prefix_stem)
        if prop and value:
            pairs.append((name, prop.strip(), value))
        pos = end + 1
    return pairs


def load_css_variables(pf_root: Path):
    """Load installed PatternFly CSS custom properties for token resolution."""
    candidates = (
        pf_root / "base" / "patternfly-variables.css",
        pf_root / "patternfly-base.css",
        pf_root / "patternfly.css",
    )
    for path in candidates:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        variables = {}
        for match in re.finditer(r"(--[a-zA-Z0-9-]+)\s*:\s*([^;{}]+);", text):
            variables.setdefault(match.group(1), match.group(2).strip())
        if variables:
            return variables
    return {}


def resolve_css_length(name, variables, seen=None):
    """Resolve a CSS variable chain to pixels, or return None."""
    seen = set() if seen is None else seen
    if name in seen:
        return None
    seen.add(name)
    value = variables.get(name, "").strip()
    ref = re.fullmatch(r"var\((--[a-zA-Z0-9-]+)(?:,[^)]*)?\)", value)
    if ref:
        return resolve_css_length(ref.group(1), variables, seen)
    length = re.fullmatch(r"(-?\d*\.?\d+)(px|rem)", value)
    if not length:
        return None
    number = float(length.group(1))
    return number if length.group(2) == "px" else number * 16.0


def load_catalog(pf_root: Path):
    classes = {}
    keyword = {}
    version = "unknown"
    pkg = pf_root / "package.json"
    if pkg.is_file():
        version = json.loads(pkg.read_text(encoding="utf-8")).get("version", version)
    token = version_token(pf_root, version)
    if token is None:
        return None
    global_name = f"pf-{token}-global"
    prefix = f"pf-{token}-u-"
    prefix_stem = f"pf-{token}-"

    include_re = re.compile(rf"@include\s+pf-{token}-utility-builder\((.*?)\)\s*;", re.S)
    for path in sorted((pf_root / "utilities").rglob("*.scss")):
        if "themes" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for match in include_re.finditer(text):
            args = match.group(1).strip()
            responsive = "breakpoint-list" in args
            first = args.split(",")[0].strip()
            if first.startswith("$"):
                body = extract_parens(text, text.find(first))
                for name, prop, value in parse_pairs(body, global_name, prefix_stem):
                    classes[name] = {"responsive": responsive, "prop": prop, "value": value}
                    keyword[(prop, norm_value(value, global_name))] = name
            else:
                parts = first.split()
                if len(parts) >= 3:
                    name = parts[0]
                    prop = parts[1]
                    value = " ".join(parts[2:]).strip('"').strip("'")
                    classes[name] = {"responsive": responsive, "prop": prop, "value": value}
                    keyword[(prop, norm_value(value, global_name))] = name

    for name in ("screen-reader", "visible", "hidden", "text-truncate"):
        classes.setdefault(name, {"responsive": name != "text-truncate", "prop": None, "value": None})
    for name in ("min-width", "max-width", "min-height", "max-height"):
        classes.setdefault(name, {"responsive": False, "prop": name, "value": None})

    variables = (pf_root / "sass-utilities/scss-variables.scss").read_text(encoding="utf-8", errors="ignore")
    css_variables = load_css_variables(pf_root)
    spacer_px = {}
    for match in re.finditer(
        rf"\$pf-{token}-global--spacer--([a-z0-9]+):\s*pf-size-prem\(([0-9.]+)px\)",
        variables,
    ):
        spacer_px[float(match.group(2))] = match.group(1)
    spacer_names = []
    spacer_map = extract_parens(variables, variables.find(f"$pf-{token}-global--spacer-map"))
    for match in re.finditer(r'"([a-z0-9]+)"\s*:', spacer_map):
        spacer_names.append(match.group(1))
    for name in spacer_names:
        size = resolve_css_length(f"--pf-t--global--spacer--{name}", css_variables)
        if size is not None:
            spacer_px.setdefault(size, name)
    for prop in ("m", "mt", "mr", "mb", "ml", "mx", "my", "p", "pt", "pr", "pb", "pl", "px", "py"):
        for name in spacer_names:
            if name == "auto" and prop.startswith("p"):
                continue
            classes.setdefault(f"{prop}-{name}", {"responsive": True, "prop": None, "value": None})

    font_px = {}
    for match in re.finditer(
        rf"\$pf-{token}-global--FontSize--([a-z0-9]+):\s*pf-font-prem\(([0-9.]+)px\)",
        variables,
    ):
        font_px[float(match.group(2))] = match.group(1)
    font_names = {
        name.removeprefix("font-size-")
        for name in classes
        if name.startswith("font-size-")
    }
    for name in font_names:
        size = resolve_css_length(f"--pf-t--global--font--size--{name}", css_variables)
        if size is not None:
            font_px.setdefault(size, name)

    for prop, zero in (("width", "w-0"), ("height", "h-0")):
        for alias in ("0", "0px", "0%"):
            keyword[(prop, alias)] = zero
    keyword[("flex", "1 1 0%")] = "flex-1"
    keyword[("flex", "1 1 0")] = "flex-1"
    keyword[("flex", "0 0 auto")] = "flex-none"
    keyword[("font-weight", "400")] = "font-weight-normal"
    keyword[("font-weight", "normal")] = "font-weight-normal"
    keyword[("font-weight", "700")] = "font-weight-bold"
    keyword[("font-weight", "bold")] = "font-weight-bold"

    return {
        "version": version,
        "token": token,
        "global": global_name.lower(),
        "prefix": prefix,
        "classes": classes,
        "keyword": keyword,
        "spacer_px": spacer_px,
        "spacer_rem": {px / 16.0: name for px, name in spacer_px.items()},
        "font_px": font_px,
        "font_rem": {px / 16.0: name for px, name in font_px.items()},
        "root": str(pf_root),
    }


def norm_value(value, global_name):
    value = value.strip().lower()
    value = re.sub(r"\s*!important\s*$", "", value).strip()
    value = re.sub(r"pf-size-prem\(([0-9.]+)px\)", r"\1px", value)
    value = re.sub(r"pf-font-prem\(([0-9.]+)px\)", r"\1px", value)
    value = value.replace("--pf-global--", f"--{global_name.lower()}--")
    value = re.sub(r"\s*/\s*", "/", value)
    value = re.sub(r"\s*\*\s*", "*", value)
    value = re.sub(r"calc\(\s*", "calc(", value)
    value = re.sub(r"\s*\)", ")", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def strip_comments(line, in_block):
    out = []
    i = 0
    while i < len(line):
        if in_block:
            end = line.find("*/", i)
            if end < 0:
                return "", True
            i = end + 2
            in_block = False
            continue
        if line.startswith("/*", i):
            in_block = True
            i += 2
            continue
        if line.startswith("//", i) and (i == 0 or line[i - 1] in " \t;{"):
            break
        out.append(line[i])
        i += 1
    return "".join(out), in_block


def selector_text(frames):
    selector = ""
    for frame in frames:
        if frame["kind"] != "selector":
            continue
        label = re.sub(r"\s+", " ", frame["label"]).strip()
        if not label:
            continue
        if not selector:
            selector = label
        elif label.startswith("&"):
            selector += label[1:]
        else:
            selector = f"{selector} {label}"
    return selector.strip()


def open_frame(header):
    header = re.sub(r"\s+", " ", header).strip()
    if header.startswith(("@keyframes", "@font-face", "@mixin", "@function")):
        return {"kind": "skip", "label": header}
    if header.startswith(("@media", "@supports", "@container")):
        return {"kind": "conditional", "label": header}
    if header.startswith("@"):
        return {"kind": "other", "label": header}
    return {"kind": "selector", "label": header}


def selector_parts(selector):
    return [part.strip() for part in re.split(r"\s*,\s*", selector) if part.strip()]


def warnings_for(selector, conditional):
    notes = []
    if conditional:
        notes.append("conditional: " + " ".join(conditional))
    if not selector:
        notes.append("no selector")
        return notes
    if PF_SELECTOR.search(selector):
        notes.append("PatternFly selector")
    if re.search(
        r"::|:(hover|focus|active|focus-within|focus-visible|before|after|first-child|last-child|nth)",
        selector,
    ):
        notes.append("pseudo selector")
    parts = selector_parts(selector)
    if any(re.search(r"[>+~]|\s", part) for part in parts):
        notes.append("descendant selector")
    for part in parts:
        target = re.split(r"\s*[>+~]\s*|\s+", part)[-1]
        if target and not re.search(r"[.#\[]", target):
            notes.append("element selector")
            break
    return notes


def listed_by_default(notes):
    blocking = ("conditional:", "PatternFly selector", "pseudo selector", "element selector", "no selector")
    return not any(note.startswith(blocking) or note in blocking for note in notes)


def spacer_token(value, catalog):
    value = norm_value(value, catalog["global"])
    match = re.fullmatch(
        rf"var\(--{re.escape(catalog['global'])}--spacer--([a-z0-9]+)(?:,[^)]*)?\)",
        value,
    )
    if match:
        return match.group(1)
    match = re.fullmatch(r"var\(--pf-t--global--spacer--([a-z0-9]+)(?:,[^)]*)?\)", value)
    if match:
        return match.group(1)
    if value == "auto":
        return "auto"
    if value in ("0", "0px", "0rem"):
        return "0"
    match = re.fullmatch(r"(-?\d*\.?\d+)(px|rem)", value)
    if not match:
        return None
    number = float(match.group(1))
    if number < 0:
        return "negative"
    table = catalog["spacer_px"] if match.group(2) == "px" else catalog["spacer_rem"]
    for size, name in table.items():
        if abs(number - size) < 1e-6:
            return name
    return None


def font_token(value, catalog):
    value = norm_value(value, catalog["global"])
    match = re.fullmatch(
        rf"var\(--{re.escape(catalog['global'])}--fontsize--([a-z0-9]+)(?:,[^)]*)?\)",
        value,
    )
    if match:
        return match.group(1)
    match = re.fullmatch(r"var\(--pf-t--global--font--size--([a-z0-9]+)(?:,[^)]*)?\)", value)
    if match:
        return match.group(1)
    match = re.fullmatch(r"(-?\d*\.?\d+)(px|rem)", value)
    if not match:
        return None
    number = float(match.group(1))
    table = catalog["font_px"] if match.group(2) == "px" else catalog["font_rem"]
    for size, name in table.items():
        if abs(number - size) < 1e-6:
            return name
    return None


def split_lengths(value, global_name):
    value = norm_value(value, global_name)
    if value.startswith("var(") or value.startswith("calc("):
        return [value]
    return value.split()


def classes_for_sides(kind, tokens, prefix):
    """kind is 'm' or 'p'. tokens are four spacer names. None if any side is unmapped."""
    if any(token in (None, "negative") for token in tokens):
        return None
    top, right, bottom, left = tokens
    if kind == "p" and "auto" in tokens:
        return None
    if top == right == bottom == left:
        return [f"{prefix}{kind}-{top}"]
    if top == bottom and left == right:
        return [f"{prefix}{kind}y-{top}", f"{prefix}{kind}x-{left}"]
    return [f"{prefix}{kind}{side}-{token}" for side, token in zip("trbl", tokens)]


def partial_sides(kind, tokens, raw_values, prefix):
    mapped = []
    missed = []
    for side, token, raw in zip(("top", "right", "bottom", "left"), tokens, raw_values):
        if token in (None, "negative") or (kind == "p" and token == "auto"):
            missed.append(f"{side} {raw}")
        else:
            mapped.append(f"{prefix}{kind}{side[0]}-{token}")
    return mapped, missed


def expand_box(value, catalog):
    parts = split_lengths(value, catalog["global"])
    if len(parts) == 1:
        parts = parts * 4
    elif len(parts) == 2:
        parts = [parts[0], parts[1], parts[0], parts[1]]
    elif len(parts) == 3:
        parts = [parts[0], parts[1], parts[2], parts[1]]
    elif len(parts) != 4:
        return None
    tokens = [spacer_token(part, catalog) for part in parts]
    return tokens, parts


def classify(prop, raw_value, catalog):
    prop = prop.lower()
    prefix = catalog["prefix"]
    value = norm_value(raw_value, catalog["global"])
    if not value or "#{" in raw_value or "$" in raw_value:
        return {"verdict": "dynamic", "classes": [], "note": "value is not a literal"}
    if prop not in UTILITY_PROPS:
        return {"verdict": "none", "classes": [], "note": ""}

    if prop in ("margin", "padding"):
        expanded = expand_box(value, catalog)
        if not expanded:
            return {"verdict": "off-scale", "classes": [], "note": value}
        tokens, parts = expanded
        classes = classes_for_sides(prop[0], tokens, prefix)
        if classes:
            return {"verdict": "candidate", "classes": classes, "note": ""}
        mapped, missed = partial_sides(prop[0], tokens, parts, prefix)
        if mapped:
            return {
                "verdict": "partial",
                "classes": mapped,
                "note": "no utility for " + ", ".join(missed),
            }
        return {"verdict": "off-scale", "classes": [], "note": value}

    if prop in LONGHAND:
        token = spacer_token(value, catalog)
        if token == "negative" or token is None:
            return {"verdict": "off-scale", "classes": [], "note": value}
        if token == "auto" and prop.startswith("padding"):
            return {"verdict": "off-scale", "classes": [], "note": value}
        return {"verdict": "candidate", "classes": [f"{prefix}{LONGHAND[prop]}-{token}"], "note": ""}

    if prop in AXIS:
        token = spacer_token(value, catalog)
        if token and not (prop.startswith("padding") and token == "auto"):
            return {"verdict": "candidate", "classes": [f"{prefix}{AXIS[prop]}-{token}"], "note": ""}
        return {"verdict": "off-scale", "classes": [], "note": value}

    if prop == "font-size":
        token = font_token(value, catalog)
        if token:
            return {"verdict": "candidate", "classes": [f"{prefix}font-size-{token}"], "note": ""}
        return {"verdict": "off-scale", "classes": [], "note": value}

    if prop in ("min-width", "min-height") and value in ("0", "0px", "0%"):
        return {
            "verdict": "candidate",
            "classes": [f"{prefix}{prop}"],
            "note": "utility sets this minimum to 0",
        }
    if prop in ("min-width", "min-height") and value in ("auto", "initial"):
        return {"verdict": "none", "classes": [], "note": ""}
    if prop in ("max-width", "max-height") and value in ("auto", "initial"):
        return {"verdict": "none", "classes": [], "note": ""}
    if prop in ("min-width", "max-width", "min-height", "max-height"):
        return {"verdict": "off-scale", "classes": [], "note": f"no utility length for {prop}: {value}"}

    found = catalog["keyword"].get((prop, value))
    if found:
        return {"verdict": "candidate", "classes": [f"{prefix}{found}"], "note": ""}

    if prop in ("width", "height"):
        table = APPROX_WIDTH
        if prop == "height":
            table = {key: val.replace("w-", "h-") for key, val in APPROX_WIDTH.items()}
        approx = table.get(value)
        if approx:
            return {
                "verdict": "approximate",
                "classes": [f"{prefix}{approx}"],
                "note": "PF 33/66 utilities are calc(100% / 3), not the literal percent",
            }

    if prop == "background":
        renamed = catalog["keyword"].get(("background-color", value))
        if renamed:
            return {
                "verdict": "candidate",
                "classes": [f"{prefix}{renamed}"],
                "note": "background shorthand becomes background-color",
            }

    return {"verdict": "off-scale", "classes": [], "note": value}


def consider(hits, summary, rel_file, line, prop, value, catalog, selector="", conditional=None, origin="css"):
    result = classify(prop, value, catalog)
    verdict = result["verdict"]
    summary[verdict] = summary.get(verdict, 0) + 1
    if verdict in ("none", "dynamic"):
        return
    if verdict == "off-scale":
        summary["off_scale_props"][prop] = summary["off_scale_props"].get(prop, 0) + 1
        if not summary["show_off_scale"]:
            return
    notes = warnings_for(selector, conditional or [])
    if result["note"]:
        notes.append(result["note"])
    hit = {
        "file": rel_file,
        "line": line,
        "selector": selector,
        "property": prop,
        "value": norm_value(value, catalog["global"]),
        "classes": result["classes"],
        "verdict": verdict,
        "notes": notes,
        "origin": origin,
        "list": verdict == "off-scale" or listed_by_default(notes),
    }
    hits.append(hit)


def scan_stylesheet(text, rel_file, catalog, hits, summary):
    frames = []
    buf = ""
    in_block = False
    lineno = 1

    def inside_skip():
        return any(frame["kind"] == "skip" for frame in frames)

    def finish_decl(token, line_no):
        if inside_skip() or ":" not in token:
            return
        token = token.strip()
        if not token or token[0] in "@$":
            return
        prop, _, value = token.partition(":")
        prop = prop.strip()
        if not re.fullmatch(r"[A-Za-z-]+", prop):
            return
        conditional = [frame["label"] for frame in frames if frame["kind"] == "conditional"]
        consider(
            hits,
            summary,
            rel_file,
            line_no,
            prop,
            value.strip(),
            catalog,
            selector_text(frames),
            conditional,
        )

    for raw in text.splitlines():
        code, in_block = strip_comments(raw, in_block)
        i = 0
        while i < len(code):
            char = code[i]
            if char in "{};":
                token = buf.strip()
                buf = ""
                if char == "{":
                    frames.append(open_frame(token))
                elif char == "}":
                    if token:
                        finish_decl(token, lineno)
                    if frames:
                        frames.pop()
                else:
                    finish_decl(token, lineno)
            else:
                buf += char
            i += 1
        if buf and not buf.endswith((" ", "\n")):
            buf += " "
        lineno += 1


def camel_to_css(name):
    return re.sub(r"[A-Z]", lambda match: "-" + match.group(0).lower(), name)


def js_literal(raw):
    raw = raw.strip().rstrip(",")
    if raw.startswith("`"):
        if "${" in raw:
            return None
        return raw.strip("`")
    if (raw.startswith("'") and raw.endswith("'")) or (raw.startswith('"') and raw.endswith('"')):
        return raw[1:-1]
    if re.fullmatch(r"-?\d+(\.\d+)?", raw):
        return "0" if raw in ("0", "0.0") else raw + "px"
    return None


def scan_style_object(body, rel_file, line, catalog, hits, summary):
    parts = []
    buf = ""
    depth = 0
    quote = None
    for char in body:
        if quote:
            buf += char
            if char == quote:
                quote = None
            continue
        if char in ("'", '"', "`"):
            quote = char
            buf += char
            continue
        if char in "{[":
            depth += 1
        elif char in "}]":
            depth = max(0, depth - 1)
        if char == "," and depth == 0:
            parts.append(buf)
            buf = ""
        else:
            buf += char
    if buf.strip():
        parts.append(buf)
    for part in parts:
        part = part.strip()
        if not part or part.startswith("..."):
            continue
        if ":" not in part:
            consider(hits, summary, rel_file, line, camel_to_css(part), "dynamic", catalog, origin="style")
            continue
        key, _, raw = part.partition(":")
        key = key.strip().strip("'\"")
        literal = js_literal(raw.strip())
        prop = camel_to_css(key)
        if literal is None:
            consider(hits, summary, rel_file, line, prop, "dynamic", catalog, origin="style")
        else:
            consider(hits, summary, rel_file, line, prop, literal, catalog, origin="style")


def scan_script(text, rel_file, catalog, hits, summary):
    start = 0
    needle = "style={"
    while True:
        idx = text.find(needle, start)
        if idx < 0:
            break
        brace = text.find("{", idx + len("style="))
        if brace < 0:
            break
        end = balanced(text, brace)
        if end is None:
            break
        inner = text[brace + 1 : end].strip()
        line = text.count("\n", 0, idx) + 1
        if inner.startswith("{"):
            close = balanced(inner, 0)
            if close is not None:
                scan_style_object(inner[1:close], rel_file, line, catalog, hits, summary)
        start = end + 1
    for match in re.finditer(r"""\bstyle\s*=\s*(['"])(.*?)\1""", text, re.S):
        line = text.count("\n", 0, match.start()) + 1
        for decl in match.group(2).split(";"):
            if ":" not in decl:
                continue
            prop, _, value = decl.partition(":")
            consider(hits, summary, rel_file, line, prop.strip(), value.strip(), catalog, origin="style")


def class_known(name, classes):
    base = BP_SUFFIX.sub("", name)
    info = classes.get(base)
    if not info:
        return False
    if base != name and not info["responsive"]:
        return False
    return True


def scan_utility_classnames(text, rel_file, catalog, hits, summary):
    for match in re.finditer(r"(?<![\w-])pf-u-([a-z0-9-]+)", text):
        legacy = match.group(1)
        line = text.count("\n", 0, match.start()) + 1
        if class_known(legacy, catalog["classes"]):
            classes = [f"{catalog['prefix']}{legacy}"]
            note = "unversioned pf-u- class; use the installed version prefix"
            verdict = "legacy"
        else:
            classes = []
            note = "no utility with this name in the installed PatternFly"
            verdict = "legacy-missing"
        summary[verdict] = summary.get(verdict, 0) + 1
        hits.append(
            {
                "file": rel_file,
                "line": line,
                "selector": "",
                "property": "class",
                "value": f"pf-u-{legacy}",
                "classes": classes,
                "verdict": verdict,
                "notes": [note],
                "origin": "class",
                "list": True,
            }
        )
    prefix = catalog["prefix"]
    for match in re.finditer(r"(?<![\w-])pf-v\d+-u-([a-z0-9-]+)", text):
        full = match.group(0)
        name = match.group(1)
        if not full.startswith(prefix):
            line = text.count("\n", 0, match.start()) + 1
            summary["unknown"] = summary.get("unknown", 0) + 1
            hits.append(
                {
                    "file": rel_file,
                    "line": line,
                    "selector": "",
                    "property": "class",
                    "value": full,
                    "classes": [],
                    "verdict": "unknown",
                    "notes": [f"class is not for the installed PatternFly ({prefix})"],
                    "origin": "class",
                    "list": True,
                }
            )
            continue
        if class_known(name, catalog["classes"]):
            continue
        line = text.count("\n", 0, match.start()) + 1
        summary["unknown"] = summary.get("unknown", 0) + 1
        hits.append(
            {
                "file": rel_file,
                "line": line,
                "selector": "",
                "property": "class",
                "value": full,
                "classes": [],
                "verdict": "unknown",
                "notes": ["not a utility class in the installed PatternFly"],
                "origin": "class",
                "list": True,
            }
        )


def is_test(path: Path):
    name = path.name
    if any(part in {"__tests__", "test", "tests", "spec", "fixtures"} for part in path.parts):
        return True
    return ".test." in name or ".spec." in name or "fixture" in name


def rel_path(path: Path):
    resolved = path.resolve()
    try:
        return str(resolved.relative_to(Path.cwd().resolve()))
    except ValueError:
        return str(resolved)


def scan_file(path: Path, catalog, hits, summary, include_tests):
    if path.stat().st_size > 1_000_000 or path.suffix == ".min":
        return
    if is_test(path) and not include_tests:
        summary["tests_skipped"] += 1
        return
    text = path.read_text(encoding="utf-8", errors="ignore")
    if "\0" in text:
        return
    summary["files"] += 1
    rel_file = rel_path(path)
    if summary.get("utility_import") is None and UTILITY_IMPORT.search(text):
        summary["utility_import"] = rel_file
    scan_utility_classnames(text, rel_file, catalog, hits, summary)
    if path.suffix in STYLE_EXT or path.name.endswith(".erb"):
        scan_stylesheet(text, rel_file, catalog, hits, summary)
        if path.suffix == ".erb" or path.name.endswith(".html"):
            scan_script(text, rel_file, catalog, hits, summary)
    elif path.suffix in SCRIPT_EXT:
        scan_script(text, rel_file, catalog, hits, summary)


def walk(paths, catalog, include_tests):
    hits = []
    summary = {
        "files": 0,
        "tests_skipped": 0,
        "off_scale_props": {},
        "show_off_scale": False,
        "utility_import": None,
    }
    for raw in paths:
        path = Path(raw)
        if path.is_file():
            scan_file(path, catalog, hits, summary, include_tests)
            continue
        if not path.is_dir():
            print(f"missing path: {path}", file=sys.stderr)
            continue
        for file_path in path.rglob("*"):
            if not file_path.is_file():
                continue
            if any(part in SKIP_DIRS for part in file_path.parts):
                continue
            if file_path.suffix not in STYLE_EXT | SCRIPT_EXT and not file_path.name.endswith(".erb"):
                continue
            scan_file(file_path, catalog, hits, summary, include_tests)
    return hits, summary


def format_hit(hit):
    loc = f"{hit['file']}:{hit['line']}"
    classes = " ".join(hit["classes"]) if hit["classes"] else "(none)"
    where = f" [{hit['selector']}]" if hit["selector"] else ""
    extra = f" — {'; '.join(hit['notes'])}" if hit["notes"] else ""
    return f"{loc}{where}  {hit['property']}: {hit['value']}  ->  {classes}{extra}"


def file_counts(hits, show_review):
    counts = {}
    for hit in hits:
        if hit["verdict"] not in ("candidate", "partial", "approximate"):
            continue
        if not show_review and not hit["list"]:
            continue
        bucket = counts.setdefault(hit["file"], {"candidate": 0, "partial": 0, "approximate": 0})
        bucket[hit["verdict"]] += 1
    return sorted(counts.items(), key=lambda item: -sum(item[1].values()))


def print_text(catalog, hits, summary, show_review, summary_only):
    print(f"PatternFly {catalog['version']}  prefix {catalog['prefix']}  from {catalog['root']}")
    imported = summary.get("utility_import")
    if imported:
        print(f"utility stylesheet import: {imported}")
    else:
        print("utility stylesheet import: not seen in the scanned files")
    print(f"files scanned: {summary['files']}  test files skipped: {summary['tests_skipped']}")
    counts = []
    for key in ("candidate", "partial", "approximate", "legacy", "legacy-missing", "unknown", "off-scale"):
        if summary.get(key):
            counts.append(f"{key}: {summary[key]}")
    print("  ".join(counts))
    if summary["off_scale_props"]:
        top = sorted(summary["off_scale_props"].items(), key=lambda item: -item[1])[:12]
        print("off-scale properties: " + ", ".join(f"{name} {count}" for name, count in top))
    print(
        "ignored properties with no PatternFly utility: gap, overflow, position, inset, "
        "vertical-align, z-index, opacity, border, line-height, text-transform, order, grid"
    )
    groups = {}
    hidden = 0
    for hit in hits:
        if hit["verdict"] == "off-scale" and not summary["show_off_scale"]:
            continue
        if not show_review and not hit["list"]:
            hidden += 1
            continue
        groups.setdefault(hit["verdict"], []).append(hit)
    if hidden:
        print(f"hidden by default (PF selector, pseudo, media, or bare element): {hidden}  (pass --review)")
    ranked = file_counts(hits, show_review)
    if ranked:
        print(f"\n## files ({len(ranked)})")
        for path, bucket in ranked[:25]:
            bits = [f"{name} {count}" for name, count in bucket.items() if count]
            print(f"  {sum(bucket.values()):4}  {path}  ({', '.join(bits)})")
        if len(ranked) > 25:
            print(f"  ... {len(ranked) - 25} more files")
    if summary_only:
        groups = {verdict: rows for verdict, rows in groups.items() if verdict in ("legacy", "legacy-missing", "unknown")}
    order = ("candidate", "partial", "approximate", "legacy", "legacy-missing", "unknown", "off-scale")
    for verdict in order:
        rows = groups.get(verdict) or []
        if not rows:
            continue
        print(f"\n## {verdict} ({len(rows)})")
        for hit in rows:
            print(format_hit(hit))


def self_test(catalog):
    sample = """
.card {
  margin-top: 16px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  font-weight: 300;
  column-gap: 8px;
}
@media screen and (max-width: 768px) {
  .card { margin-bottom: 8px; }
}
#header-text .pf-v5-l-flex { align-items: center; }
.scrollable-container { max-height: 400px; overflow: auto; }
#import-btn, #undo-btn { font-size: 16px; }
"""
    hits, summary = [], {"off_scale_props": {}, "show_off_scale": False, "files": 0, "tests_skipped": 0}
    scan_stylesheet(sample, "sample.scss", catalog, hits, summary)
    by_prop = {hit["property"]: hit for hit in hits}
    prefix = catalog["prefix"]
    assert by_prop["margin-top"]["classes"] == [f"{prefix}mt-md"], by_prop["margin-top"]
    assert by_prop["margin-top"]["list"] is True
    assert by_prop["padding"]["classes"] == [f"{prefix}py-sm", f"{prefix}px-md"], by_prop["padding"]
    assert f"{prefix}display-flex" in by_prop["display"]["classes"]
    assert f"{prefix}align-items-center" in by_prop["align-items"]["classes"]
    assert by_prop["margin-bottom"]["list"] is False
    assert any("PatternFly selector" in note for note in by_prop["align-items"]["notes"] if by_prop["align-items"]["selector"].startswith("#header"))
    header = [hit for hit in hits if hit["selector"].startswith("#header")][0]
    assert header["list"] is False
    assert "max-height" not in by_prop or by_prop["max-height"]["verdict"] == "off-scale"
    assert "column-gap" not in by_prop
    js = "export const x = <span style={{ marginRight: '0.5rem', minWidth: 0, padding: 24 }} />;"
    scan_script(js, "sample.js", catalog, hits, summary)
    js_hits = [hit for hit in hits if hit["file"] == "sample.js"]
    classes = {hit["property"]: hit["classes"] for hit in js_hits}
    prefix = catalog["prefix"]
    assert classes["margin-right"] == [f"{prefix}mr-sm"], classes
    assert classes["min-width"] == [f"{prefix}min-width"], classes
    assert classes["padding"] == [f"{prefix}p-lg"], classes
    assert class_known("mb-md", catalog["classes"])
    assert class_known("mb-md-on-lg", catalog["classes"])
    assert not class_known("box-shadow-sm-on-md", catalog["classes"])
    assert not class_known("max-width-100", catalog["classes"])
    comma = [hit for hit in hits if hit["selector"] == "#import-btn, #undo-btn"][0]
    assert comma["list"] is True, comma
    assert "descendant selector" not in comma["notes"]
    print("self-test ok")
    print(f"catalog classes: {len(catalog['classes'])}  patternfly {catalog['version']}  prefix {catalog['prefix']}")


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--review", action="store_true", help="also print PF overrides, pseudos, and media-query hits")
    parser.add_argument("--off-scale", action="store_true", help="print utility properties whose values are not on the PF scale")
    parser.add_argument("--tests", action="store_true", help="include test and fixture files")
    parser.add_argument("--summary", action="store_true", help="print counts and per-file totals, plus legacy or unknown classes")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    starts = args.paths or [str(Path.cwd())]
    pf_root = find_patternfly(starts)
    if pf_root is None:
        print(
            "Could not find node_modules/@patternfly/patternfly from the scan path or the current directory.",
            file=sys.stderr,
        )
        print("Run this inside a project that depends on @patternfly/patternfly, or pass that project path.", file=sys.stderr)
        return 1
    catalog = load_catalog(pf_root)
    if catalog is None:
        print(
            f"{pf_root} is PatternFly 4 or an unrecognized version. This scanner reads PatternFly 5 and 6 utilities.",
            file=sys.stderr,
        )
        return 1
    if args.self_test:
        self_test(catalog)
        return 0
    if not args.paths:
        print(f"scanning: {Path.cwd().resolve()}", file=sys.stderr)
    hits, summary = walk(starts, catalog, args.tests)
    summary["show_off_scale"] = args.off_scale
    if args.off_scale:
        for hit in hits:
            if hit["verdict"] == "off-scale":
                hit["list"] = True
    if args.json:
        visible = [hit for hit in hits if args.review or hit["list"]]
        json.dump({"version": catalog["version"], "summary": {k: v for k, v in summary.items() if k != "show_off_scale"}, "hits": visible}, sys.stdout, indent=2)
        print()
        return 0
    print_text(catalog, hits, summary, args.review, args.summary)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
