# AI-generated script by GPT-6 Luna.
"""Local artifact safety and atomic JSON publication; no external side effects."""
import json
import os
from pathlib import Path
import tempfile


def local_path(value, root):
    path = Path(value).expanduser()
    path = path if path.is_absolute() else Path(root) / path
    # Ancestors are checked too: a symlink higher in the tree can redirect the entire subtree outside the workspace.
    if ".." in path.parts or any(part.is_symlink() for part in [path, *path.parents]):
        raise ValueError("path traversal and symlinks are not allowed")
    return path.resolve()


def output_path(value, workspace):
    path = local_path(value, workspace)
    if not path.is_relative_to(Path(workspace).resolve() / ".artifacts") or path.suffix != ".json":
        raise ValueError("JSON output must be inside the workspace .artifacts area")
    return path


def protect_inputs(destination, sources):
    for source in sources:
        path = Path(source)
        if destination == path or (destination.exists() and path.is_file() and destination.samefile(path)):
            raise ValueError("output cannot replace a guideline source or frozen input manifest")


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    # Write to a sibling temp file, fsync, then atomically replace the destination.
    # The finally unlink is a no-op after a successful os.replace (file moved); it
    # only removes the temp when the replace itself fails.
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        try:
            json.dump(value, stream, indent=2, ensure_ascii=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        except BaseException:
            temporary.unlink(missing_ok=True)
            raise
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
