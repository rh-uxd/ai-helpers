#!/usr/bin/env python3
"""
Resolve a workspace argument into a cloneable git URL + branch, or a validated local path.

Handles branch detection from common git hosting URL patterns (GitLab, GitHub)
and an explicit --branch override flag.

Usage:
    # Resolve and clone
    python3 scripts/resolve_workspace.py <url-or-path> --rfe-key PROJ-298 [--branch 3.5]

    # Resolve only (no clone, just print parsed result)
    python3 scripts/resolve_workspace.py <url-or-path> --resolve-only [--branch 3.5]

Output (JSON to stdout):
    {
      "type": "git",
      "original_url": "https://gitlab.example.com/org/repo/-/tree/3.5",
      "clone_url": "https://gitlab.example.com/org/repo.git",
      "branch": "3.5",
      "branch_source": "url",
      "clone_path": ".artifacts/PROJ-298/workspace",
      "status": "cloned"
    }
"""

import sys
import os
import json
import re
import subprocess


def parse_git_url(url):
    """Parse a git hosting URL to extract branch and clean clone URL.

    Returns (clone_url, branch) where branch may be None.

    Supported patterns:
      - GitLab:  https://gitlab.example.com/org/repo/-/tree/<branch>[?ref_type=...]
      - GitHub:  https://github.com/org/repo/tree/<branch>
      - Fragment: https://gitlab.example.com/org/repo.git#<branch>
      - SSH:     git@gitlab.example.com:org/repo.git (no branch detection)
      - Plain:   https://gitlab.example.com/org/repo.git (no branch detection)
    """
    branch = None

    # Strip query parameters first (e.g., ?ref_type=heads)
    url_no_query = re.sub(r'\?.*$', '', url)

    # Fragment-based branch: repo.git#branch
    if '#' in url_no_query:
        url_part, branch = url_no_query.rsplit('#', 1)
        clone_url = _ensure_git_suffix(url_part)
        return clone_url, branch

    # GitLab pattern: /org/repo/-/tree/<branch>
    gitlab_match = re.match(
        r'^(https?://[^/]+/.+?)/-/tree/(.+)$',
        url_no_query,
    )
    if gitlab_match:
        repo_url = gitlab_match.group(1)
        branch = gitlab_match.group(2)
        clone_url = _ensure_git_suffix(repo_url)
        return clone_url, branch

    # GitHub pattern: /org/repo/tree/<branch>
    github_match = re.match(
        r'^(https?://[^/]+/[^/]+/[^/]+)/tree/(.+)$',
        url_no_query,
    )
    if github_match:
        repo_url = github_match.group(1)
        branch = github_match.group(2)
        clone_url = _ensure_git_suffix(repo_url)
        return clone_url, branch

    # Plain URL or SSH — no branch embedded
    clone_url = _ensure_git_suffix(url_no_query)
    return clone_url, None


def _ensure_git_suffix(url):
    """Add .git suffix if not already present (for HTTPS URLs only)."""
    if url.startswith('git@'):
        return url
    if not url.endswith('.git'):
        return url + '.git'
    return url


def resolve_branch(url_branch, flag_branch):
    """Resolve final branch from URL-detected and flag-specified values.

    Returns (branch, source) where source is 'flag', 'url', or None.
    """
    if flag_branch:
        return flag_branch, 'flag'
    if url_branch:
        return url_branch, 'url'
    return None, None


def is_git_url(workspace):
    """Determine if a workspace argument is a git URL vs. a local path."""
    if workspace.startswith(('https://', 'http://', 'git@', 'ssh://')):
        return True
    if workspace.endswith('.git'):
        return True
    return False


def resolve_workspace(workspace, rfe_key=None, branch_flag=None):
    """Resolve a workspace argument to structured metadata.

    Returns a dict with type, URLs, branch info, and clone path.
    """
    if not is_git_url(workspace):
        result = {
            'type': 'local',
            'path': os.path.abspath(workspace),
            'exists': os.path.isdir(workspace),
        }
        if branch_flag:
            result['warning'] = '--branch is ignored for local paths'
        return result

    clone_url, url_branch = parse_git_url(workspace)
    branch, branch_source = resolve_branch(url_branch, branch_flag)

    result = {
        'type': 'git',
        'original_url': workspace,
        'clone_url': clone_url,
        'branch': branch,
        'branch_source': branch_source,
    }

    if branch_source == 'flag' and url_branch and url_branch != branch_flag:
        result['override_note'] = (
            f'--branch={branch_flag} overrides branch {url_branch} from URL'
        )

    if rfe_key:
        result['clone_path'] = f'.artifacts/{rfe_key}/workspace'

    return result


def clone_repo(resolved, no_ssl_verify=False):
    """Execute git clone based on resolved workspace metadata."""
    clone_path = resolved['clone_path']
    os.makedirs(os.path.dirname(clone_path), exist_ok=True)

    cmd = ['git', 'clone', '--depth', '1']
    if resolved['branch']:
        cmd.extend(['--branch', resolved['branch']])
    cmd.extend([resolved['clone_url'], clone_path])

    env = os.environ.copy()
    if no_ssl_verify:
        env['GIT_SSL_NO_VERIFY'] = 'true'

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True, env=env)
        resolved['status'] = 'cloned'
    except subprocess.CalledProcessError as e:
        if 'SSL certificate problem' in e.stderr and not no_ssl_verify:
            print('SSL error detected, retrying with GIT_SSL_NO_VERIFY=true...',
                  file=sys.stderr)
            env['GIT_SSL_NO_VERIFY'] = 'true'
            try:
                subprocess.run(cmd, check=True, capture_output=True, text=True,
                               env=env)
                resolved['status'] = 'cloned'
                resolved['ssl_verify_skipped'] = True
            except subprocess.CalledProcessError as e2:
                resolved['status'] = 'error'
                resolved['error'] = e2.stderr.strip()
                print(f'Error cloning: {e2.stderr.strip()}', file=sys.stderr)
                sys.exit(1)
        else:
            resolved['status'] = 'error'
            resolved['error'] = e.stderr.strip()
            print(f'Error cloning: {e.stderr.strip()}', file=sys.stderr)
            sys.exit(1)

    return resolved


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    workspace = sys.argv[1]
    rfe_key = None
    branch_flag = None
    resolve_only = False
    no_ssl_verify = False

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--rfe-key' and i + 1 < len(sys.argv):
            rfe_key = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--branch' and i + 1 < len(sys.argv):
            branch_flag = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--resolve-only':
            resolve_only = True
            i += 1
        elif sys.argv[i] == '--no-ssl-verify':
            no_ssl_verify = True
            i += 1
        else:
            print(f'Unknown argument: {sys.argv[i]}', file=sys.stderr)
            sys.exit(1)

    resolved = resolve_workspace(workspace, rfe_key, branch_flag)

    if resolved['type'] == 'local':
        if not resolved['exists']:
            print(f'Error: workspace path does not exist: {resolved["path"]}',
                  file=sys.stderr)
            sys.exit(1)
        resolved['status'] = 'exists'
        print(json.dumps(resolved, indent=2))
        return

    if resolve_only:
        resolved['status'] = 'resolved'
        print(json.dumps(resolved, indent=2))
        return

    if not rfe_key:
        print('Error: --rfe-key is required for git cloning', file=sys.stderr)
        sys.exit(1)

    clone_repo(resolved, no_ssl_verify=no_ssl_verify)
    print(json.dumps(resolved, indent=2))


if __name__ == '__main__':
    main()
