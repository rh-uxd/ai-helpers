"""Immutable selected evidence to explicit offline analyzer inputs; no implicit policy."""
import hashlib
from pathlib import Path

from guideline_resolver import _confined, _workspace
from guideline_acquisition import acquisition_source
from guideline_selection import (artifact_root, immutable_bytes, persist, reuse_selection,
                                 validate_approval, validate_selection, verify)
from guideline_sources import load_guidelines as _load_guidelines
from guideline_io import read_confined


def load_guidelines(workspace, provided=(), design_system='custom'):
    return _load_guidelines(workspace, provided, design_system,
                            read_bytes=lambda path: read_confined(_workspace(workspace), path))


def snapshot_bytes(workspace, path, expected=None):
    path = _confined(path, _workspace(workspace))
    if not path.is_file():
        raise ValueError('selected evidence must be a regular local file')
    data = read_confined(_workspace(workspace), path)
    if expected is not None and hashlib.sha256(data).hexdigest() != expected:
        raise ValueError('selected material changed; renewed confirmation required')
    return data


def snapshot(workspace, path, *, expected=None, category='originals', identity='', readonly=False):
    path = _confined(path, _workspace(workspace))
    data = snapshot_bytes(workspace, path, expected)
    sha = hashlib.sha256(data).hexdigest()
    destination = _confined(artifact_root(workspace) / category / identity / sha / path.name, _workspace(workspace))
    if readonly:
        snapshot_bytes(workspace, destination, sha)
    else:
        immutable_bytes(destination, data)
    return {'path': str(destination), 'sha256': sha}


def _build_staging(workspace, selection, *, acquisitions=(), adapters=(), readonly=False):
    from functools import partial
    take_snapshot = partial(snapshot, readonly=readonly)
    proposal = validate_selection(workspace, selection)
    by_source = {}
    for acquisition in acquisitions:
        identity = acquisition_source(workspace, acquisition, selection)
        if identity in by_source:
            raise ValueError('multiple acquisitions for one source require an explicit choice')
        by_source[identity] = acquisition
    originals = []
    candidates = []
    manual = []
    for source in proposal['sources']:
        if source['locator']['kind'] == 'local':
            path = Path(proposal['index']).parent / source['locator']['path']
            if readonly:
                path = artifact_root(workspace) / 'originals' / source['material_sha256'] / path.name
            items = [take_snapshot(workspace, path, expected=source['material_sha256'])]
        else:
            acquisition = by_source.get(source['id'])
            if acquisition is None or acquisition['status'] != 'acquired':
                manual.append({'source_id': source['id'], 'locator': source['locator'],
                               'status': 'unavailable', 'reason': 'selected source has no successful acquisition'})
                continue
            items = acquisition['originals']
        for item in items:
            original = take_snapshot(workspace, item['path'], expected=item['sha256'])
            original = {**original, 'source_id': source['id'], 'locator': source['locator']}
            originals.append(original)
            staged = take_snapshot(workspace, original['path'], expected=original['sha256'], category='staged', identity=source['id'])
            # Original filename and bytes are preserved; never rewrite incompatible input.
            try:
                if Path(staged['path']).suffix.lower() != '.md' or proposal['method'] != 'deterministic':
                    raise ValueError('selected evidence is not deterministic Markdown input')
                if source['locator']['kind'] == 'figma':
                    raise ValueError('Figma metadata/assets are manual evidence, not rule definitions')
                if source['locator'].get('section') is not None:
                    raise ValueError('section review requires an explicit mapped adapter, not whole-document rules')
                manifest = load_guidelines(workspace, [source['id'] + '=' + staged['path']], proposal.get('design_system', 'custom'))
                if source['rule_ids'] and set(source['rule_ids']) != {d['original_id'] for d in manifest['documents']}:
                    raise ValueError('indexed rule IDs do not match document identities')
            except (ValueError, UnicodeError) as error:
                manual.append({**original, 'status': 'unevaluated', 'method': proposal['method'], 'reason': str(error)})
                continue
            candidates.append({**staged, 'source_id': source['id'], 'namespace': source['id']})
    for adapter in adapters:
        verify(adapter)
        if adapter.get('kind') != 'adapter_receipt':
            raise ValueError('expected approved adapter receipt')
        adapted = validate_adapter(workspace, adapter['proposal'])
        validate_approval(adapter['approval'], adapted['sha256'])
        if adapted['staging']['selection']['sha256'] != selection['sha256']:
            raise ValueError('adapter belongs to another selection')
        if not any(o['source_id'] == adapted['source_id'] and o['sha256'] == adapted['original']['sha256'] for o in originals):
            raise ValueError('adapter original is not selected material')
        derived = take_snapshot(workspace, adapted['derived']['path'], expected=adapted['derived']['sha256'],
                           category='staged', identity='adapter-' + adapted['source_id'])
        candidates.append({**derived, 'namespace': 'adapter-' + adapted['source_id'],
                           'source_id': adapted['source_id'], 'adapter_receipt': adapter['sha256']})
    load_guidelines(workspace, [c['namespace'] + '=' + c['path'] for c in candidates], proposal.get('design_system', 'custom'))
    return {'schema_version': '1.0.0', 'kind': 'staging_proposal',
                   'selection': selection, 'originals': originals, 'candidates': candidates,
                   'manual_evidence': manual, 'acquisitions': list(acquisitions), 'adapters': list(adapters),
                   'requires_material_approval': any(o['locator']['kind'] != 'local' for o in originals)}


def propose_staging(workspace, selection, *, acquisitions=(), adapters=()):
    if reuse_selection(workspace, selection)['status'] == 'confirmation_required':
        raise ValueError('selected material changed; renewed confirmation required')
    return persist(workspace, 'staging-proposals', _build_staging(workspace, selection, acquisitions=acquisitions, adapters=adapters))


def validate_staging(workspace, proposal):
    from guideline_selection import seal
    verify(proposal)
    if proposal.get('kind') != 'staging_proposal':
        raise ValueError('expected staging proposal')
    expected = seal(_build_staging(workspace, proposal['selection'], acquisitions=proposal['acquisitions'],
                                   adapters=proposal['adapters'], readonly=True))
    if expected['sha256'] != proposal['sha256']:
        raise ValueError('staging evidence differs from exact selected material')
    return proposal


def confirm_staging(workspace, proposal, *, material_approval=None):
    validate_staging(workspace, proposal)
    validate_selection(workspace, proposal['selection'])
    if proposal.get('kind') != 'staging_proposal':
        raise ValueError('expected staging proposal')
    if reuse_selection(workspace, proposal['selection'])['status'] == 'confirmation_required':
        raise ValueError('selected material changed; renewed confirmation required')
    for original in proposal['originals']:
        snapshot(workspace, original['path'], expected=original['sha256'])
    if proposal['requires_material_approval']:
        validate_approval(material_approval, proposal['sha256'])
    arguments = []
    for candidate in proposal['candidates']:
        snapshot(workspace, candidate['path'], expected=candidate['sha256'], category='staged', identity=candidate['source_id'])
        arguments.append(candidate['namespace'] + '=' + candidate['path'])
    selected = proposal['selection']['proposal']
    load_guidelines(workspace, arguments, selected.get('design_system', 'custom'))
    analysis_workspace = str(_confined(selected['review_scope'], _workspace(workspace))) if selected['method'] == 'deterministic' else None
    analyzer_args = ['--workspace', analysis_workspace] if analysis_workspace else []
    if analysis_workspace:
        analyzer_args.extend(['--design-system', selected.get('design_system', 'custom')])
    for value in arguments:
        analyzer_args.extend(['--guidelines', value])
    return persist(workspace, 'staging', {'schema_version': '1.0.0', 'kind': 'staging_receipt',
                   'proposal': proposal, 'guidelines': arguments, 'manual_evidence': proposal['manual_evidence'],
                   'analysis_workspace': analysis_workspace, 'analyzer_args': analyzer_args,
                   'material_approval': material_approval})


def reuse_staging(workspace, receipt):
    """Revalidate persisted frozen inputs without reapproval or a freshness claim."""
    verify(receipt)
    if receipt.get('kind') != 'staging_receipt':
        raise ValueError('expected staging receipt')
    proposed = validate_staging(workspace, receipt['proposal'])
    if proposed['requires_material_approval']:
        validate_approval(receipt['material_approval'], proposed['sha256'])
    state = reuse_selection(workspace, proposed['selection'])
    if state['status'] == 'confirmation_required':
        return {'status': 'confirmation_required', 'reason': 'selected material changed'}
    for original in proposed['originals']:
        snapshot_bytes(workspace, original['path'], original['sha256'])
    for candidate in proposed['candidates']:
        snapshot_bytes(workspace, candidate['path'], candidate['sha256'])
    if receipt['guidelines'] != [c['namespace'] + '=' + c['path'] for c in proposed['candidates']]:
        raise ValueError('staging arguments differ from selected snapshots')
    selected = proposed['selection']['proposal']
    expected_workspace = str(_confined(selected['review_scope'], _workspace(workspace))) if selected['method'] == 'deterministic' else None
    expected_args = ['--workspace', expected_workspace] if expected_workspace else []
    if expected_workspace:
        expected_args.extend(['--design-system', selected.get('design_system', 'custom')])
    for guideline in receipt['guidelines']:
        expected_args.extend(['--guidelines', guideline])
    legacy_args = (['--workspace', expected_workspace] if expected_workspace else [])
    for guideline in receipt['guidelines']:
        legacy_args.extend(['--guidelines', guideline])
    valid_args = receipt['analyzer_args'] == expected_args or (
        'design_system' not in selected and receipt['analyzer_args'] == legacy_args)
    if (receipt['analysis_workspace'] != expected_workspace or not valid_args
            or receipt['manual_evidence'] != proposed['manual_evidence']):
        raise ValueError('staging invocation or evidence differs from selected scope')
    load_guidelines(workspace, receipt['guidelines'], selected.get('design_system', 'custom'))
    return {'status': 'frozen_ready', 'currentness': 'local_bytes_revalidated' if state['status'] == 'reused' else 'unknown',
            'guidelines': receipt['guidelines'], 'manual_evidence': receipt['manual_evidence'],
            'analysis_workspace': expected_workspace, 'analyzer_args': expected_args}


def _build_adapter(workspace, staging, source_id, original_sha256, path, *, version, mappings, readonly=False):
    validate_staging(workspace, staging)
    if staging.get('kind') != 'staging_proposal':
        raise ValueError('expected staging proposal with immutable originals')
    selection = validate_selection(workspace, staging['selection'])
    if selection['method'] != 'deterministic':
        raise ValueError('an executable adapter requires a separately selected deterministic review method')
    source = next((s for s in selection['sources'] if s['id'] == source_id), None)
    originals = [o for o in staging['originals'] if o['source_id'] == source_id and o['sha256'] == original_sha256]
    if source is None or len(originals) != 1:
        raise ValueError('exact selected original required')
    if not isinstance(version, str) or not version.strip():
        raise ValueError('explicit adapter version required')
    original = originals[0]
    data = snapshot_bytes(workspace, original['path'], original['sha256'])
    derived = snapshot(workspace, path, category='derived', identity=source_id, readonly=readonly)
    manifest = load_guidelines(workspace, ['adapter-' + source_id + '=' + derived['path']], selection.get('design_system', 'custom'))
    ids = {d['original_id'] for d in manifest['documents']}
    if any(not identity.startswith('local-') for identity in ids):
        raise ValueError('adapter must assign explicit local- rule IDs, never source-authored identities')
    if not isinstance(mappings, list) or not mappings:
        raise ValueError('exact original quote mappings required')
    mapped = set()
    section = source['locator'].get('section') or source['scope']
    for mapping in mappings:
        if (not isinstance(mapping, dict) or set(mapping) != {'local_rule_id', 'section', 'quote', 'start', 'end'}
                or mapping['local_rule_id'] not in ids or mapping['section'] != section
                or type(mapping['start']) is not int or type(mapping['end']) is not int
                or not 0 <= mapping['start'] < mapping['end'] <= len(data)
                or not isinstance(mapping['quote'], str) or not mapping['quote']
                or data[mapping['start']:mapping['end']] != mapping['quote'].encode('utf-8')):
            raise ValueError('adapter mapping must cite exact selected section and original byte-range quote')
        mapped.add(mapping['local_rule_id'])
    if mapped != ids:
        raise ValueError('every local adapter rule requires original evidence mapping')
    return {'schema_version': '1.0.0', 'kind': 'adapter_proposal',
            'staging': staging, 'source_id': source_id, 'original': original, 'derived': derived,
            'version': version, 'mappings': mappings, 'identity_origin': 'locally_assigned'}


def propose_adapter(workspace, staging, source_id, original_sha256, path, *, version, mappings):
    return persist(workspace, 'adapter-proposals', _build_adapter(workspace, staging, source_id, original_sha256, path,
                                                                 version=version, mappings=mappings))


def validate_adapter(workspace, proposal):
    from guideline_selection import seal
    verify(proposal)
    if proposal.get('kind') != 'adapter_proposal':
        raise ValueError('expected separate adapter proposal')
    expected = seal(_build_adapter(workspace, proposal['staging'], proposal['source_id'], proposal['original']['sha256'],
                                  proposal['derived']['path'], version=proposal['version'], mappings=proposal['mappings'], readonly=True))
    if expected['sha256'] != proposal['sha256']:
        raise ValueError('adapter differs from exact selected original and derived evidence')
    return proposal


def confirm_adapter(workspace, proposal, approval):
    validate_adapter(workspace, proposal)
    if proposal.get('kind') != 'adapter_proposal':
        raise ValueError('expected separate adapter proposal')
    validate_approval(approval, proposal['sha256'])
    validate_selection(workspace, proposal['staging']['selection'])
    snapshot(workspace, proposal['original']['path'], expected=proposal['original']['sha256'])
    snapshot(workspace, proposal['derived']['path'], expected=proposal['derived']['sha256'], category='derived', identity=proposal['source_id'])
    return persist(workspace, 'adapters', {'schema_version': '1.0.0', 'kind': 'adapter_receipt',
                   'proposal': proposal, 'approval': approval})
