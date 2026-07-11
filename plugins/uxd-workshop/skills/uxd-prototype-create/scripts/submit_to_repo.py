#!/usr/bin/env python3
"""
Submit a workspace-mode prototype to a git repo and create a GitLab merge request.

Uses GitLab push options to create the MR directly during `git push` — no separate
API call or token needed beyond what git already uses for authentication.

Usage:
    python3 scripts/submit_to_repo.py --rfe-key PROJ-298 \
        --title "New onboarding wizard" \
        [--remote git@gitlab.example.com:myuser/repo.git] \
        [--no-ssl-verify] \
        [--dry-run]

Output (JSON to stdout):
    {
      "status": "pushed",
      "branch": "prototype/PROJ-298",
      "target_branch": "main",
      "remote": "https://gitlab.example.com/org/repo.git",
      "merge_request_url": "https://gitlab.example.com/org/repo/-/merge_requests/42",
      "commit": "abc1234"
    }
"""

import json
import os
import re
import subprocess
import sys


def read_workspace_analysis(rfe_key):
    """Read workspace analysis JSON for clone metadata."""
    path = f'.artifacts/{rfe_key}/workspace-analysis.json'
    if not os.path.isfile(path):
        print(f'Error: workspace analysis not found at {path}', file=sys.stderr)
        sys.exit(1)
    with open(path) as f:
        return json.load(f)


def parse_changeset_files(rfe_key):
    """Extract file paths from the changeset manifest markdown.

    Only matches top-level list items that look like file paths (contain a /
    or a file extension). Skips sub-bullets and non-path backtick content.
    """
    path = f'.artifacts/{rfe_key}/changeset.md'
    if not os.path.isfile(path):
        print(f'Error: changeset not found at {path}', file=sys.stderr)
        sys.exit(1)

    files = []
    with open(path) as f:
        for line in f:
            stripped = line.rstrip()
            if not stripped.startswith('- `'):
                continue
            match = re.match(r'^- `([^`]+)`', stripped)
            if match:
                candidate = match.group(1)
                if '/' in candidate or '.' in candidate:
                    files.append(candidate)
    return files


def read_review_score(rfe_key):
    """Read the rubric score from the review summary, if it exists."""
    path = f'.artifacts/{rfe_key}/reviews/summary.md'
    if not os.path.isfile(path):
        return None, None

    with open(path) as f:
        content = f.read()

    score_match = re.search(r'total_score:\s*(\d+)', content)
    verdict_match = re.search(r'verdict:\s*"?([^"\n]+)"?', content)
    score = int(score_match.group(1)) if score_match else None
    verdict = verdict_match.group(1).strip() if verdict_match else None
    return score, verdict


def run_git(args, cwd, env=None, dry_run=False, capture=True,
            allow_failure=False):
    """Run a git command, respecting dry-run mode."""
    cmd = ['git'] + args
    if dry_run:
        print(f'[DRY RUN] {" ".join(cmd)}', file=sys.stderr)
        return ''

    result = subprocess.run(
        cmd, cwd=cwd, capture_output=capture, text=True, env=env,
    )
    if result.returncode != 0:
        if allow_failure:
            return None
        print(f'git error: {result.stderr.strip()}', file=sys.stderr)
        sys.exit(1)
    return (result.stdout + result.stderr).strip()


def extract_mr_url(push_output):
    """Parse the MR URL from GitLab's push response."""
    for line in push_output.splitlines():
        match = re.search(r'(https?://\S+merge_requests/\d+)', line)
        if match:
            return match.group(1)
    return None


def read_metadata(rfe_key):
    """Read prototype metadata JSON, if it exists."""
    path = f'.artifacts/{rfe_key}/metadata.json'
    if not os.path.isfile(path):
        return {}
    with open(path) as f:
        return json.load(f)


def read_decisions(rfe_key):
    """Read decisions JSON and return the decisions list."""
    path = f'.artifacts/{rfe_key}/decisions/decisions.json'
    if not os.path.isfile(path):
        return []
    with open(path) as f:
        data = json.load(f)
    return data.get('decisions', [])


def read_rfe_summary(rfe_key):
    """Read the RFE snapshot and extract the first paragraph of description."""
    path = f'.artifacts/{rfe_key}/rfe-snapshot.md'
    if not os.path.isfile(path):
        return None
    with open(path) as f:
        content = f.read()
    # Skip frontmatter
    if content.startswith('---'):
        end = content.find('---', 3)
        if end != -1:
            content = content[end + 3:].strip()
    # Skip the H1 title line
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('# '):
            lines = lines[i + 1:]
            break
    # Find the first non-empty paragraph
    paragraph = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('#'):
            break
        if stripped:
            paragraph.append(stripped)
        elif paragraph:
            break
    return ' '.join(paragraph) if paragraph else None


def build_mr_description(rfe_key, title, score, verdict, changeset_files):
    """Build a rich MR description with design context.

    Generates a designer-oriented description that summarizes the prototype,
    key decisions, review status, and how to try it locally.
    """
    metadata = read_metadata(rfe_key)
    decisions = read_decisions(rfe_key)
    rfe_summary = read_rfe_summary(rfe_key)

    mode = metadata.get('mode', 'unknown')
    mode_label = 'human-in-the-loop' if mode == 'decide' else 'auto (AI-resolved)'

    sections = []

    # Header
    sections.append(
        f'Prototype generated by '
        f'[prototype-creator](https://github.com/prototype-creator) pipeline.'
    )
    sections.append('')

    # What this is
    sections.append('## What this adds')
    sections.append('')
    if rfe_summary:
        sections.append(rfe_summary)
        sections.append('')

    # Files summary (grouped, not raw paths)
    created = [f for f in changeset_files if '/' in f and not f.endswith('.tsx')]
    tsx_files = [f for f in changeset_files if f.endswith('.tsx')]
    route_files = [f for f in changeset_files if 'route' in f.lower()]

    if tsx_files or created:
        sections.append(
            f'**{len(changeset_files)} files** changed '
            f'({len([f for f in changeset_files if f not in route_files])} new, '
            f'{len(route_files)} modified).'
        )
        sections.append('')

    # Pipeline info
    sections.append('## Pipeline details')
    sections.append('')
    sections.append(f'| | |')
    sections.append(f'|---|---|')
    sections.append(f'| **Mode** | {mode_label} |')
    if score is not None:
        status_emoji = 'pass' if verdict and 'pass' in verdict else 'needs attention'
        sections.append(f'| **Rubric score** | {score}/6 ({status_emoji}) |')
    human_review = mode == 'decide'
    sections.append(
        f'| **Human review** | '
        f'{"Yes — design decisions were reviewed by a human" if human_review else "Not yet — all decisions were auto-resolved by AI"}'
        f' |'
    )
    sections.append('')

    # Key decisions
    if decisions:
        sections.append('## Key design decisions')
        sections.append('')
        for d in decisions:
            status = d.get('status', '')
            chosen = d.get('chosenTitle', d.get('summary', ''))
            tag = 'auto' if 'auto' in status else 'human'
            summary = d.get('summary', '')
            sections.append(
                f'- **{d.get("title", "Decision")}**: {chosen} '
                f'({tag}){" — " + summary if summary and summary != chosen else ""}'
            )
        sections.append('')

    # How to review
    sections.append('## How to review')
    sections.append('')
    sections.append('```bash')
    sections.append(f'# Pull down this branch and run locally')
    sections.append(f'git checkout prototype/{rfe_key}')
    sections.append(f'npm install')
    sections.append(f'npm run start:dev')
    sections.append('```')
    sections.append('')
    sections.append(
        'Then navigate to the new pages in the Settings section to see the '
        'prototype in action.'
    )
    sections.append('')

    # Assumptions / caveats
    assumptions = metadata.get('assumptions', [])
    if assumptions:
        sections.append('## Assumptions')
        sections.append('')
        for a in assumptions:
            sections.append(f'- {a}')
        sections.append('')

    return '\n'.join(sections)


def main():
    rfe_key = None
    title = None
    remote_override = None
    no_ssl_verify = False
    dry_run = False

    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == '--rfe-key' and i + 1 < len(sys.argv):
            rfe_key = sys.argv[i + 1]
            i += 2
        elif arg == '--title' and i + 1 < len(sys.argv):
            title = sys.argv[i + 1]
            i += 2
        elif arg == '--remote' and i + 1 < len(sys.argv):
            remote_override = sys.argv[i + 1]
            i += 2
        elif arg == '--no-ssl-verify':
            no_ssl_verify = True
            i += 1
        elif arg == '--dry-run':
            dry_run = True
            i += 1
        else:
            print(f'Unknown argument: {arg}', file=sys.stderr)
            sys.exit(1)

    if not rfe_key:
        print('Error: --rfe-key is required', file=sys.stderr)
        sys.exit(1)

    analysis = read_workspace_analysis(rfe_key)
    workspace_path = analysis.get('workspace_path')
    target_branch = analysis.get('branch')

    if not workspace_path or not os.path.isdir(workspace_path):
        print(f'Error: workspace path does not exist: {workspace_path}',
              file=sys.stderr)
        sys.exit(1)

    changeset_files = parse_changeset_files(rfe_key)
    if not changeset_files:
        print(f'Error: no files found in changeset for {rfe_key}',
              file=sys.stderr)
        sys.exit(1)

    if not title:
        title = rfe_key

    score, verdict = read_review_score(rfe_key)

    env = os.environ.copy()
    if no_ssl_verify:
        env['GIT_SSL_NO_VERIFY'] = 'true'

    branch_name = f'prototype/{rfe_key}'

    # 1. Check if branch already exists (from a prior run)
    current_branch = ''
    if not dry_run:
        current_branch = run_git(['branch', '--show-current'],
                                 cwd=workspace_path, env=env) or ''

    if current_branch == branch_name:
        print(f'Branch {branch_name} already exists and is checked out, '
              f'reusing existing commit.', file=sys.stderr)
    else:
        result = run_git(['checkout', '-b', branch_name],
                         cwd=workspace_path, env=env,
                         dry_run=dry_run, allow_failure=True)
        if result is None and not dry_run:
            run_git(['checkout', branch_name], cwd=workspace_path, env=env)
            print(f'Branch {branch_name} already existed, checked out.',
                  file=sys.stderr)

    # 2. Stage only the changeset files (skip files that don't exist,
    #    e.g. if the changeset describes modifications with sub-bullets)
    files_to_add = []
    for f in changeset_files:
        full_path = os.path.join(workspace_path, f)
        if os.path.exists(full_path):
            files_to_add.append(f)

    if not files_to_add:
        print('Error: none of the changeset files exist in the workspace',
              file=sys.stderr)
        sys.exit(1)

    # 3. Stage and commit (skip if nothing new to commit)
    run_git(['add'] + files_to_add, cwd=workspace_path, env=env,
            dry_run=dry_run)

    commit_msg = f'Prototype: {rfe_key} - {title}'
    commit_result = run_git(['commit', '-m', commit_msg],
                            cwd=workspace_path, env=env,
                            dry_run=dry_run, allow_failure=True)
    if commit_result is None and not dry_run:
        print('Nothing new to commit, using existing commit.',
              file=sys.stderr)

    # 4. Get the commit hash
    commit_hash = ''
    if not dry_run:
        commit_hash = run_git(['rev-parse', '--short', 'HEAD'],
                              cwd=workspace_path, env=env)

    # 5. Unshallow if needed — GitLab rejects pushes from shallow clones
    if not dry_run:
        shallow_file = os.path.join(workspace_path, '.git', 'shallow')
        if os.path.isfile(shallow_file):
            print('Shallow clone detected, unshallowing before push...',
                  file=sys.stderr)
            run_git(['fetch', '--unshallow'], cwd=workspace_path, env=env)

    # 6. Set up remote if overridden
    push_remote = 'origin'
    if remote_override:
        existing_remotes = run_git(['remote'], cwd=workspace_path, env=env,
                                   dry_run=dry_run)
        if not dry_run and 'submit-target' in existing_remotes:
            run_git(['remote', 'remove', 'submit-target'],
                    cwd=workspace_path, env=env)
        run_git(['remote', 'add', 'submit-target', remote_override],
                cwd=workspace_path, env=env, dry_run=dry_run)
        push_remote = 'submit-target'

    # 7. Build MR description
    mr_description = build_mr_description(
        rfe_key, title, score, verdict, changeset_files,
    )

    # 8. Push with GitLab MR push options
    push_args = ['push', '-u', push_remote, branch_name]
    if target_branch:
        push_args += ['-o', 'merge_request.create',
                      '-o', f'merge_request.target={target_branch}',
                      '-o', f'merge_request.title=prototype: {rfe_key} — {title}',
                      '-o', f'merge_request.description={mr_description}',
                      '-o', 'merge_request.remove_source_branch']
    else:
        push_args += ['-o', 'merge_request.create',
                      '-o', f'merge_request.title=prototype: {rfe_key} — {title}',
                      '-o', f'merge_request.description={mr_description}',
                      '-o', 'merge_request.remove_source_branch']

    push_output = run_git(push_args, cwd=workspace_path, env=env,
                          dry_run=dry_run)

    # 9. Extract MR URL from push output
    mr_url = None
    if not dry_run:
        mr_url = extract_mr_url(push_output)

    # Resolve the actual remote URL for reporting
    actual_remote = remote_override
    if not actual_remote and not dry_run:
        actual_remote = run_git(
            ['remote', 'get-url', push_remote],
            cwd=workspace_path, env=env,
        )
    if not actual_remote:
        actual_remote = analysis.get('clone_url',
                                     analysis.get('workspace_url', ''))

    result = {
        'status': 'dry-run' if dry_run else 'pushed',
        'branch': branch_name,
        'target_branch': target_branch,
        'remote': actual_remote,
        'merge_request_url': mr_url,
        'commit': commit_hash or None,
        'files_committed': len(files_to_add),
    }

    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
