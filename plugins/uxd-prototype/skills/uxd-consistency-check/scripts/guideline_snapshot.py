"""Freeze only explicitly selected README-linked local rules for model review."""
import hashlib
import json
from pathlib import Path
import subprocess

from guideline_io import read_confined
from guideline_selection import artifact_root, current_proposal, immutable_bytes, validate_selection
from guideline_resolver import _confined, _workspace
from guideline_sources import metadata
from review_scope import code_scope, section_scope


def _fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                                ensure_ascii=False).encode()).hexdigest()


def freeze_selected_readme_sources(workspace, selection):
    root = _workspace(workspace)
    proposal = validate_selection(root, selection)
    if proposal.get("method") != "model":
        raise ValueError("explicit model-review selection is required")
    if proposal.get('schema_version') != '1.1.0':
        raise ValueError('structured approved code-path scope requires renewed selection')
    if current_proposal(root, proposal) != proposal:
        raise ValueError("confirmation_required: selected README, authority, locator, or rule bytes changed")
    documents = []
    for source in proposal["sources"]:
        if source["locator"].get("kind") != "local":
            raise ValueError("LLM local snapshot accepts only explicitly selected local README links")
        path = _confined(Path(proposal["index"]).parent / source["locator"]["path"], root)
        data = read_confined(root, path)
        sha = hashlib.sha256(data).hexdigest()
        if sha != source["material_sha256"]:
            raise ValueError("selected guideline bytes changed; renewed confirmation required")
        text = data.decode("utf-8")
        info = metadata(text)
        authored_id = info.get("id")
        if source.get("identity_kind") == "source_authored" and authored_id != source["identity"]:
            raise ValueError("source-authored guideline identity differs from the confirmed selection")
        if source.get("identity_kind") == "path_derived" and source["identity"] != path.relative_to(root).as_posix():
            raise ValueError("path-derived guideline identity differs from the exact selected relative path")
        documents.append({"id": source["identity"], "selection_id": source["id"],
            "identity_kind": source["identity_kind"],
            "identity": source["identity"], "path": path.relative_to(root).as_posix(),
            "sources": [str(path)], "heading": source["heading"],
            "heading_anchor": source["heading_anchor"], "text": text, "sha256": sha,
            "title": info.get("title", source["title"]), "authority": source.get("authority"),
            "policy_status": source.get("policy_status"), "rule_id": authored_id,
            "guideline_scope": source['guideline_scope'], "section_bounds": source['section_bounds'],
            "design_system": source['document_design_system'],
            "applicability_origin": source['applicability_origin'],
            "provenance": local_provenance(root, path, data, proposal.get('repository_ref'))})
    snapshot = {"schema_version": "readme-guideline-snapshot-2.0.0",
        "kind": "selected_local_guideline_snapshot", "workspace": str(root),
        "product": proposal["product"], "release": proposal["release"],
        "repository_ref": proposal.get('repository_ref'), "index": proposal["index"],
        "index_sha256": proposal["index_sha256"], "sidecar_sha256": proposal.get("sidecar_sha256"),
        "selection_sha256": proposal["sha256"], "review_scope": proposal["review_scope"],
        "selection": selection, "design_system": proposal['design_system'],
        "documents": documents}
    snapshot["snapshot_sha256"] = _fingerprint(snapshot)
    destination = _confined(artifact_root(root) / "guideline-snapshots" /
                            (snapshot["snapshot_sha256"] + ".json"), root)
    immutable_bytes(destination, (json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n").encode())
    return {"snapshot": snapshot, "path": str(destination)}


def local_provenance(root, path, data, revision):
    """A local HEAD is verified only if that commit contains exactly these bytes."""
    if revision:
        try:
            top = subprocess.check_output(['git', '-C', str(root), 'rev-parse', '--show-toplevel'], stderr=subprocess.DEVNULL).decode().strip()
            relative = path.relative_to(Path(top)).as_posix()
            result = subprocess.run(['git', '-C', str(root), 'show', revision + ':' + relative], capture_output=True, timeout=5)
            if result.returncode == 0 and result.stdout == data:
                return {'ref': revision, 'status': 'verified_git_blob', 'sha256': hashlib.sha256(data).hexdigest()}
        except (OSError, ValueError, subprocess.SubprocessError):
            pass
    return {'ref': None, 'status': 'working_tree_content', 'sha256': hashlib.sha256(data).hexdigest()}


def bind_manifest_selection(workspace, manifest, selection):
    """Bind legacy frozen bytes to a newly approved structured selection, without rewriting them."""
    from guideline_sources import validate_manifest
    validate_manifest(manifest)
    root = _workspace(workspace)
    proposal = validate_selection(root, selection)
    if proposal['schema_version'] != '1.1.0' or proposal['method'] != 'model':
        raise ValueError('manifest review requires a newly approved structured selection')
    if proposal['design_system'] != manifest['design_system']:
        raise ValueError('selected applicability differs from frozen manifest')
    documents = []
    used = set()
    for doc in manifest['documents']:
        if doc['kind'] == 'baseline':
            continue
        matches = [s for s in proposal['sources'] if s['locator']['kind'] == 'local'
            and str(Path(proposal['index']).parent / s['locator']['path']) in doc['sources']
            and s['material_sha256'] == doc['sha256']]
        if len(matches) != 1:
            raise ValueError('manifest bytes/path are not bound to the approved selection')
        source = matches[0]
        used.add(source['id'])
        path = Path(proposal['index']).parent / source['locator']['path']
        info = metadata(doc['text'])
        identity = info.get('id') or path.relative_to(root).as_posix()
        documents.append({**doc, 'selection_id': source['id'], 'path': path.relative_to(root).as_posix(),
            'identity': identity, 'identity_kind': 'source_authored' if info.get('id') else 'path_derived',
            'rule_id': info.get('id'), 'guideline_scope': source['guideline_scope'],
            'section_bounds': section_scope(doc['text'], source['guideline_scope']),
            'applicability_origin': 'source_authored' if 'design_system' in info else 'inherited',
            'provenance': {'ref': None, 'status': 'unverifiable_legacy_ref', 'sha256': doc['sha256']}})
    if used != {s['id'] for s in proposal['sources']}:
        raise ValueError('selected sources and manifest membership differ')
    snapshot = {'schema_version': 'readme-guideline-snapshot-2.0.0', 'kind': 'selected_local_guideline_snapshot',
        'workspace': str(root), 'selection': selection, 'selection_sha256': proposal['sha256'],
        'design_system': proposal['design_system'], 'review_scope': proposal['review_scope'],
        'repository_ref': None, 'legacy_manifest_fingerprint': manifest['version'], 'documents': documents}
    snapshot['snapshot_sha256'] = _fingerprint(snapshot)
    return validate_readme_snapshot(snapshot, root)


def validate_readme_snapshot(snapshot, workspace):
    if (not isinstance(snapshot, dict) or snapshot.get("schema_version") not in ('readme-guideline-snapshot-1.0.0', 'readme-guideline-snapshot-2.0.0')
            or snapshot.get("kind") != "selected_local_guideline_snapshot"):
        raise ValueError("unsupported selected README guideline snapshot")
    expected = _fingerprint({key: value for key, value in snapshot.items() if key != "snapshot_sha256"})
    if snapshot.get("snapshot_sha256") != expected:
        raise ValueError("selected guideline snapshot hash mismatch")
    if snapshot.get("workspace") != str(_workspace(workspace)):
        raise ValueError("selected guideline snapshot belongs to another workspace")
    if not isinstance(snapshot.get("documents"), list) or not snapshot["documents"]:
        raise ValueError("selected guideline snapshot requires at least one rule")
    modern = snapshot['schema_version'] == 'readme-guideline-snapshot-2.0.0'
    if modern:
        proposal = validate_selection(workspace, snapshot['selection'])
        if (proposal['schema_version'] != '1.1.0' or proposal['method'] != 'model'
                or snapshot['selection_sha256'] != proposal['sha256']
                or snapshot['review_scope'] != proposal['review_scope']
                or snapshot['design_system'] != proposal['design_system']):
            raise ValueError('snapshot differs from approved scope/applicability')
        code_scope(snapshot['review_scope'], Path(workspace))
    identities = set()
    for document in snapshot["documents"]:
        if not isinstance(document, dict) or document.get("identity_kind") not in ("source_authored", "path_derived"):
            raise ValueError("invalid selected guideline identity")
        if document.get("id") in identities:
            raise ValueError("duplicate selected guideline identity")
        identities.add(document["id"])
        if hashlib.sha256(document.get("text", "").encode("utf-8")).hexdigest() != document.get("sha256"):
            raise ValueError("selected guideline text hash mismatch")
        path = document.get("path")
        if not isinstance(path, str) or Path(path).is_absolute() or ".." in Path(path).parts:
            raise ValueError("selected guideline path must be workspace-relative")
        if document["identity_kind"] == "path_derived" and document.get("identity") != path:
            raise ValueError("path-derived identity must retain the exact relative source path")
        if document["identity_kind"] == "source_authored" and document.get("rule_id") != document.get("identity"):
            raise ValueError("source-authored identity differs from the frontmatter ID")
        if modern:
            source = next((s for s in proposal['sources'] if s['id'] == document['selection_id']), None)
            if (source is None or source['material_sha256'] != document['sha256']
                    or str(Path(proposal['index']).parent / source['locator']['path']) not in document['sources']
                    or document['path'] != (Path(proposal['index']).parent / source['locator']['path']).relative_to(Path(workspace)).as_posix()
                    or document['guideline_scope'] != source['guideline_scope']
                    or document['section_bounds'] != section_scope(document['text'], source['guideline_scope'])
                    or document['design_system'] != source['document_design_system']):
                raise ValueError('snapshot document differs from approved material/section/applicability')
            info = metadata(document['text'])
            if (document['design_system'] != info.get('design_system', proposal['design_system'])
                    or document['applicability_origin'] != ('source_authored' if 'design_system' in info else 'inherited')
                    or document['identity'] != (info.get('id') or path)):
                raise ValueError('snapshot identity/applicability differs from frozen text')
            provenance = document.get('provenance', {})
            if (set(provenance) != {'ref', 'status', 'sha256'} or provenance['sha256'] != document['sha256']
                    or provenance['status'] not in ('verified_git_blob', 'working_tree_content', 'unverifiable_legacy_ref')
                    or (provenance['status'] != 'verified_git_blob' and provenance['ref'] is not None)
                    or (provenance['status'] == 'verified_git_blob' and provenance['ref'] != proposal['repository_ref'])):
                raise ValueError('invalid frozen guideline provenance')
    if modern and {d['selection_id'] for d in snapshot['documents']} != {s['id'] for s in proposal['sources']}:
        raise ValueError('snapshot selected-source membership mismatch')
    return snapshot
