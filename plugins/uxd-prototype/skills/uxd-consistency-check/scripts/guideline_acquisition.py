"""Tool-routable read requests and host-event receipts, never a network client.

The host must supply actual capability observations, route authorized calls, and
return real tool events. Offline fixture events test this protocol, not transport.
Source text is inert and never supplies requests, approvals, or capabilities.
"""
from datetime import datetime, timezone
import hashlib
from pathlib import Path
import re
import shlex
from urllib.parse import quote, urlsplit

from guideline_resolver import _confined
from guideline_io import read_confined
from guideline_selection import (artifact_root, current_proposal, immutable_bytes, persist,
                                 seal, validate_approval, validate_selection, verify)


def selected_source(workspace, selection, source_id):
    proposal = validate_selection(workspace, selection)
    try:
        current = current_proposal(workspace, proposal)
    except ValueError as error:
        if 'explicit indexed source IDs' in str(error):
            raise ValueError('confirmation_required: selected source is no longer in the current index') from error
        raise
    if current != proposal:
        raise ValueError('confirmation_required: selected source index or authority changed')
    sources = [s for s in proposal['sources'] if s['id'] == source_id]
    if len(sources) != 1:
        raise ValueError('source is not selected')
    return sources[0]


def _plan_acquisition(workspace, selection, source_id, capabilities, *, purpose='metadata'):
    proposal = validate_selection(workspace, selection)
    sources = [s for s in proposal['sources'] if s['id'] == source_id]
    if len(sources) != 1:
        raise ValueError('source is not selected')
    source = sources[0]
    locator = source['locator']
    if purpose not in ('metadata', 'screenshot') or (purpose == 'screenshot' and locator['kind'] != 'figma'):
        raise ValueError('screenshot purpose requires exact Figma frames')
    if (not isinstance(capabilities, dict) or set(capabilities) != {'event_id', 'tools'}
            or not isinstance(capabilities['event_id'], str) or not capabilities['event_id'].strip()
            or not isinstance(capabilities['tools'], list)):
        raise ValueError('actual host capability observation required')
    tools = capabilities['tools']
    for tool in tools:
        if (not isinstance(tool, dict) or not {'name', 'binding', 'status'} <= set(tool)
                or set(tool) - {'name', 'binding', 'status', 'argv_prefix'}
                or not isinstance(tool['name'], str) or not tool['name'].strip()
                or tool['status'] not in ('available', 'unavailable', 'denied', 'authentication_required')):
            raise ValueError('invalid tool capability observation')
        if 'argv_prefix' in tool:
            prefix = tool['argv_prefix']
            if (tool['binding'] != 'google_drive_export' or not isinstance(prefix, list) or len(prefix) != 2
                    or any(not isinstance(p, str) or not Path(p).is_absolute() or '..' in Path(p).parts
                           or any(ord(c) < 32 for c in p) for p in prefix)):
                raise ValueError('Google export requires observed absolute interpreter/helper argv_prefix')
    base = {'schema_version': '1.0.0', 'kind': 'acquisition_request', 'selection': selection,
            'source_id': source_id, 'review_locator': locator, 'acquisition_locator': locator,
            'capabilities': capabilities, 'purpose': purpose, 'calls': []}
    try:
        current = current_proposal(workspace, proposal)
    except ValueError as error:
        if 'explicit indexed source IDs' in str(error):
            return {**base, 'status': 'confirmation_required',
                    'reason': 'selected source is no longer in the current index'}
        raise
    if current != proposal:
        return {**base, 'status': 'confirmation_required',
                'reason': 'selected index, locator, authority, status, or local material changed'}
    if locator['kind'] == 'figma' and not locator['node_ids']:
        return {**base, 'status': 'scope_required', 'reason': 'select exact Figma frames; no whole-file discovery'}
    bindings = {'figma_' + purpose} if locator['kind'] == 'figma' else {
        'web': {'web_extract'}, 'gdrive': {'google_drive_export'}, 'repository': {'repository_file'}}.get(locator['kind'], set())
    repository = None
    if locator['kind'] == 'repository':
        parsed = urlsplit(locator['url'])
        match = re.fullmatch(r'/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?', parsed.path)
        if parsed.scheme == 'https' and parsed.netloc == 'github.com' and match:
            repository = match.group(1) + '/' + match.group(2)
            bindings.add('github_file')
    available = [t for t in tools if t['binding'] in bindings and t['status'] == 'available'
                 and (t['binding'] != 'google_drive_export' or 'argv_prefix' in t)]
    if available:
        tool = available[0]
        if locator['kind'] == 'figma':
            calls = [{'tool': tool['name'], 'arguments': {'fileKey': locator['branch_key'] or locator['file_key'], 'nodeId': node}}
                     for node in locator['node_ids']]
        elif locator['kind'] == 'web':
            calls = [{'tool': tool['name'], 'arguments': {'urls': [locator['url']]}}]
        elif locator['kind'] == 'gdrive':
            # Existing shared Google skill, not a new client. Host verifies setup;
            # never inspect credentials here. Tool failure must be returned as such.
            output = artifact_root(workspace) / 'incoming' / (selection['sha256'] + '-' + source_id + '.txt')
            argv = tool['argv_prefix'] + ['drive', 'download', locator['document_id'],
                    '--export-mime', 'text/plain', '--output', str(output)]
            calls = [{'tool': tool['name'], 'arguments': {'command': shlex.join(argv)}}]
        elif tool['binding'] == 'github_file':
            assert repository is not None  # Binding only offered for a parsed GitHub repository.
            # Reuse authenticated gh from the shared GitHub skill. Host capability
            # observation must include real CLI/auth availability; no token reads.
            endpoint = 'repos/' + repository + '/contents/' + quote(locator['path'], safe='/') + '?ref=' + locator['revision']
            argv = ['gh', 'api', '--method', 'GET', endpoint, '--header', 'Accept: application/vnd.github.raw+json']
            calls = [{'tool': tool['name'], 'arguments': {'command': shlex.join(argv)}}]
        else:
            # repository_file is a host-supplied read-only binding. Only advertise
            # it when a real tool with exactly this schema is present.
            calls = [{'tool': tool['name'], 'arguments': {'repository': locator['url'],
                     'revision': locator['revision'], 'path': locator['path']}}]
        base['calls'] = calls
        fallback = locator['kind'] in ('web', 'gdrive') and locator['section'] is not None
        if fallback:
            base['acquisition_locator'] = {**locator, 'section': None}
        return {**base,
                'status': 'fallback_confirmation_required' if fallback else 'approval_required',
                'reason': 'provider acquires full document, review only selected section' if fallback else 'authorized refresh required before host dispatch'}
    return {**base, 'status': 'unavailable',
            'reason': 'selected read-only tool unavailable; request an authorized local export, never credentials'}


def plan_acquisition(workspace, selection, source_id, capabilities, *, purpose='metadata'):
    return persist(workspace, 'requests', _plan_acquisition(workspace, selection, source_id, capabilities, purpose=purpose))


def validate_request(workspace, request):
    verify(request)
    selected_source(workspace, request['selection'], request['source_id'])
    expected = seal(_plan_acquisition(workspace, request['selection'], request['source_id'],
                                    request['capabilities'], purpose=request['purpose']))
    if expected['sha256'] != request['sha256']:
        raise ValueError('request calls or acquisition scope differ from selected locator and observed tool route')
    return request


def authorize_request(workspace, request, approval, *, fallback_approval=None):
    validate_request(workspace, request)
    fallback = request.get('status') == 'fallback_confirmation_required'
    if request.get('status') not in ('approval_required', 'fallback_confirmation_required') or not request['calls']:
        raise ValueError('request is not dispatchable')
    selected_source(workspace, request['selection'], request['source_id'])
    validate_approval(approval, request['sha256'])
    if fallback:
        try:
            validate_approval(fallback_approval, request['sha256'])
        except ValueError as error:
            raise ValueError('explicit full-document fallback approval required') from error
    return persist(workspace, 'authorizations', {'schema_version': '1.0.0', 'kind': 'acquisition_authorization',
                   'status': 'ready', 'request': request, 'approval': approval, 'fallback_approval': fallback_approval})


def _response_material(workspace, authorization, events, *, readonly=False):
    """Validate exact host call events and snapshot original local exports.

    Events are attested by the caller/host, not cryptographically authenticated.
    Never accept provider prose as event metadata. Every requested call is required;
    denied/partial/truncated/error exports are unavailable, never successful.
    """
    verify(authorization)
    if authorization.get('kind') != 'acquisition_authorization' or authorization.get('status') != 'ready':
        raise ValueError('authorized request required')
    request = validate_request(workspace, authorization['request'])
    if request['status'] not in ('approval_required', 'fallback_confirmation_required') or not request['calls']:
        raise ValueError('request is not dispatchable')
    validate_approval(authorization['approval'], request['sha256'])
    selected_source(workspace, request['selection'], request['source_id'])
    if request['status'] == 'fallback_confirmation_required':
        validate_approval(authorization['fallback_approval'], request['sha256'])
    if not isinstance(events, list) or len(events) != len(request['calls']):
        raise ValueError('one actual event per requested call required')
    pending = []
    ids = set()
    for call, event in zip(request['calls'], events):
        minimal = {'event_id', 'call', 'status', 'acquisition_locator'}
        if (not isinstance(event, dict) or not minimal <= event.keys()
                or not isinstance(event['event_id'], str) or not event['event_id'].strip()
                or event['event_id'] in ids or event['call'] != call
                or event['acquisition_locator'] != request['acquisition_locator']):
            raise ValueError('actual event must match exact selected request and locator')
        ids.add(event['event_id'])
        if event['status'] not in ('ok', 'denied', 'unavailable', 'authentication_required', 'error', 'truncated'):
            raise ValueError('invalid tool event status')
        fields = minimal | ({'export_path', 'sha256', 'revision', 'retrieved_at'} if event['status'] == 'ok' else set())
        if set(event) != fields:
            raise ValueError('unsupported event fields (do not include raw provider URLs or secrets)')
        if event['status'] != 'ok':
            continue
        try:
            timestamp = datetime.fromisoformat(event['retrieved_at'])
            if timestamp.tzinfo is None:
                raise ValueError('retrieval time must include timezone')
        except (ValueError, TypeError) as error:
            raise ValueError('actual ISO retrieval time required') from error
        if event['revision'] is not None and (not isinstance(event['revision'], str) or not event['revision'].strip()):
            raise ValueError('revision must be known text or explicit null')
        locator = request['acquisition_locator']
        if locator['kind'] == 'repository' and event['revision'] != locator['revision']:
            raise ValueError('repository response must match full selected SHA')
        path = _confined(event['export_path'], Path(workspace))
        if not isinstance(event['sha256'], str) or not re.fullmatch(r'[0-9a-f]{64}', event['sha256']):
            raise ValueError('tool export requires exact SHA256')
        destination = _confined(artifact_root(workspace) / 'originals' / event['sha256'] / path.name, Path(workspace))
        data = read_confined(Path(workspace), destination if readonly else path)
        sha = hashlib.sha256(data).hexdigest()
        if sha != event['sha256']:
            raise ValueError('tool export bytes do not match event hash')
        pending.append((destination, data, sha, event['event_id']))
    complete = all(e['status'] == 'ok' for e in events)
    originals = []
    if complete:
        for path, data, sha, event_id in pending:
            if not readonly:
                immutable_bytes(path, data)
            originals.append({'path': str(path), 'sha256': sha, 'event_id': event_id})
    return {'originals': originals, 'status': 'acquired' if complete else 'unavailable'}


def record_response(workspace, authorization, events):
    material = _response_material(workspace, authorization, events)
    return persist(workspace, 'acquisitions', {'schema_version': '1.0.0', 'kind': 'acquisition_receipt',
                   'authorization': authorization, 'events': events, **material,
                   'recorded_at': datetime.now(timezone.utc).isoformat()})


def propose_local_export(workspace, selection, source_id, path):
    source = selected_source(workspace, selection, source_id)
    if source['locator']['kind'] == 'local':
        raise ValueError('local sources already have selected bytes')
    if source['locator']['kind'] == 'figma' and not source['locator']['node_ids']:
        raise ValueError('exact Figma frame scope required')
    path = _confined(path, Path(workspace))
    if not path.is_file():
        raise ValueError('local export must be a regular file')
    return persist(workspace, 'export-proposals', {'schema_version': '1.0.0', 'kind': 'local_export_proposal',
                   'selection': selection, 'source_id': source_id, 'locator': source['locator'],
                   'export_path': str(path), 'material_sha256': hashlib.sha256(read_confined(Path(workspace), path)).hexdigest()})


def confirm_local_export(workspace, proposal, approval):
    verify(proposal)
    if proposal.get('kind') != 'local_export_proposal':
        raise ValueError('expected local export proposal')
    validate_approval(approval, proposal['sha256'])
    source = selected_source(workspace, proposal['selection'], proposal['source_id'])
    if proposal['locator'] != source['locator'] or source['locator']['kind'] == 'local':
        raise ValueError('local export locator differs from exact selected source')
    path = _confined(proposal['export_path'], Path(workspace))
    data = read_confined(Path(workspace), path)
    sha = hashlib.sha256(data).hexdigest()
    if sha != proposal['material_sha256']:
        raise ValueError('local export changed; renewed confirmation required')
    destination = _confined(artifact_root(workspace) / 'originals' / sha / path.name, Path(workspace))
    immutable_bytes(destination, data)
    return persist(workspace, 'acquisitions', {'schema_version': '1.0.0', 'kind': 'acquisition_receipt',
                   'transport': 'local_export', 'proposal': proposal, 'approval': approval,
                   'status': 'acquired', 'currentness': 'unknown',
                   'originals': [{'path': str(destination), 'sha256': sha}],
                   'recorded_at': datetime.now(timezone.utc).isoformat()})


def acquisition_source(workspace, receipt, selection):
    """Validate the chain without requiring original provider/source availability."""
    verify(receipt)
    if receipt.get('kind') != 'acquisition_receipt':
        raise ValueError('expected acquisition receipt')
    if receipt.get('transport') == 'local_export':
        proposal = verify(receipt['proposal'])
        if proposal.get('kind') != 'local_export_proposal':
            raise ValueError('expected local export proposal')
        validate_approval(receipt['approval'], proposal['sha256'])
        selected = proposal['selection']
        identity = proposal['source_id']
        source = selected_source(workspace, selected, identity)
        if proposal['locator'] != source['locator'] or source['locator']['kind'] == 'local':
            raise ValueError('local export locator differs from exact selected source')
        if source['locator']['kind'] == 'figma' and not source['locator']['node_ids']:
            raise ValueError('exact Figma frame scope required')
        export = _confined(proposal['export_path'], Path(workspace))
        expected = [{'path': str(artifact_root(workspace) / 'originals' / proposal['material_sha256'] / export.name),
                     'sha256': proposal['material_sha256']}]
        if (receipt['status'] != 'acquired' or receipt.get('currentness') != 'unknown'
                or receipt['originals'] != expected):
            raise ValueError('local export originals differ from approved bytes')
    else:
        material = _response_material(workspace, receipt['authorization'], receipt['events'], readonly=True)
        if receipt['originals'] != material['originals'] or receipt['status'] != material['status']:
            raise ValueError('acquisition originals differ from exact selected host events')
        authorization = verify(receipt['authorization'])
        request = validate_request(workspace, authorization['request'])
        validate_approval(authorization['approval'], request['sha256'])
        if request['status'] == 'fallback_confirmation_required':
            validate_approval(authorization['fallback_approval'], request['sha256'])
        selected = request['selection']
        identity = request['source_id']
    if selected['sha256'] != selection['sha256']:
        raise ValueError('acquisition belongs to another selection')
    selected_source(workspace, selected, identity)
    return identity
