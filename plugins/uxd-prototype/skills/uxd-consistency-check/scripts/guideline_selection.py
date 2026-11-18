#!/usr/bin/env python3
"""Explicit consumer-local selection. Receipts record consent evidence, not signatures.

No network, credentials, policy inference, or source-content instruction execution.
Callers must supply genuine user/task approval; content policy_status is not consent.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess

from artifact_io import local_path
from guideline_io import read_confined, REQUEST_LIMIT
from guideline_resolver import _confined, _workspace, read_index
from guideline_sources import metadata as guideline_metadata

_UNSET = object()

def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def seal(value):
    return {**value, 'sha256': fingerprint(value)}


def verify(value):
    if not isinstance(value, dict) or value.get('sha256') != fingerprint({k: v for k, v in value.items() if k not in ('sha256', 'receipt_path')}):
        raise ValueError('receipt/proposal integrity mismatch')
    return value


def artifact_root(workspace):
    return _confined('.artifacts/consistency', _workspace(workspace))


def immutable_bytes(path, data):
    """Never replace an existing snapshot or follow a replaced artifact ancestor."""
    from guideline_io import immutable_write
    return immutable_write(path, data)


def _repository_ref(workspace):
    """Record a local repository revision when available; never contact a remote."""
    try:
        result = subprocess.run(["git", "-C", str(workspace), "rev-parse", "--verify", "HEAD"],
                                capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.TimeoutExpired):
        return None
    value = result.stdout.strip()
    return value if result.returncode == 0 and re.fullmatch(r"[0-9a-fA-F]{40}", value) else None


def persist(workspace, category, value):
    value = seal(value)
    path = local_path(artifact_root(workspace) / category / (value['sha256'] + '.json'), workspace)
    immutable_bytes(path, (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode())
    return {**value, 'receipt_path': str(path)}


def validate_approval(approval, sha):
    if (not isinstance(approval, dict) or set(approval) != {'kind', 'reference', 'quote', 'proposal_sha256'}
            or approval['kind'] not in ('explicit_instruction', 'confirmation')
            or any(not isinstance(approval[k], str) or not approval[k].strip() for k in ('reference', 'quote'))
            or approval['proposal_sha256'] != sha):
        raise ValueError('explicit scoped approval evidence matching proposal is required')


def source_path_label(workspace, path):
    return path.relative_to(workspace).as_posix() if path.is_relative_to(workspace) else path.as_posix()


def selected_source_path(workspace, proposal, source):
    path = source['locator']['path']
    if proposal['index'] is not None:
        return _confined(Path(proposal['index']).parent / path, workspace)
    return local_path(path, workspace)


def read_selected_markdown(workspace, path):
    # Only an explicitly named upload may be outside the workspace. Its parent
    # is the IO boundary; descriptor-relative reading still rejects symlinks.
    return read_confined(workspace if path.is_relative_to(workspace) else path.parent, path)


def _direct_catalog(workspace, guidelines):
    if not isinstance(guidelines, list) or not guidelines:
        raise ValueError('select at least one explicit local Markdown file')
    sources = []
    seen = set()
    for entry in guidelines:
        if (not isinstance(entry, dict) or set(entry) != {'path', 'scope'}
                or not isinstance(entry['path'], str) or not entry['path'].strip() or '://' in entry['path']):
            raise ValueError('each explicit guideline requires a local path and section or whole-document scope')
        path = local_path(entry['path'], workspace)
        if path.suffix.lower() not in {'.md', '.markdown'}:
            raise ValueError('explicit semantic guidance must be local Markdown')
        label = source_path_label(workspace, path)
        if label in seen:
            raise ValueError('duplicate explicit guideline path')
        seen.add(label)
        sources.append({'id': 'path-' + hashlib.sha256(label.encode()).hexdigest()[:16],
                        'identity': label, 'identity_kind': 'path_derived',
                        'locator': {'kind': 'local', 'path': label},
                        'guideline_scope': entry['scope'], 'rule_ids': [],
                        'heading': None, 'heading_anchor': None, 'scope': None,
                        'title': path.stem})
    return {'index': None, 'index_sha256': None, 'sidecar_sha256': None, 'product': None,
            'release': None, 'schema_version': 'direct-markdown', 'sources': sources}


def propose_selection(workspace, index=None, *, source_ids=None, review_scope, method, design_system='custom',
                      product_identity=None, _pinned_repository_ref=_UNSET, guideline_scopes=None, guidelines=None):
    if not isinstance(design_system, str) or not design_system.strip():
        raise ValueError('explicit applicability label must be a nonempty string')
    workspace = _workspace(workspace)
    modern = method == 'model' and isinstance(review_scope, dict)
    if guidelines is not None:
        if index is not None or source_ids is not None or guideline_scopes is not None or not modern:
            raise ValueError('explicit Markdown requires model review and cannot be combined with an index selection')
        catalog = _direct_catalog(workspace, guidelines)
        source_ids = [source['id'] for source in catalog['sources']]
    else:
        if index is None:
            raise ValueError('select explicit Markdown or an index')
        metadata = read_index(workspace, index)
        catalog = read_index(workspace, index, topics=metadata['topics'])
    catalog_product = catalog['product']
    if product_identity is not None:
        if not isinstance(product_identity, str) or not product_identity.strip():
            raise ValueError('explicit product identity must be nonempty text')
        if catalog_product is not None and product_identity != catalog_product:
            raise ValueError('explicit product identity conflicts with index metadata')
        product = product_identity
        product_identity_source = 'explicit_instruction'
    else:
        product = catalog_product
        product_identity_source = 'index_metadata' if index is not None else None
    if index is not None and (not isinstance(product, str) or not product.strip()):
        raise ValueError('identify the product before selecting product design guidelines')
    if (not isinstance(source_ids, list) or not source_ids or len(set(source_ids)) != len(source_ids)
            or set(source_ids) - {s['id'] for s in catalog['sources']}):
        raise ValueError('explicit indexed source IDs are required')
    if method not in ('deterministic', 'manual', 'model') or (not modern and (not isinstance(review_scope, str) or not review_scope.strip())):
        raise ValueError('explicit review scope and method are required')
    if modern:
        from review_scope import code_scope
        review_scope = code_scope(review_scope, workspace)
    if guideline_scopes is not None and (not modern or not isinstance(guideline_scopes, dict)
            or set(guideline_scopes) - set(source_ids)):
        raise ValueError('guideline scopes require a structured model selection and exact selected source IDs')
    if method == 'deterministic':
        _confined(review_scope, workspace)
    repository_ref = (_repository_ref(workspace) if _pinned_repository_ref is _UNSET
                      else _pinned_repository_ref)
    authored_metadata = catalog['schema_version'] in {'readme-links-1.0.0', 'direct-markdown'}
    sources = []
    authored_rule_ids = set()
    for source in catalog['sources']:
        if source['id'] not in source_ids:
            continue
        source = dict(source)
        material = None
        if source['locator']['kind'] == 'local':
            path = selected_source_path(workspace, catalog, source)
            data = read_selected_markdown(workspace, path)
            material = hashlib.sha256(data).hexdigest()
            text = data.decode('utf-8')
            if not text.strip():
                raise ValueError('selected Markdown is empty')
            info = guideline_metadata(text) if modern or authored_metadata else {}
            if authored_metadata:
                authored_id = info.get('id')
                if authored_id is not None and not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', authored_id):
                    raise ValueError('invalid source-authored guideline ID: ' + authored_id)
                if authored_id:
                    if authored_id in authored_rule_ids:
                        raise ValueError('duplicate source-authored guideline ID in selected README links: ' + authored_id)
                    authored_rule_ids.add(authored_id)
                    source['identity_kind'] = 'source_authored'
                    source['identity'] = authored_id
                    source['rule_ids'] = [authored_id]
                    source['rule_id'] = authored_id
                source['title'] = info.get('title', source['title'])
                source['owner'] = info.get('owner') or None
                source['authority'] = info.get('authority') or None
                status = info.get('policy_status', 'unknown')
                if status not in ('approved', 'draft', 'deprecated', 'unknown'):
                    raise ValueError('invalid source-authored policy_status: ' + status)
                source['policy_status'] = status
                source['scope'] = info.get('scope', source['scope'])
            if modern:
                from review_scope import section_scope
                selected_section = (guideline_scopes or {}).get(source['id'], source.get('guideline_scope'))
                resolved = section_scope(text, selected_section)
                source['guideline_scope'] = ({'kind': 'section', 'anchor': resolved['anchor']}
                    if resolved['kind'] == 'section' else {'kind': 'whole_document'})
                source['section_bounds'] = resolved
                if not authored_metadata:
                    authored_id = info.get('id')
                    if authored_id is not None and not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', authored_id):
                        raise ValueError('invalid source-authored guideline ID: ' + authored_id)
                    if authored_id:
                        if authored_id in authored_rule_ids:
                            raise ValueError('duplicate source-authored guideline ID in selected local sources: ' + authored_id)
                        authored_rule_ids.add(authored_id)
                    if source['rule_ids'] and source['rule_ids'] != [authored_id]:
                        raise ValueError('indexed rule IDs do not match the selected document identity')
                    source.update(identity_kind='source_authored' if authored_id else 'path_derived',
                         identity=authored_id or path.relative_to(workspace).as_posix(), rule_id=authored_id,
                         heading=source['title'], heading_anchor=resolved.get('anchor', ''))
                if index is None:
                    source.update(heading=resolved.get('heading'), heading_anchor=resolved.get('anchor'))
                source['document_design_system'] = info.get('design_system', design_system)
                source['applicability_origin'] = 'source_authored' if 'design_system' in info else 'inherited'
        source['material_sha256'] = material
        sources.append(source)
    return seal({'schema_version': '1.1.0' if modern else '1.0.0', 'kind': 'selection_proposal', 'workspace': str(workspace),
                 'purpose': 'product_design_guidelines',
                 'index': catalog['index'], 'index_sha256': catalog['index_sha256'],
                 'sidecar_sha256': catalog['sidecar_sha256'], 'repository_ref': repository_ref,
                  'product': product, 'product_identity_source': product_identity_source,
                  'release': catalog['release'],
                 'review_scope': review_scope, 'method': method, 'design_system': design_system, 'sources': sources})


def current_proposal(workspace, proposal):
    verify(proposal)
    if proposal['workspace'] != str(_workspace(workspace)):
        raise ValueError('proposal belongs to another workspace')
    identity_source = proposal.get('product_identity_source')
    if identity_source not in (None, 'index_metadata', 'explicit_instruction'):
        raise ValueError('invalid product identity source')
    if proposal['index'] is None:
        return propose_selection(
            workspace, review_scope=proposal['review_scope'], method=proposal['method'],
            design_system=proposal['design_system'], product_identity=proposal['product'],
            _pinned_repository_ref=proposal['repository_ref'],
            guidelines=[{'path': s['locator']['path'], 'scope': s['guideline_scope']}
                        for s in proposal['sources']],
        )
    current = propose_selection(workspace, proposal['index'], source_ids=[s['id'] for s in proposal['sources']],
                              review_scope=proposal['review_scope'], method=proposal['method'],
                              design_system=proposal.get('design_system', 'custom'),
                              product_identity=(proposal['product'] if identity_source == 'explicit_instruction' else None),
                              _pinned_repository_ref=proposal.get('repository_ref'),
                              guideline_scopes=({s['id']: s['guideline_scope'] for s in proposal['sources']}
                                  if proposal.get('schema_version') == '1.1.0' else None))
    if 'product_identity_source' not in proposal:
        # Pre-override proposals derive product solely from index metadata.
        current = seal({k: v for k, v in current.items() if k not in ('sha256', 'product_identity_source')})
    if 'design_system' not in proposal:
        # Pre-applicability receipts implicitly selected custom; retain their hash shape.
        current = seal({k: v for k, v in current.items() if k not in ('sha256', 'design_system')})
    if 'repository_ref' not in proposal:
        # Pre-revision selection receipts retain their original fingerprint shape.
        current = seal({k: v for k, v in current.items() if k not in ('sha256', 'repository_ref')})
    return current


def confirm_selection(workspace, proposal, approval, *, exceptions=(), model_approval=None):
    verify(proposal)
    validate_approval(approval, proposal['sha256'])
    if current_proposal(workspace, proposal) != proposal:
        raise ValueError('selection material changed; propose and confirm again')
    required = {s['id'] for s in proposal['sources'] if s['policy_status'] != 'approved'}
    if set(exceptions) != required:
        raise ValueError('non-approved policy requires explicit source exceptions')
    if proposal['method'] == 'model':
        try:
            validate_approval(model_approval, proposal['sha256'])
        except ValueError as error:
            raise ValueError('separate local model-review approval required') from error
    elif model_approval is not None:
        raise ValueError('model-review permission is only for a model selection')
    return persist(workspace, 'selections', {'schema_version': proposal['schema_version'], 'kind': 'selection_receipt',
                   'proposal': proposal, 'approval': approval, 'exceptions': sorted(exceptions),
                   'model_approval': model_approval})


def validate_selection(workspace, receipt):
    verify(receipt)
    if receipt.get('kind') != 'selection_receipt':
        raise ValueError('expected selection receipt')
    proposal = verify(receipt['proposal'])
    if receipt.get('schema_version') != proposal.get('schema_version') or proposal.get('schema_version') not in ('1.0.0', '1.1.0'):
        raise ValueError('unsupported selection contract version')
    if proposal['schema_version'] == '1.1.0':
        from review_scope import code_scope
        if code_scope(proposal['review_scope'], _workspace(workspace)) != proposal['review_scope']:
            raise ValueError('approved scope is not canonical')
    if proposal.get('product_identity_source') not in (None, 'index_metadata', 'explicit_instruction'):
        raise ValueError('invalid product identity source')
    if proposal.get('product_identity_source') == 'explicit_instruction' and (
            not isinstance(proposal.get('product'), str) or not proposal['product'].strip()):
        raise ValueError('explicit product identity must be nonempty text')
    if proposal['workspace'] != str(_workspace(workspace)):
        raise ValueError('selection belongs to another workspace')
    validate_approval(receipt['approval'], proposal['sha256'])
    if set(receipt['exceptions']) != {s['id'] for s in proposal['sources'] if s['policy_status'] != 'approved'}:
        raise ValueError('non-approved policy requires explicit source exceptions')
    if proposal['method'] == 'model':
        validate_approval(receipt['model_approval'], proposal['sha256'])
    return proposal


def reuse_selection(workspace, receipt):
    proposal = validate_selection(workspace, receipt)
    try:
        current = current_proposal(workspace, proposal)
    except OSError:
        return {'status': 'unknown', 'reason': 'local material cannot be revalidated'}
    except ValueError as error:
        if 'regular file' in str(error):
            return {'status': 'unknown', 'reason': 'local material cannot be revalidated'}
        if 'explicit indexed source IDs' in str(error):
            return {'status': 'confirmation_required', 'reason': 'selected source is no longer in the current index'}
        raise
    if current != proposal:
        return {'status': 'confirmation_required', 'proposal': current}
    if any(s['locator']['kind'] != 'local' for s in proposal['sources']):
        return {'status': 'unknown', 'reason': 'remote currentness unknown; no authorized refresh performed'}
    return {'status': 'reused', 'reason': 'selected local bytes revalidated'}


def main():
    """One offline JSON RPC-style CLI shared by selection/acquisition/staging.

    Input: {operation: <allowlisted hyphenated name>, arguments: {...}}.
    Approval evidence must come from the host/user, never source content. This CLI
    never dispatches tools: acquisition requests must be run by the authorized host.
    """
    import argparse
    from guideline_resolver import _unique_object
    from guideline_acquisition import (plan_acquisition, authorize_request, record_response,
                                       propose_local_export, confirm_local_export)
    from guideline_staging import (propose_staging, confirm_staging, reuse_staging, propose_adapter, confirm_adapter)
    parser = argparse.ArgumentParser(description=main.__doc__)
    parser.add_argument('--workspace', required=True)
    parser.add_argument('--request', required=True, help='consumer-confined JSON operation file')
    parser.add_argument('--guideline-args', action='store_true', help='for confirm-staging only: emit exact NAMESPACE=PATH lines')
    args = parser.parse_args()
    operations = {'propose-selection': propose_selection, 'confirm-selection': confirm_selection,
                  'reuse-selection': reuse_selection, 'plan-acquisition': plan_acquisition,
                  'authorize-request': authorize_request, 'record-response': record_response,
                  'propose-local-export': propose_local_export, 'confirm-local-export': confirm_local_export,
                  'propose-staging': propose_staging, 'confirm-staging': confirm_staging, 'reuse-staging': reuse_staging,
                  'propose-adapter': propose_adapter, 'confirm-adapter': confirm_adapter}
    try:
        workspace = _workspace(args.workspace)
        path = _confined(args.request, workspace)
        data = read_confined(workspace, path, REQUEST_LIMIT)
        request = json.loads(data.decode('utf-8'), object_pairs_hook=_unique_object)
        if (not isinstance(request, dict) or set(request) != {'operation', 'arguments'}
                or not isinstance(request['operation'], str) or request['operation'] not in operations
                or not isinstance(request['arguments'], dict) or 'workspace' in request['arguments']):
            raise ValueError('unsupported operation or arguments')
        if args.guideline_args and request['operation'] != 'confirm-staging':
            raise ValueError('--guideline-args only applies to confirm-staging')
        result = operations[request['operation']](workspace, **request['arguments'])
    except (OSError, ValueError, TypeError, KeyError, RecursionError) as error:
        parser.error(str(error))
    if args.guideline_args:
        for guideline in result['guidelines']:
            print(guideline)
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
