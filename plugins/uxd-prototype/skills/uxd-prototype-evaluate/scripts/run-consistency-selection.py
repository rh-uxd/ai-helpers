#!/usr/bin/env python3
"""Consume an already confirmed product-guideline staging receipt offline.

No discovery, approval, acquisition, model dispatch, or product writes occur here.
Exit 0: checked without errors; 1: guideline violations; 2: execution/selection error.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import quote
import uuid


def write_consumer_json(workspace, path, value):
    """Atomically replace consumer JSON without reopening mutable ancestor paths."""
    from guideline_resolver import confined_path, resolve_workspace
    from guideline_io import parent_directory_fd
    path = confined_path(path, resolve_workspace(workspace))
    data = (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode('utf-8')
    temporary = '.consistency-' + uuid.uuid4().hex + '.json'
    with parent_directory_fd(path, create=True) as directory:
        try:
            fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                         0o600, dir_fd=directory)
            try:
                remaining = memoryview(data)
                while remaining:
                    written = os.write(fd, remaining)
                    if not written:
                        raise OSError('incomplete report write')
                    remaining = remaining[written:]
                os.fsync(fd)
            finally:
                os.close(fd)
            os.replace(temporary, path.name, src_dir_fd=directory, dst_dir_fd=directory)
        finally:
            try:
                os.unlink(temporary, dir_fd=directory)
            except FileNotFoundError:
                pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', required=True, help='Consumer root, not the approved review scope')
    parser.add_argument('--staging-receipt', required=True)
    parser.add_argument('--artifacts-dir', required=True, help='Consumer .artifacts/<KEY>/eval directory')
    parser.add_argument('--changed', action='store_true', help='Restrict checks to an explicit Git delta')
    parser.add_argument('--base-ref', help='Explicit MR target/base revision; no default is guessed')
    parser.add_argument('--merge-base', action='store_true', help='Check committed branch delta')
    parser.add_argument('--tracked-only', action='store_true', help='Exclude untracked source files')
    args = parser.parse_args()
    if args.changed and (args.base_ref is None or not args.base_ref.strip()):
        parser.error('--changed requires an explicit --base-ref')
    for option, enabled in (('--base-ref', args.base_ref is not None),
                            ('--merge-base', args.merge_base), ('--tracked-only', args.tracked_only)):
        if enabled and not args.changed:
            parser.error(option + ' requires --changed')
    scope_args = ['--changed', '--base-ref', args.base_ref] if args.changed else []
    if args.merge_base:
        scope_args.append('--merge-base')
    if args.tracked_only:
        scope_args.append('--tracked-only')
    checker = Path(os.environ.get('UXD_CONSISTENCY_CHECKER_DIR')
                   or Path(__file__).resolve().parents[2] / 'uxd-consistency-check')
    if not checker.is_absolute():
        raise ValueError('UXD_CONSISTENCY_CHECKER_DIR must be an absolute skill-directory path')
    if not all((checker / name).is_file() for name in ('SKILL.md', 'scripts/analyze.py')):
        raise ValueError('The bundled sibling uxd-consistency-check skill is missing or incomplete; '
                         'restore or update the combined plugin, or set UXD_CONSISTENCY_CHECKER_DIR '
                         'to an absolute path for a deliberately separate installation. '
                         'No substitute audit is run.')
    sys.path.insert(0, str(checker / 'scripts'))
    try:
        from guideline_resolver import confined_path, resolve_workspace, unique_object_hook
        from guideline_io import read_confined, REQUEST_LIMIT
        from guideline_staging import reuse_staging
        from artifact_io import output_path
    except ImportError as error:
        raise ValueError('The bundled sibling uxd-consistency-check selection runtime is incomplete '
                         '(scripts/guideline_staging.py or a dependency is missing); restore or update '
                         'the combined plugin, or set UXD_CONSISTENCY_CHECKER_DIR for a deliberately '
                         'separate installation. No substitute audit is run.') from error

    root = resolve_workspace(args.workspace)
    receipt_path = confined_path(args.staging_receipt, root)
    try:
        data = read_confined(root, receipt_path, REQUEST_LIMIT)
    except ValueError as error:
        if str(error) == 'selected evidence exceeds byte limit':
            raise ValueError('staging receipt exceeds 4MiB') from error
        raise
    receipt = json.loads(data.decode('utf-8'), object_pairs_hook=unique_object_hook)
    state = reuse_staging(root, receipt)
    if state['status'] != 'frozen_ready':
        raise ValueError('Renewed selection confirmation required: ' + state.get('reason', state['status']))
    if not state['analysis_workspace']:
        raise ValueError('Manual/model selection has no deterministic invocation; keep evidence separate. '
                         'Selection consent does not authorize model dispatch.')
    artifacts = confined_path(args.artifacts_dir, root)
    destination = output_path(str(artifacts / 'consistency-report.json'), root)
    sidecar_path = output_path(str(artifacts / 'consistency-selection.json'), root)
    analysis_root = Path(state['analysis_workspace'])
    analysis_report = analysis_root / '.artifacts/consistency' / ('eval-' + uuid.uuid4().hex) / 'consistency-report.json'
    # Preserve the checker's exact --workspace and selected input arguments.
    result = subprocess.run([sys.executable, '-S', str(checker / 'scripts/analyze.py'),
                             *state['analyzer_args'], *scope_args, '--json-file', str(analysis_report)],
                            text=True, capture_output=True, check=False)
    if result.returncode not in (0, 1):
        raise ValueError(result.stderr.strip() or 'checker execution failed')
    report = json.loads(analysis_report.read_text(encoding='utf-8'))
    manifest = confined_path(analysis_root / report['guideline_manifest'], root)
    links = []
    for title, path in [('Confirmed staging receipt', receipt_path), ('Frozen guideline manifest', manifest),
                        *[(f"Original evidence: {item['source_id']}", Path(item['path']))
                          for item in receipt['proposal']['originals']]]:
        path = confined_path(path, root)
        links.append({'title': title, 'href': quote(os.path.relpath(path, artifacts), safe='/')})
    # Copy the deterministic report unchanged; its workspace remains the approved scope.
    write_consumer_json(root, destination, report)
    sidecar = {'schema_version': '1.0.0', 'status': state['status'],
               'currentness': state['currentness'], 'analysis_workspace': state['analysis_workspace'],
               'manual_evidence': state['manual_evidence'], 'links': links}
    write_consumer_json(root, sidecar_path, sidecar)
    print(json.dumps(sidecar, indent=2))
    return result.returncode


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, TypeError, RecursionError) as error:
        print(f'Consistency selection failed: {error}', file=sys.stderr)
        sys.exit(2)
