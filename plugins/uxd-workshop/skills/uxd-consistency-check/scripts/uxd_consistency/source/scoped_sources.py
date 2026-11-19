# AI-generated script by GPT-6 Luna.
# Documentation comments are AI-generated.
"""Read source files and identify citable changed lines.

An MR review must not attribute local edits or a pure rename to the committed
change. Read the selected Git blobs and their diff, recording skipped paths.
Standalone deterministic checks can also review a working copy.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

from uxd_consistency.shared.guideline_io import MATERIAL_LIMIT, read_confined

SOURCE_SUFFIXES = {".html", ".htm", ".jsx", ".tsx", ".js", ".ts", ".css", ".scss"}
EXCLUDED = {"node_modules", "dist", "build", "vendor", "coverage", "tests", "test", "__pycache__"}


def mask_comments(text):
    return re.sub(r"<!--[\s\S]*?-->|/\*[\s\S]*?\*/|(?m:^\s*//[^\n]*)",
                  lambda match: re.sub(r"[^\n]", " ", match.group()), text)


def source_name(path):
    path = Path(path)
    return path.suffix.lower() in SOURCE_SUFFIXES and not any(part in EXCLUDED or part.startswith(".") for part in path.parts)


def git_bytes(workspace, *args):
    result = subprocess.run(["git", "--literal-pathspecs", "-C", str(workspace), *args],
                            capture_output=True, timeout=30)
    if result.returncode:
        raise ValueError("Git scope could not be resolved: " + result.stderr.decode(errors="replace").strip())
    return result.stdout


def git(workspace, *args):
    return git_bytes(workspace, *args).decode("utf-8")


def regular_blob(root, revision, path):
    """Pin regular files, not symlinks, submodules, or directories."""
    for entry in git(root, "ls-tree", "-z", revision, "--", path).split("\0"):
        if not entry:
            continue
        info, name = entry.split("\t", 1)
        mode, kind, oid = info.split()
        if name == path and kind == "blob" and mode in {"100644", "100755"}:
            return oid
    return None


def blob_bytes(root, oid):
    if int(git(root, "cat-file", "-s", oid)) > MATERIAL_LIMIT:
        raise ValueError("source exceeds byte limit")
    return git_bytes(root, "cat-file", "blob", oid)


def base_source(workspace, base, name):
    root = Path(git(workspace, "rev-parse", "--show-toplevel").strip())
    path = (workspace.relative_to(root) / name).as_posix()
    oid = regular_blob(root, base, path)
    return blob_bytes(root, oid).decode("utf-8") if oid else None


DIFF = ("diff", "--no-color", "--no-ext-diff", "--no-textconv")


def added_lines(diff):
    lines = set()
    for match in re.finditer(r"^@@ .*?\+(\d+)(?:,(\d+))? @@", diff, re.MULTILINE):
        start = int(match.group(1))
        count = int(match.group(2) or "1")
        lines.update(range(start, start + count))
    return lines


def committed_sources(root, prefix, base, head, approved_scope):
    """Enumerate the diff before reading any source blobs."""
    from uxd_consistency.review.review_scope import in_code_scope

    scope_path = prefix.as_posix()
    # Git's NUL-delimited name/status output supplies both paths for a rename.
    entries = iter(git(root, *DIFF, "--find-renames", "--name-status", "-z",
                       base, head, "--", scope_path).rstrip("\0").split("\0"))
    files, lines, hashes, skipped, renamed = {}, {}, {}, {}, {}
    for status in filter(None, entries):
        old = next(entries)
        path = next(entries) if status.startswith("R") else old
        if not Path(path).is_relative_to(prefix):
            continue
        name = Path(path).relative_to(prefix).as_posix()
        if approved_scope is not None and not in_code_scope(name, approved_scope):
            continue
        if status == "D":
            skipped[name] = "deleted file; no current source to cite"
            continue
        if not source_name(name):
            skipped[name] = "unsupported source type or excluded path"
            continue
        oid = regular_blob(root, head, path)
        if oid is None:
            skipped[name] = "not a regular file at the reviewed revision"
            continue
        # Restrict the patch to this file or its renamed pair. Force text for
        # supported UTF-8 sources so Git attributes cannot mask actual hunks.
        try:
            data = blob_bytes(root, oid)
            text = data.decode("utf-8")
            if b"\0" in data:
                raise ValueError("binary source")
        except ValueError as error:
            skipped[name] = ("not UTF-8 source" if isinstance(error, UnicodeDecodeError)
                             else str(error))
            continue
        diff = git_bytes(root, *DIFF, "--text", "--find-renames", "--unified=0",
                         base, head, "--", *dict.fromkeys((old, path)))
        delta = added_lines(diff.decode("utf-8", errors="replace"))
        if not delta:
            skipped[name] = "no added or modified lines to cite"
        if old != path and Path(old).is_relative_to(prefix):
            renamed[name] = Path(old).relative_to(prefix).as_posix()
        files[name], lines[name], hashes[name] = text, delta, hashlib.sha256(data).hexdigest()
    return files, lines, hashes, skipped, renamed


def read_sources(workspace, changed=False, base_ref="main", tracked_only=False, merge_base=False, *, approved_scope=None):
    workspace = Path(workspace).resolve()
    files = {}
    identities = {}
    aliases = {}
    raw_hashes = {}
    if approved_scope is not None:
        from uxd_consistency.review.review_scope import code_scope, in_code_scope
        approved_scope = code_scope(approved_scope, workspace)
    head = None
    try:
        head = git(workspace, "rev-parse", "--verify", "HEAD").strip()
    except ValueError:
        if changed:
            raise
    base, lines = None, None
    skipped, renamed = {}, {}
    if changed:
        if not isinstance(base_ref, str) or not base_ref or base_ref.startswith("-"):
            raise ValueError("base ref must be nonempty and cannot start with a dash")
        root = Path(git(workspace, "rev-parse", "--show-toplevel").strip()).resolve()
        prefix = workspace.relative_to(root)
        base = git(root, "rev-parse", "--verify", base_ref + "^{commit}").strip()
    if merge_base:
        base = git(root, "merge-base", base, head).strip()
        files, lines, raw_hashes, skipped, renamed = committed_sources(root, prefix, base, head, approved_scope)
        aliases = {name: name for name in files}
    # Committed scope must not touch dirty/untracked source bytes at all.
    for directory, folders, names in (() if merge_base else os.walk(workspace, followlinks=False)):
        folders[:] = sorted(name for name in folders if name not in EXCLUDED and not name.startswith(".") and not (Path(directory) / name).is_symlink())
        for name in sorted(names):
            path = Path(directory) / name
            relative = path.relative_to(workspace).as_posix()
            if source_name(relative) and not path.is_symlink() and (approved_scope is None or in_code_scope(relative, approved_scope)):
                if not path.is_file():
                    raise ValueError(f"source is not a regular file: {relative}")
                data = read_confined(workspace, path)
                raw_hashes[relative] = hashlib.sha256(data).hexdigest()
                files[relative] = data.decode('utf-8')
                stat = path.stat()
                identity = (stat.st_dev, stat.st_ino)
                aliases[relative] = identities.setdefault(identity, relative)
    if changed and not merge_base:
        if tracked_only:
            tracked = set(git(root, "ls-files", "-z").split("\0"))
            files = {name: text for name, text in files.items() if (prefix / name).as_posix() in tracked}
        names = git(root, *DIFF, "--no-renames", "--name-only", "-z", base, "--", str(prefix)).split("\0")
        lines = {}
        for path in names:
            if not path or not Path(path).is_relative_to(prefix):
                continue
            relative = Path(path).relative_to(prefix).as_posix()
            if relative not in files:
                continue
            diff = git_bytes(root, *DIFF, "--no-renames", "--unified=0", base, "--", path)
            lines[relative] = added_lines(diff.decode("utf-8", errors="replace"))
        if not tracked_only:
            for path in git(root, "ls-files", "--others", "--exclude-standard", "-z", "--", str(prefix)).split("\0"):
                if path and Path(path).is_relative_to(prefix):
                    relative = Path(path).relative_to(prefix).as_posix()
                    if relative in files:
                        lines[relative] = set(range(1, len(files[relative].splitlines()) + 1))
    # The receipt binds exact source bytes; line positions are a separate
    # view so newline normalization cannot hide a different revision.
    fingerprints = {name: raw_hashes[name] for name in sorted(files)}
    identity = hashlib.sha256(json.dumps(fingerprints, sort_keys=True).encode()).hexdigest()
    inputs = {"scope": "committed" if merge_base else "changed" if changed else "workspace",
              "head": head, "base": base, "source_sha256": identity,
              "files": fingerprints, "file_aliases": {name: aliases[name] for name in files},
              "target_files": sorted(name for name, delta in lines.items() if delta) if lines is not None else sorted(files),
              "tracked_only": bool(tracked_only), "merge_base": bool(merge_base),
              "hash_basis": "original_bytes", "approved_scope": approved_scope,
              "changed_lines": ({name: sorted(numbers) for name, numbers in sorted(lines.items())}
                                 if lines is not None else None)}
    if merge_base:
        inputs.update(skipped_files=skipped, renamed_from=renamed)
    return files, lines, inputs
