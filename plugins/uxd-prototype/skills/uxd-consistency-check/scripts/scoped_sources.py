# AI-generated script by GPT-6 Luna.
"""Read source snapshots and exact Git delta lines without modifying a checkout."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

SOURCE_SUFFIXES = {".html", ".htm", ".jsx", ".tsx", ".js", ".ts", ".css", ".scss"}
EXCLUDED = {"node_modules", "dist", "build", "vendor", "coverage", "tests", "test", "__pycache__"}


def mask_comments(text):
    return re.sub(r"<!--[\s\S]*?-->|/\*[\s\S]*?\*/|(?m:^\s*//[^\n]*)",
                  lambda match: re.sub(r"[^\n]", " ", match.group()), text)


def source_name(path):
    path = Path(path)
    return path.suffix.lower() in SOURCE_SUFFIXES and not any(part in EXCLUDED or part.startswith(".") for part in path.parts)


def git(workspace, *args):
    result = subprocess.run(["git", "-C", str(workspace), *args], capture_output=True, timeout=30)
    if result.returncode:
        raise ValueError("Git scope could not be resolved: " + result.stderr.decode(errors="replace").strip())
    return result.stdout.decode("utf-8", errors="replace")


def read_sources(workspace, changed=False, base_ref="main", tracked_only=False, merge_base=False, *, approved_scope=None):
    workspace = Path(workspace).resolve()
    files = {}
    identities = {}
    aliases = {}
    raw_hashes = {}
    if approved_scope is not None:
        from review_scope import code_scope, in_code_scope
        approved_scope = code_scope(approved_scope, workspace)
    # Committed scope must not touch dirty/untracked source bytes at all.
    for directory, folders, names in (() if merge_base else os.walk(workspace, followlinks=False)):
        folders[:] = sorted(name for name in folders if name not in EXCLUDED and not name.startswith(".") and not (Path(directory) / name).is_symlink())
        for name in sorted(names):
            path = Path(directory) / name
            relative = path.relative_to(workspace).as_posix()
            if source_name(relative) and not path.is_symlink() and (approved_scope is None or in_code_scope(relative, approved_scope)):
                if not path.is_file():
                    raise ValueError(f"source is not a regular file: {relative}")
                from guideline_io import read_confined
                data = read_confined(workspace, path)
                raw_hashes[relative] = hashlib.sha256(data).hexdigest()
                files[relative] = data.decode('utf-8')
                stat = path.stat()
                identity = (stat.st_dev, stat.st_ino)
                aliases[relative] = identities.setdefault(identity, relative)
    head = None
    try:
        head = git(workspace, "rev-parse", "--verify", "HEAD").strip()
    except ValueError:
        if changed:
            raise
    lines = None
    base = None
    if changed:
        if head is None:
            raise ValueError("changed scope requires a committed Git HEAD")
        if base_ref.startswith("-"):
            raise ValueError("base ref cannot start with a dash")
        root = Path(git(workspace, "rev-parse", "--show-toplevel").strip()).resolve()
        prefix = workspace.relative_to(root)
        base = git(root, "rev-parse", "--verify", base_ref + "^{commit}").strip()
        if merge_base:
            base = git(root, "merge-base", base, head).strip()
            files = {}
            aliases = {}
            for entry in git(root, "ls-tree", "-rz", head).split("\0"):
                if not entry:
                    continue
                info, path = entry.split("\t", 1)
                if not Path(path).is_relative_to(prefix) or info.split()[0] not in {"100644", "100755"}:
                    continue
                relative = Path(path).relative_to(prefix).as_posix()
                if source_name(relative) and (approved_scope is None or in_code_scope(relative, approved_scope)):
                    data = subprocess.check_output(['git', '-C', str(root), 'show', head + ':' + path])
                    files[relative] = data.decode('utf-8')
                    raw_hashes[relative] = hashlib.sha256(data).hexdigest()
                    aliases[relative] = relative
        elif tracked_only:
            tracked = set(git(root, "ls-files", "-z").split("\0"))
            files = {name: text for name, text in files.items() if (prefix / name).as_posix() in tracked}
        revision = [base, head] if merge_base else [base]
        names = git(root, "diff", "--no-color", "--no-ext-diff", "--no-textconv", "--no-renames", "--name-only", "-z", *revision, "--", str(prefix)).split("\0")
        lines = {}
        for path in names:
            if not path or not Path(path).is_relative_to(prefix):
                continue
            relative = Path(path).relative_to(prefix).as_posix()
            if relative not in files:
                continue
            diff = git(root, "diff", "--no-color", "--no-ext-diff", "--no-textconv", "--no-renames", "--unified=0", *revision, "--", path)
            lines[relative] = set()
            for match in re.finditer(r"^@@ .*?\+(\d+)(?:,(\d+))? @@", diff, re.MULTILINE):
                start = int(match.group(1))
                count = int(match.group(2) or "1")
                lines[relative].update(range(start, start + count))
        if not tracked_only and not merge_base:
            for path in git(root, "ls-files", "--others", "--exclude-standard", "-z", "--", str(prefix)).split("\0"):
                if path and Path(path).is_relative_to(prefix):
                    relative = Path(path).relative_to(prefix).as_posix()
                    if relative in files:
                        lines[relative] = set(range(1, len(files[relative].splitlines()) + 1))
    fingerprints = {name: raw_hashes[name] for name in sorted(files)}
    identity = hashlib.sha256(json.dumps(fingerprints, sort_keys=True).encode()).hexdigest()
    inputs = {"scope": "committed" if merge_base else "changed" if changed else "workspace",
              "head": head, "base": base, "source_sha256": identity,
              "files": fingerprints, "file_aliases": {name: aliases[name] for name in files},
              "target_files": sorted(lines) if lines is not None else sorted(files),
              "tracked_only": bool(tracked_only), "merge_base": bool(merge_base),
              "hash_basis": "original_bytes", "approved_scope": approved_scope,
              "changed_lines": ({name: sorted(numbers) for name, numbers in sorted(lines.items())}
                                if lines is not None else None)}
    return files, lines, inputs
