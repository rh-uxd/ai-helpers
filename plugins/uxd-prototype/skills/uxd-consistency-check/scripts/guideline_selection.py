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


def propose_selection(workspace, index, *, source_ids, review_scope, method, design_system='custom',
                      product_identity=None, _pinned_repository_ref=_UNSET, guideline_scopes=None):
    if not isinstance(design_system, str) or not design_system.strip():
        raise ValueError('explicit applicability label must be a nonempty string')
    workspace = _workspace(workspace)
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
        product_identity_source = 'index_metadata'
    if not isinstance(product, str) or not product.strip():
        raise ValueError('identify the product before selecting product design guidelines')
    if (not isinstance(source_ids, list) or not source_ids or len(set(source_ids)) != len(source_ids)
            or set(source_ids) - {s['id'] for s in catalog['sources']}):
        raise ValueError('explicit indexed source IDs are required')
    modern = method == 'model' and isinstance(review_scope, dict)
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
    readme_link_mode = catalog['schema_version'] == 'readme-links-1.0.0'
    sources = []
    authored_rule_ids = set()
    for source in catalog['sources']:
        if source['id'] not in source_ids:
            continue
        source = dict(source)
        material = None
        if source['locator']['kind'] == 'local':
            path = _confined(Path(catalog['index']).parent / source['locator']['path'], workspace)
            if not path.is_file():
                raise ValueError('selected local material must be a regular file')
            data = read_confined(workspace, path)
            material = hashlib.sha256(data).hexdigest()
            if readme_link_mode:
                info = guideline_metadata(data.decode('utf-8'))
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
                resolved = section_scope(data.decode('utf-8'), selected_section)
                source['guideline_scope'] = ({'kind': 'section', 'anchor': resolved['anchor']}
                    if resolved['kind'] == 'section' else {'kind': 'whole_document'})
                source['section_bounds'] = resolved
                info = guideline_metadata(data.decode('utf-8'))
                if not readme_link_mode:
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
