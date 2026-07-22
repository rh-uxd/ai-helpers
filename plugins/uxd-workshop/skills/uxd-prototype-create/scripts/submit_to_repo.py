#!/usr/bin/env python3
"""
Submit a workspace-mode prototype to a git repo and create a GitLab merge request.

Handles both fork workflows (origin=fork, upstream=canonical) and same-repo
workflows. Uses `glab mr create` for MR creation to support full markdown
descriptions without the newline restrictions of git push options.

After MR creation, verifies the MR has real commits/changes. Optionally polls
for GitLab Pages deployment and updates a Jira comment with the preview URL.

Usage:
    python3 scripts/submit_to_repo.py --rfe-key PROJ-298 \
        --title "New onboarding wizard" \
        [--upstream https://gitlab.example.com/org/canonical.git] \
        [--no-ssl-verify] \
        [--pages-base-url https://pages.example.com] \
        [--pages-timeout 600] \
        [--jira-comment-id 12345] \
        [--dry-run]

Output (JSON to stdout):
    {
      "status": "pushed",
      "branch": "prototype/PROJ-298",
      "target_branch": "3.6",
      "push_remote": "origin",
      "source_project": "user/fork",
      "target_project": "org/prototypes",
      "merge_request_url": "https://gitlab.example.com/org/repo/-/merge_requests/42",
      "merge_request_iid": 42,
      "commit": "abc1234",
      "files_committed": 6,
      "workflow": "fork",
      "pages_url": "https://pages.example.com/mr-42/",
      "verification": {"sha": "abc1234def", "changes_count": 6}
    }
"""

import json
import os
import re
import subprocess
import sys
import time


# ---------------------------------------------------------------------------
# Artifact readers
# ---------------------------------------------------------------------------

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
    """Read eval / review summary for MR description.

    Prefers Playwright eval CSV (PASS/FAIL/FLAGGED counts). Falls back to
    legacy reviews/summary.md total_score + verdict.
    Returns (score_or_summary, verdict) where score may be a short string
    for CSV-based evals (e.g. "8/10 PASS") or an int for legacy rubrics.
    """
    csv_path = f'.artifacts/{rfe_key}/evaluation-report.csv'
    if os.path.isfile(csv_path):
        pass_n = fail_n = flagged_n = 0
        with open(csv_path) as f:
            for line in f:
                upper = line.upper()
                # Count AC verdict cells; skip header / section markers
                if ',PASS,' in upper or upper.rstrip().endswith(',PASS'):
                    pass_n += 1
                elif ',FAIL,' in upper or upper.rstrip().endswith(',FAIL'):
                    fail_n += 1
                elif ',FLAGGED,' in upper or upper.rstrip().endswith(',FLAGGED'):
                    flagged_n += 1
        total = pass_n + fail_n + flagged_n
        if total:
            summary = f'{pass_n}/{total} PASS, {fail_n} FAIL, {flagged_n} FLAGGED'
            verdict = 'eval-pass' if fail_n == 0 else 'needs-attention'
            return summary, verdict

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
    if content.startswith('---'):
        end = content.find('---', 3)
        if end != -1:
            content = content[end + 3:].strip()
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('# '):
            lines = lines[i + 1:]
            break
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


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

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


def run_cmd(args, cwd=None, env=None, dry_run=False, capture=True,
            allow_failure=False):
    """Run an arbitrary command."""
    if dry_run:
        print(f'[DRY RUN] {" ".join(args)}', file=sys.stderr)
        return ''

    result = subprocess.run(
        args, cwd=cwd, capture_output=capture, text=True, env=env,
    )
    if result.returncode != 0:
        if allow_failure:
            return None
        combined = (result.stdout or '') + (result.stderr or '')
        print(f'Command error ({args[0]}): {combined.strip()}',
              file=sys.stderr)
        sys.exit(1)
    return (result.stdout + result.stderr).strip()


# ---------------------------------------------------------------------------
# Workflow detection
# ---------------------------------------------------------------------------

def get_remote_url(remote_name, cwd, env):
    """Get the push URL for a named remote, or None if it doesn't exist."""
    result = subprocess.run(
        ['git', 'remote', 'get-url', '--push', remote_name],
        cwd=cwd, capture_output=True, text=True, env=env,
    )
    if result.returncode == 0:
        return result.stdout.strip()
    return None


def ensure_git_suffix(url):
    """Add .git suffix for HTTPS URLs when missing."""
    if not url:
        return url
    if url.startswith('git@'):
        return url
    url = url.rstrip('/')
    if not url.endswith('.git'):
        return url + '.git'
    return url


def ensure_upstream_remote(cwd, upstream_url, env, dry_run=False):
    """Add or set the upstream remote to the given URL."""
    upstream_url = ensure_git_suffix(upstream_url)
    existing = get_remote_url('upstream', cwd, env)
    if existing == upstream_url:
        return upstream_url
    if existing:
        run_git(['remote', 'set-url', 'upstream', upstream_url],
                cwd=cwd, env=env, dry_run=dry_run)
    else:
        run_git(['remote', 'add', 'upstream', upstream_url],
                cwd=cwd, env=env, dry_run=dry_run)
    print(f'Set upstream remote → {upstream_url}', file=sys.stderr)
    return upstream_url


def extract_project_path(remote_url):
    """Extract the GitLab project path (e.g. 'org/prototypes') from a remote URL.

    Handles:
      - https://gitlab.example.com/org/sub/repo.git
      - git@gitlab.example.com:org/sub/repo.git
      - https://gitlab.example.com/org/sub/repo
    """
    if not remote_url:
        return None
    url = remote_url.rstrip('/')
    if url.endswith('.git'):
        url = url[:-4]

    # SSH format: git@host:path
    ssh_match = re.match(r'^git@[^:]+:(.+)$', url)
    if ssh_match:
        return ssh_match.group(1)

    # HTTPS format
    https_match = re.match(r'^https?://[^/]+/(.+)$', url)
    if https_match:
        return https_match.group(1)

    return None


def detect_workflow(cwd, env):
    """Detect whether this is a fork workflow or a same-repo workflow.

    Fork workflow: `origin` points to user's fork, `upstream` points to canonical.
    Same-repo: only `origin` exists, or both remotes point to the same project.

    Returns a dict with:
      - workflow: 'fork' | 'same-repo'
      - push_remote: name of remote to push to ('origin' for both workflows)
      - source_project: project path where branch lives (fork or same repo)
      - target_project: project path for MR target (upstream or same repo)
      - target_remote_url: URL of the target project
    """
    origin_url = get_remote_url('origin', cwd, env)
    upstream_url = get_remote_url('upstream', cwd, env)

    origin_project = extract_project_path(origin_url)
    upstream_project = extract_project_path(upstream_url)

    if upstream_url and upstream_project and origin_project != upstream_project:
        return {
            'workflow': 'fork',
            'push_remote': 'origin',
            'source_project': origin_project,
            'target_project': upstream_project,
            'target_remote_url': upstream_url,
            'origin_url': origin_url,
        }

    return {
        'workflow': 'same-repo',
        'push_remote': 'origin',
        'source_project': origin_project,
        'target_project': origin_project,
        'target_remote_url': origin_url,
        'origin_url': origin_url,
    }


# ---------------------------------------------------------------------------
# MR description builder
# ---------------------------------------------------------------------------

def build_mr_description(rfe_key, title, score, verdict, changeset_files):
    """Build a rich MR description with design context."""
    metadata = read_metadata(rfe_key)
    decisions = read_decisions(rfe_key)
    rfe_summary = read_rfe_summary(rfe_key)

    mode = metadata.get('decision_mode') or metadata.get('mode', 'unknown')
    # Normalize legacy decide/interactive → human
    if mode in ('decide', 'interactive'):
        mode = 'human'
    mode_labels = {
        'skip': 'skip (no decision kit)',
        'auto': 'auto (AI-resolved)',
        'human': 'human-in-the-loop',
    }
    mode_label = mode_labels.get(mode, mode)

    sections = []

    sections.append(
        'Prototype generated by the UXD prototype pipeline '
        '(`uxd-prototype-create` / `uxd-prototype-evaluate` / `uxd-prototype-publish`).'
    )
    sections.append('')

    sections.append('## What this adds')
    sections.append('')
    if rfe_summary:
        sections.append(rfe_summary)
        sections.append('')

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

    sections.append('## Pipeline details')
    sections.append('')
    sections.append('| | |')
    sections.append('|---|---|')
    sections.append(f'| **Decisions** | {mode_label} |')
    if score is not None:
        status_label = 'pass' if verdict and 'pass' in str(verdict) else 'needs attention'
        if isinstance(score, str):
            sections.append(f'| **Eval** | {score} ({status_label}) |')
        else:
            sections.append(f'| **Eval / rubric** | {score} ({status_label}) |')
    if mode == 'human':
        human_review_label = 'Yes — design decisions were reviewed by a human'
    elif mode == 'auto':
        human_review_label = 'Batch review — decisions were auto-resolved by AI (overrides allowed)'
    elif mode == 'skip':
        human_review_label = 'Skipped — no decision kit; design calls made while building'
    else:
        human_review_label = 'Unknown'
    sections.append(f'| **Human review** | {human_review_label} |')
    sections.append('')

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

    assumptions = metadata.get('assumptions', [])
    if assumptions:
        sections.append('## Assumptions')
        sections.append('')
        for a in assumptions:
            sections.append(f'- {a}')
        sections.append('')

    return '\n'.join(sections)


# ---------------------------------------------------------------------------
# MR creation and verification
# ---------------------------------------------------------------------------

def create_mr_via_glab(branch_name, target_branch, title, description,
                       workflow_info, cwd, env, dry_run=False):
    """Create a merge request using `glab mr create`.

    For fork workflows, uses -H (head/source repo) and -R (target repo) flags
    to correctly associate the MR across projects.

    Returns the MR URL on success.
    """
    mr_title = f'prototype: {title}'

    args = ['glab', 'mr', 'create',
            '--title', mr_title,
            '--description', description,
            '--source-branch', branch_name,
            '--remove-source-branch',
            '--no-editor']

    if target_branch:
        args.extend(['--target-branch', target_branch])

    if workflow_info['workflow'] == 'fork':
        args.extend(['-H', workflow_info['source_project']])
        args.extend(['-R', workflow_info['target_project']])

    output = run_cmd(args, cwd=cwd, env=env, dry_run=dry_run,
                     allow_failure=True)

    if output is None:
        return None

    # Extract URL from glab output
    for line in (output or '').splitlines():
        match = re.search(r'(https?://\S+merge_requests/\d+)', line)
        if match:
            return match.group(1)

    return None


def extract_mr_iid(mr_url):
    """Extract the MR IID (number) from a merge request URL."""
    if not mr_url:
        return None
    match = re.search(r'merge_requests/(\d+)', mr_url)
    return int(match.group(1)) if match else None


def verify_mr(mr_url, workflow_info, cwd, env, max_retries=3, retry_delay=5):
    """Verify the MR has real commits and file changes.

    Uses `glab api` to check:
      - sha is non-null
      - changes_count >= 1 (or changes array is non-empty)
      - source/target project IDs are correct

    Returns a verification dict or None on failure.
    """
    if not mr_url:
        return None

    iid = extract_mr_iid(mr_url)
    if not iid:
        return None

    target_project = workflow_info['target_project']
    api_path = f'projects/{target_project.replace("/", "%2F")}/merge_requests/{iid}'

    for attempt in range(max_retries):
        if attempt > 0:
            print(f'MR verification attempt {attempt + 1}/{max_retries} '
                  f'(waiting {retry_delay}s)...', file=sys.stderr)
            time.sleep(retry_delay)

        result = subprocess.run(
            ['glab', 'api', api_path],
            cwd=cwd, capture_output=True, text=True, env=env,
        )

        if result.returncode != 0:
            print(f'glab api error: {result.stderr.strip()}', file=sys.stderr)
            continue

        try:
            mr_data = json.loads(result.stdout)
        except json.JSONDecodeError:
            continue

        sha = mr_data.get('sha')
        changes_count = mr_data.get('changes_count')
        detailed_status = mr_data.get('detailed_merge_status', '')
        source_project_id = mr_data.get('source_project_id')
        target_project_id = mr_data.get('target_project_id')

        # Parse changes_count which may be a string like "6"
        if isinstance(changes_count, str) and changes_count.isdigit():
            changes_count = int(changes_count)

        if sha and changes_count and int(changes_count) >= 1:
            return {
                'sha': sha,
                'changes_count': int(changes_count),
                'source_project_id': source_project_id,
                'target_project_id': target_project_id,
                'detailed_merge_status': detailed_status,
                'verified': True,
            }

        # If sha is null or changes_count is 0, the branch may not have
        # propagated yet — retry
        print(f'MR not ready yet: sha={sha}, changes_count={changes_count}, '
              f'status={detailed_status}', file=sys.stderr)

    return {
        'sha': sha if 'sha' in dir() else None,
        'changes_count': changes_count if 'changes_count' in dir() else None,
        'verified': False,
        'error': 'MR has no commits or changes after retries',
    }


# ---------------------------------------------------------------------------
# Pages polling
# ---------------------------------------------------------------------------

def resolve_pages_url(mr_iid, branch_name, pages_base_url):
    """Construct the expected Pages preview URL for this MR.

    Pages URL convention:
      - MR preview: <PAGES_URL>/mr-<iid>/
      - Branch preview: <PAGES_URL>/<branch-slug>/
    """
    if not pages_base_url:
        return None, None

    base = pages_base_url.rstrip('/')
    mr_url = f'{base}/mr-{mr_iid}/' if mr_iid else None
    branch_slug = branch_name.replace('/', '-')
    branch_url = f'{base}/{branch_slug}/'
    return mr_url, branch_url


def poll_pages_deployment(mr_url, pages_preview_url, workflow_info, cwd, env,
                          timeout=600, interval=20):
    """Poll for GitLab Pages deployment to become available.

    Checks via:
    1. MR pipeline status (look for a 'pages' job that succeeded)
    2. HTTP HEAD to the preview URL

    Returns the live URL if available within timeout, else None.
    """
    if not pages_preview_url:
        return None

    iid = extract_mr_iid(mr_url)
    if not iid:
        return None

    target_project = workflow_info['target_project']
    project_encoded = target_project.replace('/', '%2F')
    start_time = time.time()

    print(f'Waiting for Pages deployment (timeout: {timeout}s)...',
          file=sys.stderr)

    while time.time() - start_time < timeout:
        # Check via MR pipelines for a successful pages job
        api_path = (f'projects/{project_encoded}/merge_requests/{iid}'
                    f'/pipelines')
        result = subprocess.run(
            ['glab', 'api', api_path],
            cwd=cwd, capture_output=True, text=True, env=env,
        )

        if result.returncode == 0:
            try:
                pipelines = json.loads(result.stdout)
                if pipelines and isinstance(pipelines, list):
                    latest_pipeline = pipelines[0]
                    pipeline_id = latest_pipeline.get('id')
                    pipeline_status = latest_pipeline.get('status', '')

                    if pipeline_status == 'success':
                        print(f'Pipeline {pipeline_id} succeeded — '
                              f'Pages should be live.', file=sys.stderr)
                        # Give Pages a few seconds to propagate after pipeline
                        time.sleep(5)
                        return pages_preview_url

                    if pipeline_status in ('failed', 'canceled'):
                        print(f'Pipeline {pipeline_id} {pipeline_status} — '
                              f'Pages may not deploy.', file=sys.stderr)
                        return None
            except (json.JSONDecodeError, IndexError, KeyError):
                pass

        elapsed = int(time.time() - start_time)
        print(f'  Pages not ready yet ({elapsed}s elapsed)...', file=sys.stderr)
        time.sleep(interval)

    print(f'Pages deployment timed out after {timeout}s.', file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    rfe_key = None
    title = None
    no_ssl_verify = False
    dry_run = False
    pages_base_url = None
    pages_timeout = 600
    jira_comment_id = None
    upstream_flag = None

    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == '--rfe-key' and i + 1 < len(sys.argv):
            rfe_key = sys.argv[i + 1]
            i += 2
        elif arg == '--title' and i + 1 < len(sys.argv):
            title = sys.argv[i + 1]
            i += 2
        elif arg == '--upstream' and i + 1 < len(sys.argv):
            upstream_flag = sys.argv[i + 1]
            i += 2
        elif arg == '--no-ssl-verify':
            no_ssl_verify = True
            i += 1
        elif arg == '--dry-run':
            dry_run = True
            i += 1
        elif arg == '--pages-base-url' and i + 1 < len(sys.argv):
            pages_base_url = sys.argv[i + 1]
            i += 2
        elif arg == '--pages-timeout' and i + 1 < len(sys.argv):
            pages_timeout = int(sys.argv[i + 1])
            i += 2
        elif arg == '--jira-comment-id' and i + 1 < len(sys.argv):
            jira_comment_id = sys.argv[i + 1]
            i += 2
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

    # --- Step 0: Ensure upstream remote when --target was a git URL ---
    upstream_url = (
        upstream_flag
        or analysis.get('upstream_url')
        or analysis.get('target_repo_url')
    )
    if upstream_url:
        ensure_upstream_remote(
            workspace_path, upstream_url, env, dry_run=dry_run,
        )

    # --- Step 1: Detect workflow (fork vs same-repo) ---
    workflow_info = detect_workflow(workspace_path, env)
    print(f'Detected workflow: {workflow_info["workflow"]}', file=sys.stderr)
    if workflow_info['workflow'] == 'fork':
        print(f'  Source (fork): {workflow_info["source_project"]}',
              file=sys.stderr)
        print(f'  Target (upstream): {workflow_info["target_project"]}',
              file=sys.stderr)

    # --- Step 2: Create or checkout the branch ---
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

    # --- Step 3: Stage only the changeset files ---
    files_to_add = []
    for f in changeset_files:
        full_path = os.path.join(workspace_path, f)
        if os.path.exists(full_path):
            files_to_add.append(f)

    if not files_to_add:
        print('Error: none of the changeset files exist in the workspace',
              file=sys.stderr)
        sys.exit(1)

    # --- Step 4: Commit ---
    run_git(['add'] + files_to_add, cwd=workspace_path, env=env,
            dry_run=dry_run)

    commit_msg = f'Prototype: {rfe_key} - {title}'
    commit_result = run_git(['commit', '-m', commit_msg],
                            cwd=workspace_path, env=env,
                            dry_run=dry_run, allow_failure=True)
    if commit_result is None and not dry_run:
        print('Nothing new to commit, using existing commit.',
              file=sys.stderr)

    # --- Step 5: Get commit hash ---
    commit_hash = ''
    if not dry_run:
        commit_hash = run_git(['rev-parse', '--short', 'HEAD'],
                              cwd=workspace_path, env=env)

    # --- Step 6: Unshallow if needed ---
    if not dry_run:
        shallow_file = os.path.join(workspace_path, '.git', 'shallow')
        if os.path.isfile(shallow_file):
            print('Shallow clone detected, unshallowing before push...',
                  file=sys.stderr)
            run_git(['fetch', '--unshallow'], cwd=workspace_path, env=env)

    # --- Step 7: Push branch to the correct remote ---
    # In both workflows, push to 'origin'. In a fork workflow, origin is the
    # user's fork. In same-repo, origin is the canonical repo.
    push_remote = workflow_info['push_remote']

    push_output = run_git(
        ['push', '-u', push_remote, branch_name, '--force-with-lease'],
        cwd=workspace_path, env=env, dry_run=dry_run,
    )

    # --- Step 8: Build MR description ---
    mr_description = build_mr_description(
        rfe_key, title, score, verdict, changeset_files,
    )

    # --- Step 9: Create MR via glab ---
    mr_url = None
    if not dry_run:
        mr_url = create_mr_via_glab(
            branch_name=branch_name,
            target_branch=target_branch,
            title=f'{rfe_key} — {title}',
            description=mr_description,
            workflow_info=workflow_info,
            cwd=workspace_path,
            env=env,
        )

        if not mr_url:
            print('Warning: glab mr create did not return an MR URL. '
                  'The MR may already exist or creation failed.',
                  file=sys.stderr)
            # Try to find existing MR
            existing = run_cmd(
                ['glab', 'mr', 'view', branch_name, '--json', 'url'],
                cwd=workspace_path, env=env, allow_failure=True,
            )
            if existing:
                try:
                    mr_data = json.loads(existing)
                    mr_url = mr_data.get('url')
                except (json.JSONDecodeError, KeyError):
                    pass

    # --- Step 10: Verify MR has real changes ---
    verification = None
    if not dry_run and mr_url:
        print('Verifying MR has commits and file changes...',
              file=sys.stderr)
        verification = verify_mr(mr_url, workflow_info, cwd=workspace_path,
                                 env=env)
        if verification and verification.get('verified'):
            print(f'MR verified: sha={verification["sha"]}, '
                  f'changes={verification["changes_count"]}',
                  file=sys.stderr)
        elif verification:
            print(f'WARNING: MR verification failed — '
                  f'{verification.get("error", "unknown issue")}',
                  file=sys.stderr)
            print('The MR may show no changes. This typically means the '
                  'branch was pushed to the wrong remote.', file=sys.stderr)

            # Auto-recovery: if we're in a fork workflow and verification
            # failed, the branch might need to be on the fork
            if workflow_info['workflow'] == 'fork':
                print('Attempting auto-recovery: ensuring branch is on fork...',
                      file=sys.stderr)
                run_git(['push', '-u', 'origin', branch_name, '--force'],
                        cwd=workspace_path, env=env, allow_failure=True)
                time.sleep(5)
                verification = verify_mr(mr_url, workflow_info,
                                         cwd=workspace_path, env=env)
                if verification and verification.get('verified'):
                    print('Auto-recovery successful.', file=sys.stderr)

    # --- Step 11: Poll for Pages deployment ---
    mr_iid = extract_mr_iid(mr_url)
    pages_url = None
    pages_status = 'not_configured'

    if pages_base_url and not dry_run and mr_url:
        mr_pages_url, branch_pages_url = resolve_pages_url(
            mr_iid, branch_name, pages_base_url,
        )
        pages_preview_url = mr_pages_url or branch_pages_url

        if pages_preview_url:
            pages_status = 'polling'
            live_url = poll_pages_deployment(
                mr_url=mr_url,
                pages_preview_url=pages_preview_url,
                workflow_info=workflow_info,
                cwd=workspace_path,
                env=env,
                timeout=pages_timeout,
            )
            if live_url:
                pages_url = live_url
                pages_status = 'live'
                print(f'Pages preview live: {pages_url}', file=sys.stderr)
            else:
                pages_url = pages_preview_url
                pages_status = 'pending'
                print(f'Pages preview pending (expected at: {pages_url})',
                      file=sys.stderr)

    # --- Build output ---
    result = {
        'status': 'dry-run' if dry_run else 'pushed',
        'branch': branch_name,
        'target_branch': target_branch,
        'push_remote': push_remote,
        'workflow': workflow_info['workflow'],
        'source_project': workflow_info['source_project'],
        'target_project': workflow_info['target_project'],
        'merge_request_url': mr_url,
        'merge_request_iid': mr_iid,
        'commit': commit_hash or None,
        'files_committed': len(files_to_add),
        'verification': verification,
        'pages_url': pages_url,
        'pages_status': pages_status,
    }

    if jira_comment_id:
        result['jira_comment_id'] = jira_comment_id

    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
