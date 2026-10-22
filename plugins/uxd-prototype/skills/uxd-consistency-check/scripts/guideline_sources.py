#!/usr/bin/env python3
# AI-generated script by GPT-6 Luna.
"""Resolve local guideline snapshots. Remote retrieval belongs to the assistant."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit, urlunsplit

from artifact_io import local_path, output_path, protect_inputs, write_json

GUIDELINE_PATH = Path(".design/product-design/guidelines")
SKILL = Path(__file__).resolve().parents[1]


def digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def manifest_version(manifest):
    """Fingerprint frozen content AND provenance; this is integrity, not a signature."""
    payload = {key: value for key, value in manifest.items() if key != "version"}
    return "sha256:" + digest(json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False))


def safe_source_url(value):
    if not value:
        return None
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("source_url must be HTTP(S) without credentials")
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))


def metadata(text):
    """Read documented scalar frontmatter only; never interpret YAML tags/code."""
    # Normalize only this parsing view, never the frozen document or its hash.
    text = text.removeprefix("\ufeff").replace("\r\n", "\n")
    result = {}
    if text.startswith("---\n"):
        header, separator, _ = text[4:].partition("\n---\n")
        if not separator:
            raise ValueError("unterminated guideline frontmatter")
        for line in header.splitlines():
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            key, separator, value = line.partition(":")
            # Never flatten nested YAML into executable top-level check fields.
            if line != line.lstrip() or not separator or not re.fullmatch(r"[a-z_]+", key.strip()):
                raise ValueError("guideline frontmatter supports scalar key: value entries only")
            if key.strip() in result:
                raise ValueError("duplicate guideline frontmatter key: " + key.strip())
            result[key.strip()] = value.strip().strip("\"'")
    return result


def load_guidelines(workspace, provided=(), design_system=None):
    design_system = "custom" if design_system is None else design_system
    workspace = Path(workspace).expanduser().resolve()
    if not workspace.is_dir():
        raise ValueError("workspace must be an existing directory")
    # Sources are opt-in. Merely running in a product checkout selects no policy.
    requested = [(str(SKILL / "guidelines"), "baseline", "patternfly")] if design_system == "patternfly" else []
    for value in provided:
        value = str(value)
        if re.match(r"^[A-Za-z][A-Za-z0-9+.-]*://", value):
            raise ValueError("analyzer is offline: stage remote guidelines locally")
        namespace, separator, path = value.partition("=")
        if not separator:
            namespace, path = "local", value
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", namespace) or not path:
            raise ValueError("guidelines must be a local PATH or NAMESPACE=PATH")
        requested.append((path, "explicit", namespace))
    documents = {}
    sources = []
    for value, kind, namespace in requested:
        if re.match(r"^[A-Za-z][A-Za-z0-9+.-]*://", str(value)):
            raise ValueError("analyzer is offline: stage explicitly requested remote guidelines locally in the assistant layer")
        path = local_path(value, workspace)
        if not path.exists():
            raise ValueError(f"guideline source not found: {path}")
        paths = sorted(path.rglob("*.md")) if path.is_dir() else [path]
        source = {"kind": kind, "namespace": namespace, "location": str(path), "document_ids": []}
        for document_path in paths:
            document_path = local_path(document_path, workspace)
            if not document_path.is_file():
                raise ValueError("guideline source must be a regular file")
            text = document_path.read_bytes().decode("utf-8")
            info = metadata(text)
            if not text.strip() or (document_path.name.lower() == "readme.md" and not info.get("id")):
                continue
            original_id = info.get("id", document_path.stem)
            if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", original_id):
                raise ValueError(f"invalid guideline ID: {original_id}")
            identity = namespace + ":" + original_id
            location = str(document_path)
            source_url = safe_source_url(info.get("source_url"))
            if info.get("severity", "warning") not in {"error", "warning"}:
                raise ValueError("guideline severity must be error or warning")
            document = {"id": identity, "original_id": original_id, "namespace": namespace,
                        "title": info.get("title", original_id),
                        "category": info.get("category", "provided"),
                        "severity": info.get("severity", "warning"),
                        "check": info.get("check"), "text": text,
                        "parameters": {"required_class": info.get("required_class")},
                        "sha256": digest(text), "version": info.get("version", "unspecified"),
                        "sources": [location], "kind": kind,
                        "source_url": source_url,
                        "retrieved_at": info.get("retrieved_at"),
                        "design_system": info.get("design_system", design_system)}
            if identity in documents:
                if documents[identity]["sha256"] != document["sha256"]:
                    raise ValueError(f"conflicting guideline ID: {identity}")
                documents[identity]["sources"] = sorted(set(documents[identity]["sources"] + [location]))
            else:
                documents[identity] = document
            if identity not in source["document_ids"]:
                source["document_ids"].append(identity)
        if kind == "explicit" and not source["document_ids"]:
            raise ValueError("explicit guideline source contains no usable Markdown")
        sources.append(source)
    values = sorted(documents.values(), key=lambda item: item["id"])
    manifest = {"schema_version": "1.1.0", "workspace": str(workspace),
                "design_system": design_system, "sources": sources, "documents": values}
    manifest["version"] = manifest_version(manifest)
    return validate_manifest(manifest, design_system)


def load_manifest(value, workspace, design_system=None):
    path = local_path(value, workspace)
    if not path.is_file():
        raise ValueError("guideline manifest must be a regular file")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    return validate_manifest(manifest, design_system)


def validate_manifest(manifest, design_system=None):
    """Validate frozen bytes and execution metadata without rereading originals."""
    if not isinstance(manifest, dict) or manifest.get("schema_version") not in {"1.0.0", "1.1.0"}:
        raise ValueError("unsupported guideline manifest schema")
    namespaced = manifest["schema_version"] == "1.1.0"
    if namespaced and manifest.get("version") != manifest_version(manifest):
        raise ValueError("guideline manifest content/provenance hash mismatch")
    if not isinstance(manifest.get("design_system"), str) or not manifest["design_system"].strip():
        raise ValueError("guideline manifest design system must be a nonempty string")
    if not isinstance(manifest.get("workspace"), str) or not manifest["workspace"].strip():
        raise ValueError("guideline manifest workspace provenance must be a nonempty string")
    if design_system is not None and manifest.get("design_system") != design_system:
        raise ValueError("manifest design system does not match selected design system")
    design_system = manifest["design_system"]
    documents = manifest.get("documents")
    if not isinstance(documents, list):
        raise ValueError("manifest documents must be an array")
    ids = set()
    for document in documents:
        if not isinstance(document, dict) or not isinstance(document.get("text"), str) or digest(document["text"]) != document.get("sha256"):
            raise ValueError("guideline document hash mismatch")
        required = {"id", "title", "category", "version", "design_system", "severity", "check", "parameters", "sources", "kind", "source_url", "retrieved_at"}
        if not required <= document.keys():
            raise ValueError("missing guideline manifest metadata")
        if namespaced and (not isinstance(document.get("namespace"), str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", document["namespace"])):
            raise ValueError("invalid guideline namespace")
        for field in ("id", "title", "category", "version", "design_system"):
            if not isinstance(document.get(field), str) or not document[field].strip():
                raise ValueError(f"guideline manifest metadata requires {field}")
        identity_pattern = r"[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)?" if namespaced else r"[A-Za-z0-9][A-Za-z0-9._-]*"
        if not re.fullmatch(identity_pattern, document["id"]):
            raise ValueError("invalid guideline manifest metadata ID")
        info = metadata(document["text"])
        if not isinstance(document.get("sources"), list) or not document["sources"] or not all(isinstance(source, str) for source in document["sources"]):
            raise ValueError("invalid guideline manifest metadata sources")
        original_id = info.get("id", Path(document["sources"][0]).stem)
        expected_metadata = {"severity": info.get("severity", "warning"), "check": info.get("check"),
                             "id": document.get("namespace", "") + ":" + original_id if namespaced else original_id,
                             "title": info.get("title", original_id), "category": info.get("category", "provided"),
                             "source_url": safe_source_url(info.get("source_url")),
                             "parameters": {"required_class": info.get("required_class")},
                             "design_system": info.get("design_system", design_system),
                             "version": info.get("version", "unspecified"), "retrieved_at": info.get("retrieved_at")}
        if namespaced:
            expected_metadata["original_id"] = original_id
        if any(document.get(field) != value for field, value in expected_metadata.items()):
            raise ValueError("guideline manifest metadata differs from fingerprinted text")

        if document.get("id") in ids:
            raise ValueError("duplicate guideline ID in manifest")
        ids.add(document.get("id"))
        if not isinstance(document.get("kind"), str) or document["kind"] not in {"baseline", "workspace", "explicit"} or document.get("severity") not in {"warning", "error"}:
            raise ValueError("invalid guideline manifest metadata")
    expected = manifest_version(manifest) if namespaced else "sha256:" + digest(json.dumps(sorted((d["id"], d["sha256"]) for d in documents)))
    if manifest.get("version") != expected:
        raise ValueError("guideline manifest corpus hash mismatch")
    if not isinstance(manifest.get("sources"), list):
        raise ValueError("guideline manifest sources must be an array")
    attributed = {document["id"]: set() for document in documents}
    for source in manifest["sources"]:
        if not isinstance(source, dict) or not isinstance(source.get("kind"), str) or source["kind"] not in {"baseline", "workspace", "explicit"}:
            raise ValueError("invalid guideline source metadata")
        if namespaced and (not isinstance(source.get("namespace"), str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", source["namespace"])):
            raise ValueError("invalid guideline source namespace")
        if not isinstance(source.get("location"), str) or not isinstance(source.get("document_ids"), list):
            raise ValueError("invalid guideline source location or IDs")
        if not all(isinstance(identity, str) and identity in ids for identity in source["document_ids"]):
            raise ValueError("guideline source references unknown document IDs")
        # Legacy producers repeated membership for identical files in one source.
        if namespaced and len(source["document_ids"]) != len(set(source["document_ids"])):
            raise ValueError("duplicate guideline source document IDs")
        location = Path(source["location"])
        if not location.is_absolute() or ".." in location.parts:
            raise ValueError("guideline source location must be an absolute provenance path")
        if source["kind"] == "workspace" and location != Path(manifest["workspace"]) / GUIDELINE_PATH:
            raise ValueError("workspace guideline source location contradicts workspace provenance")
        members = set()
        for document in documents:
            for value in document["sources"]:
                path = Path(value)
                if not path.is_absolute() or ".." in path.parts:
                    raise ValueError("guideline document location must be an absolute provenance path")
                # Use frozen lexical locations, not this installation's baseline
                # path or live filesystem: original sources may have moved.
                if (not namespaced or document["namespace"] == source.get("namespace")) and (path == location or (path.suffix == ".md" and path.is_relative_to(location))):
                    members.add(document["id"])
                    attributed[document["id"]].add(value)
        if set(source["document_ids"]) != members:
            raise ValueError("guideline source document IDs contradict location membership")
    for document in documents:
        if attributed[document["id"]] != set(document["sources"]):
            raise ValueError("guideline document locations lack complete source attribution")
        origins = [source for source in manifest["sources"] if document["id"] in source["document_ids"]]
        if not origins or document["kind"] != origins[0]["kind"]:
            raise ValueError("guideline source and document kind attribution disagree")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--guidelines", action="append", default=[], help="Repeat local [NAMESPACE=]PATH (default namespace: local)")
    parser.add_argument("--design-system", help="Optional system label; patternfly opts into its bundled baseline")
    parser.add_argument("--manifest", help="Reuse a frozen local manifest, without rereading sources")
    parser.add_argument("--output", help="Write snapshot inside workspace .artifacts")
    args = parser.parse_args()
    try:
        if args.manifest and args.guidelines:
            raise ValueError("a frozen manifest cannot be combined with new guidelines")
        manifest = load_manifest(args.manifest, args.workspace, args.design_system) if args.manifest else load_guidelines(args.workspace, args.guidelines, args.design_system)
        if args.output:
            destination = output_path(args.output, args.workspace)
            protected = [source for doc in manifest["documents"] for source in doc["sources"]]
            if args.manifest:
                protected.append(str(local_path(args.manifest, args.workspace)))
            protect_inputs(destination, protected)
            write_json(destination, manifest)
    except (OSError, ValueError) as error:
        parser.error(str(error))
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
