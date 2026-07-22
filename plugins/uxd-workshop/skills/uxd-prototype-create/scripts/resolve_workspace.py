#!/usr/bin/env python3
"""
Resolve a workspace argument into a cloneable git URL + branch, or a validated local path.

Handles branch detection from common git hosting URL patterns (GitLab, GitHub)
and an explicit --branch override flag. Optional --upstream sets an upstream
remote after clone (MR/PR base when --target is a git URL). On clone auth/access
failure, retries once with the HTTPS↔SSH alternate URL.

Usage:
    # Resolve and clone
    python3 scripts/resolve_workspace.py <url-or-path> --rfe-key PROJ-298 \
        [--branch 3.5] [--upstream https://gitlab.example.com/org/canonical.git]

    # Resolve only (no clone, just print parsed result)
    python3 scripts/resolve_workspace.py <url-or-path> --resolve-only [--branch 3.5]

Output (JSON to stdout):
    {
      "type": "git",
      "original_url": "https://gitlab.example.com/org/repo/-/tree/3.5",
      "clone_url": "https://gitlab.example.com/org/repo.git",
      "branch": "3.5",
      "branch_source": "url",
      "clone_path": ".artifacts/PROJ-298/code",
      "upstream_url": "https://gitlab.example.com/org/canonical.git",
      "status": "cloned"
    }
"""

import sys
import os
import json
import re
import shutil
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


def is_git_url(workspace):
    """Determine if a workspace argument is a git URL vs. a local path."""
    if workspace.startswith(('https://', 'http://', 'git@', 'ssh://')):
        return True
    if workspace.endswith('.git'):
        return True
    return False


def normalize_upstream_url(upstream):
    """Normalize an upstream/MR-base URL to a clean clone URL."""
    if not upstream:
        return None
    if not is_git_url(upstream):
        print(f'Error: --upstream must be a git URL, got: {upstream}',
              file=sys.stderr)
        sys.exit(1)
    clone_url, _ = parse_git_url(upstream)
    return clone_url


def resolve_branch(url_branch, flag_branch):
    """Resolve final branch from URL-detected and flag-specified values.

    Returns (branch, source) where source is 'flag', 'url', or None.
    """
    if flag_branch:
        return flag_branch, 'flag'
    if url_branch:
        return url_branch, 'url'
    return None, None


def resolve_workspace(workspace, rfe_key=None, branch_flag=None,
                      upstream_url=None):
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
        if upstream_url:
            result['upstream_url'] = upstream_url
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

    if upstream_url:
        result['upstream_url'] = upstream_url

    if branch_source == 'flag' and url_branch and url_branch != branch_flag:
        result['override_note'] = (
            f'--branch={branch_flag} overrides branch {url_branch} from URL'
        )

    if rfe_key:
        result['clone_path'] = f'.artifacts/{rfe_key}/code'

    return result


def alternate_git_url(url):
    """Convert between HTTPS and SSH git clone URLs.

    https://host/org/repo.git  ↔  git@host:org/repo.git
    ssh://git@host/org/repo.git → https://host/org/repo.git
    Returns None when no alternate form is available.
    """
    if not url:
        return None

    # git@host:path(.git)
    ssh_match = re.match(r'^git@([^:]+):(.+)$', url)
    if ssh_match:
        host, path = ssh_match.group(1), ssh_match.group(2)
        if not path.endswith('.git'):
            path += '.git'
        return f'https://{host}/{path}'

    # ssh://git@host/path(.git) or ssh://host/path
    ssh_uri = re.match(r'^ssh://(?:git@)?([^/]+)/(.+)$', url)
    if ssh_uri:
        host, path = ssh_uri.group(1), ssh_uri.group(2)
        if not path.endswith('.git'):
            path += '.git'
        return f'https://{host}/{path}'

    # https://host/org/repo(.git)
    https_match = re.match(r'^https?://([^/]+)/(.+?)(?:\.git)?/?$', url)
    if https_match:
        host, path = https_match.group(1), https_match.group(2)
        # Drop trailing slash noise; keep nested group paths
        path = path.rstrip('/')
        if path.endswith('.git'):
            path = path[:-4]
        return f'git@{host}:{path}.git'

    return None


def is_auth_error(stderr):
    """Detect clone failures that may succeed with the other protocol."""
    if not stderr:
        return False
    text = stderr.lower()
    markers = (
        'authentication failed',
        'could not read username',
        'permission denied (publickey)',
        'permission denied',
        'unable to update url base from redirection',
        '/users/sign_in',
        'access denied',
        'fatal: could not read from remote repository',
        'the requested url returned error: 401',
        'the requested url returned error: 403',
        'http basic: access denied',
        'repository not found',  # often auth-masked 404 on GitHub/GitLab
    )
    return any(m in text for m in markers)


def is_ssl_error(stderr):
    return bool(stderr) and 'ssl certificate problem' in stderr.lower()


def _cleanup_clone_path(clone_path):
    """Remove a partial clone directory so a retry can reuse the path."""
    if os.path.isdir(clone_path):
        shutil.rmtree(clone_path, ignore_errors=True)


def _run_clone(clone_url, clone_path, branch, env):
    """Run a single git clone attempt. Raises CalledProcessError on failure."""
    _cleanup_clone_path(clone_path)
    cmd = ['git', 'clone', '--depth', '1']
    if branch:
        cmd.extend(['--branch', branch])
    cmd.extend([clone_url, clone_path])
    return subprocess.run(cmd, check=True, capture_output=True, text=True, env=env)


def set_upstream_remote(clone_path, upstream_url, no_ssl_verify=False):
    """Add or update the upstream remote on a cloned workspace."""
    env = os.environ.copy()
    if no_ssl_verify:
        env['GIT_SSL_NO_VERIFY'] = 'true'

    check = subprocess.run(
        ['git', 'remote', 'get-url', 'upstream'],
        cwd=clone_path, capture_output=True, text=True, env=env,
    )
    if check.returncode == 0:
        subprocess.run(
            ['git', 'remote', 'set-url', 'upstream', upstream_url],
            cwd=clone_path, check=True, capture_output=True, text=True,
            env=env,
        )
    else:
        subprocess.run(
            ['git', 'remote', 'add', 'upstream', upstream_url],
            cwd=clone_path, check=True, capture_output=True, text=True,
            env=env,
        )


def clone_repo(resolved, no_ssl_verify=False):
    """Execute git clone based on resolved workspace metadata.

    Retries:
      1. SSL failure → retry same URL with GIT_SSL_NO_VERIFY=true
      2. Auth / redirect failure → retry with HTTPS↔SSH alternate URL
    """
    clone_path = resolved['clone_path']
    os.makedirs(os.path.dirname(clone_path), exist_ok=True)

    env = os.environ.copy()
    if no_ssl_verify:
        env['GIT_SSL_NO_VERIFY'] = 'true'

    clone_url = resolved['clone_url']
    branch = resolved.get('branch')
    last_error = None

    try:
        _run_clone(clone_url, clone_path, branch, env)
        resolved['status'] = 'cloned'
    except subprocess.CalledProcessError as e:
        last_error = e.stderr.strip() if e.stderr else str(e)

        # Retry 1: SSL verify skip (HTTPS only)
        if is_ssl_error(e.stderr) and not no_ssl_verify:
            print('SSL error detected, retrying with GIT_SSL_NO_VERIFY=true...',
                  file=sys.stderr)
            env = env.copy()
            env['GIT_SSL_NO_VERIFY'] = 'true'
            try:
                _run_clone(clone_url, clone_path, branch, env)
                resolved['status'] = 'cloned'
                resolved['ssl_verify_skipped'] = True
                last_error = None
            except subprocess.CalledProcessError as e2:
                last_error = e2.stderr.strip() if e2.stderr else str(e2)
                e = e2

        # Retry 2: switch HTTPS ↔ SSH on auth-ish failures
        if resolved.get('status') != 'cloned' and is_auth_error(
                e.stderr if isinstance(e, subprocess.CalledProcessError)
                else last_error):
            alt = alternate_git_url(clone_url)
            if alt and alt != clone_url:
                print(
                    f'Auth/access error with {clone_url}; '
                    f'retrying with {alt}...',
                    file=sys.stderr,
                )
                # SSH does not use HTTPS SSL flags; keep env as-is otherwise
                try:
                    _run_clone(alt, clone_path, branch, env)
                    resolved['status'] = 'cloned'
                    resolved['clone_url'] = alt
                    resolved['clone_url_original'] = clone_url
                    resolved['clone_protocol_fallback'] = True
                    last_error = None
                except subprocess.CalledProcessError as e3:
                    last_error = e3.stderr.strip() if e3.stderr else str(e3)

        if resolved.get('status') != 'cloned':
            resolved['status'] = 'error'
            resolved['error'] = last_error
            print(f'Error cloning: {last_error}', file=sys.stderr)
            sys.exit(1)

    upstream_url = resolved.get('upstream_url')
    if upstream_url:
        # Prefer matching protocol when clone fell back (keeps remotes consistent)
        if resolved.get('clone_protocol_fallback'):
            alt_upstream = alternate_git_url(upstream_url)
            if alt_upstream:
                upstream_url = alt_upstream
                resolved['upstream_url'] = upstream_url
        try:
            set_upstream_remote(
                clone_path, upstream_url,
                no_ssl_verify=no_ssl_verify or resolved.get(
                    'ssl_verify_skipped', False),
            )
            resolved['upstream_remote'] = 'set'
        except subprocess.CalledProcessError as e:
            err = (e.stderr or str(e)).strip()
            print(f'Warning: failed to set upstream remote: {err}',
                  file=sys.stderr)
            resolved['upstream_remote'] = 'error'
            resolved['upstream_error'] = err

    return resolved


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    workspace = sys.argv[1]
    rfe_key = None
    branch_flag = None
    upstream_flag = None
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
        elif sys.argv[i] == '--upstream' and i + 1 < len(sys.argv):
            upstream_flag = sys.argv[i + 1]
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

    upstream_url = normalize_upstream_url(upstream_flag)
    resolved = resolve_workspace(
        workspace, rfe_key, branch_flag, upstream_url=upstream_url,
    )

    if resolved['type'] == 'local':
        if not resolved['exists']:
            print(f'Error: workspace path does not exist: {resolved["path"]}',
                  file=sys.stderr)
            sys.exit(1)
        if upstream_url:
            try:
                set_upstream_remote(
                    resolved['path'], upstream_url,
                    no_ssl_verify=no_ssl_verify,
                )
                resolved['upstream_remote'] = 'set'
            except subprocess.CalledProcessError as e:
                err = (e.stderr or str(e)).strip()
                print(f'Warning: failed to set upstream remote: {err}',
                      file=sys.stderr)
                resolved['upstream_remote'] = 'error'
                resolved['upstream_error'] = err
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
