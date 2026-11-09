"""Offline candidate-index discovery; never selects or executes product policy."""
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
from urllib.parse import unquote

from artifact_io import local_path
from guideline_io import read_confined
from guideline_sources import metadata as guideline_metadata

CONVENTIONAL_INDEX = Path(".design/product/design-guidelines/README.md")
LEGACY_INDEXES = (Path(".design/guidelines/README.md"),
                  Path(".design/product-design/guidelines/README.md"))


def _workspace(value):
    path = local_path(value, Path.cwd())
    if not path.is_dir():
        raise ValueError("workspace must be an existing directory")
    return path


def _confined(value, workspace):
    if not str(value):
        raise ValueError("path must not be empty")
    path = local_path(value, workspace)
    if not path.is_relative_to(workspace):
        raise ValueError("index paths must stay inside the consumer workspace")
    return path


def discover_indexes(workspace, *, index=None, root=None):
    """Offer entry points only. Explicit root means an index directory."""
    workspace = _workspace(workspace)
    if index is not None and root is not None:
        raise ValueError("use index or root override, not both")
    if index is not None:
        requested = [(_confined(index, workspace), "explicit")]
    elif root is not None:
        requested = [(_confined(root, workspace) / "README.md", "explicit")]
    else:
        requested = [(workspace / CONVENTIONAL_INDEX, "conventional")]
        requested += [(workspace / path, "legacy") for path in LEGACY_INDEXES]
    candidates = []
    for value, origin in requested:
        path = _confined(value, workspace)
        if not path.exists():
            if origin == "explicit":
                raise ValueError("explicit index not found")
            continue
        if not path.is_file():
            raise ValueError("index must be a regular file")
        candidates.append({"index": str(path), "origin": origin})
    status = "ambiguous" if len(candidates) > 1 else "candidates" if candidates else "absent"
    return {"status": status, "candidates": candidates}


def _fields(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys.split()):
        raise ValueError("index object has missing or unsupported fields")


def _text(value, *, nullable=False):
    if nullable and value is None:
        return
    if not isinstance(value, str) or not value.strip():
        raise ValueError("index metadata must be nonempty text (or explicit null when unknown)")


def _identity(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", value):
        raise ValueError("invalid index identifier")


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate index JSON key")
        result[key] = value
    return result


# Supported helpers for consumers outside this skill; preserve the internal names.
resolve_workspace = _workspace
confined_path = _confined
unique_object_hook = _unique_object


def _relative_path(value):
    _text(value)
    if (Path(value).is_absolute() or ".." in Path(value).parts or
            re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", value) or "\\" in value):
        raise ValueError("locator path must be relative without traversal or URL schemes")


def _locator(value, base, workspace):
    shapes = {"local": "kind path", "web": "kind url section",
              "gdrive": "kind document_id section", "figma": "kind file_key branch_key node_ids",
              "repository": "kind url revision path"}
    if not isinstance(value, dict) or not isinstance(value.get("kind"), str) or value["kind"] not in shapes:
        raise ValueError("unsupported locator kind")
    kind = value["kind"]
    _fields(value, shapes[kind])
    if kind in ("local", "repository"):
        _relative_path(value["path"])
    if kind == "local":
        # Inspect path safety, not existence/content. Missing evidence stays unknown.
        _confined(base / value["path"], workspace)
    if kind in ("web", "repository"):
        _text(value["url"])
        url = urlsplit(value["url"])
        # Section/node identities belong in explicit fields, not signed query strings.
        if (url.scheme not in ("http", "https") or not url.hostname or url.username or
                url.password or url.query or url.fragment or any(c.isspace() for c in value["url"])):
            raise ValueError("locator URL must be HTTP(S) without credentials, query, or fragment")
    if kind in ("web", "gdrive"):
        _text(value["section"], nullable=True)
    for field in ("document_id", "file_key", "branch_key"):
        if field not in value or (field == "branch_key" and value[field] is None):
            continue
        if not isinstance(value[field], str) or not re.fullmatch(r"[A-Za-z0-9_-]+", value[field]):
            raise ValueError("invalid provider identity")
    if kind == "figma":
        nodes = value["node_ids"]
        if (not isinstance(nodes, list) or any(not isinstance(n, str) or not re.fullmatch(r"[0-9]+:[0-9]+", n) for n in nodes)
                or len(nodes) != len(set(nodes))):
            raise ValueError("Figma node IDs must be unique exact colon-form IDs")
    if kind == "repository" and (not isinstance(value["revision"], str) or not re.fullmatch(r"[0-9a-fA-F]{40}", value["revision"])):
        raise ValueError("repository revision must be a full commit SHA")


def _validate_catalog(catalog, base, workspace):
    # This deliberately separate JSON format must not enter the flat rule parser.
    _fields(catalog, "schema_version product release sources")
    if catalog["schema_version"] != "1.0.0":
        raise ValueError("unsupported index schema version")
    for field in ("product", "release"):
        _text(catalog[field], nullable=True)
    if not isinstance(catalog["sources"], list):
        raise ValueError("index sources must be an array")
    ids = set()
    for source in catalog["sources"]:
        _fields(source, "id rule_ids title topic scope owner authority policy_status locator examples assets")
        for field in ("id", "topic"):
            _identity(source[field])
        if source["id"] in ids:
            raise ValueError("duplicate index source ID")
        ids.add(source["id"])
        for field in ("title", "scope"):
            _text(source[field])
        for field in ("owner", "authority"):
            _text(source[field], nullable=True)
        if source["policy_status"] not in ("approved", "draft", "deprecated"):
            raise ValueError("invalid index policy status")
        rules = source["rule_ids"]
        if not isinstance(rules, list):
            raise ValueError("rule_ids must be an array")
        for rule in rules:
            _identity(rule)
        if len(set(rules)) != len(rules):
            raise ValueError("duplicate index rule ID")
        _locator(source["locator"], base, workspace)
        for field in ("examples", "assets"):
            if not isinstance(source[field], list):
                raise ValueError("examples and assets must be locator arrays")
            for locator in source[field]:
                _locator(locator, base, workspace)


def _read_bytes(path, limit, workspace):
    data = read_confined(workspace, path, limit)
    data.decode("utf-8")
    return data


def _markdown_index(workspace, path, index_bytes):
    """List local Markdown-link candidates without reading their contents or fetching."""
    text = index_bytes.decode("utf-8-sig")
    index_info = guideline_metadata(text)
    section = "Guidelines"
    sources = []
    seen = set()
    link_pattern = re.compile(r"\[([^\]]+)\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)")
    heading_pattern = re.compile(r"^#{1,6}\s+(.+?)\s*#*\s*$")
    for line in text.splitlines():
        heading = heading_pattern.match(line)
        if heading:
            section = heading.group(1).strip()
        for opener in re.finditer(r"\]\(", line):
            if ")" not in line[opener.end():]:
                raise ValueError("malformed README Markdown link")
        for match in link_pattern.finditer(line):
            label = match.group(1).strip()
            destination = match.group(2).strip("<>")
            parsed = urlsplit(destination)
            if parsed.scheme or parsed.netloc or not parsed.path.lower().endswith(".md"):
                continue
            if parsed.query:
                raise ValueError("local README guideline links must not include query strings")
            if not parsed.path:
                continue
            relative = unquote(parsed.path)
            if (Path(relative).is_absolute() or ".." in Path(relative).parts or "\\" in relative
                    or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", relative)):
                raise ValueError("README guideline link must be a workspace-confined relative Markdown path")
            target = _confined(path.parent / relative, workspace)
            if not target.exists():
                raise ValueError("README guideline link is missing: " + relative)
            if not target.is_file():
                raise ValueError("README guideline link must resolve to a regular Markdown file: " + relative)
            workspace_relative = target.relative_to(workspace).as_posix()
            source_id = "path-" + hashlib.sha256(workspace_relative.encode()).hexdigest()[:16]
            if source_id in seen:
                raise ValueError("duplicate linked guideline identity: " + source_id)
            seen.add(source_id)
            anchor = parsed.fragment or ""
            sources.append({
                "id": source_id, "rule_ids": [],
                "title": label or Path(relative).stem,
                "topic": re.sub(r"[^a-z0-9]+", "-", section.lower()).strip("-") or "guidelines",
                "scope": anchor or section, "owner": None,
                "authority": None, "policy_status": "unknown",
                "locator": {"kind": "local", "path": Path(relative).as_posix()},
                "examples": [], "assets": [], "identity_kind": "path_derived",
                "identity": workspace_relative,
                "guideline_scope": ({"kind": "section", "anchor": anchor} if anchor else None),
                "heading": section, "heading_anchor": anchor or re.sub(r"[^a-z0-9]+", "-", section.lower()).strip("-"),
            })
    return {"schema_version": "readme-links-1.0.0", "index": str(path), "sidecar": None,
            "index_sha256": hashlib.sha256(index_bytes).hexdigest(), "sidecar_sha256": None,
            "product": index_info.get("product"), "release": index_info.get("release"),
            "topics": sorted({source["topic"] for source in sources}), "sources": sources}


def read_index(workspace, index, *, topics=()):
    """Read the chosen index and return local-link candidates; never crawl/fetch."""
    workspace = _workspace(workspace)
    path = _confined(index, workspace)
    sidecar = _confined(path.with_name("sources.json"), workspace)
    index_bytes = _read_bytes(path, 65536, workspace)
    if not sidecar.exists():
        catalog = _markdown_index(workspace, path, index_bytes)
        available_topics = catalog["topics"]
        if not isinstance(topics, (list, tuple)) or any(not isinstance(t, str) or t not in available_topics for t in topics):
            raise ValueError("topics must be an explicit list of linked guideline sections")
        catalog["sources"] = [source for source in catalog["sources"] if source["topic"] in topics]
        return catalog
    sidecar_bytes = _read_bytes(sidecar, 262144, workspace)
    try:
        catalog = json.loads(sidecar_bytes.decode('utf-8'), object_pairs_hook=_unique_object)
    except RecursionError as error:
        raise ValueError("index JSON exceeds parser nesting limit") from error
    _validate_catalog(catalog, path.parent, workspace)
    available_topics = sorted({s["topic"] for s in catalog["sources"]})
    if not isinstance(topics, (list, tuple)) or any(not isinstance(t, str) or t not in available_topics for t in topics):
        raise ValueError("topics must be an explicit list of indexed topic IDs")
    return {"schema_version": catalog["schema_version"], "index": str(path),
            "sidecar": str(sidecar), "index_sha256": hashlib.sha256(index_bytes).hexdigest(),
            "sidecar_sha256": hashlib.sha256(sidecar_bytes).hexdigest(),
            "product": catalog["product"], "release": catalog["release"],
            "topics": sorted({s["topic"] for s in catalog["sources"]}),
            "sources": [s for s in catalog["sources"] if s["topic"] in topics]}
