"""Descriptor-relative IO for the opt-in guideline workflow only.

Never follows a symlink, including a replaced ancestor; never blocks opening a
FIFO or reads a device. Legacy analyzer input behavior is intentionally separate.
"""
from contextlib import contextmanager
import os
from pathlib import Path
import stat

MATERIAL_LIMIT = 16 * 1024 * 1024
REQUEST_LIMIT = 4 * 1024 * 1024


@contextmanager
def _parent_fd(path, *, create=False):
    if not path.is_absolute() or '..' in path.parts:
        raise ValueError('descriptor IO requires an absolute path without traversal')
    descriptors = []
    try:
        directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        directory = os.open(path.anchor, directory_flags)
        descriptors.append(directory)
        for component in path.parts[1:-1]:
            if create:
                try:
                    os.mkdir(component, mode=0o700, dir_fd=directory)
                except FileExistsError:
                    pass
            directory = os.open(component, directory_flags, dir_fd=directory)
            descriptors.append(directory)
        yield directory
    finally:
        for fd in reversed(descriptors):
            os.close(fd)


# Public context manager for consumer-local atomic artifact writers.
parent_directory_fd = _parent_fd


def _read_fd(fd, limit):
    if not stat.S_ISREG(os.fstat(fd).st_mode):
        raise ValueError('selected evidence must be an existing regular file')
    data = bytearray()
    while len(data) <= limit:
        chunk = os.read(fd, min(65536, limit + 1 - len(data)))
        if not chunk:
            break
        data.extend(chunk)
    if len(data) > limit:
        raise ValueError('selected evidence exceeds byte limit')
    return bytes(data)


def read_confined(workspace, path, limit=MATERIAL_LIMIT):
    workspace, path = Path(workspace), Path(path)
    path = path if path.is_absolute() else workspace / path
    if (not workspace.is_absolute() or '..' in path.parts or
            not path.is_relative_to(workspace) or path == workspace):
        raise ValueError('read must stay inside the consumer workspace')
    try:
        with _parent_fd(path) as directory:
            fd = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
            try:
                return _read_fd(fd, limit)
            finally:
                os.close(fd)
    except OSError as error:
        raise ValueError('selected evidence must be an existing regular file without symlinks') from error


def immutable_write(path, data):
    """Publish only previously confined artifact paths, never replace old bytes."""
    path = Path(path)
    with _parent_fd(path, create=True) as directory:
        try:
            fd = os.open(path.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_NONBLOCK,
                         0o600, dir_fd=directory)
        except FileExistsError:
            fd = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
            try:
                if _read_fd(fd, len(data)) != data:
                    raise ValueError('immutable artifact differs from recorded bytes')
            finally:
                os.close(fd)
        else:
            try:
                remaining = memoryview(data)
                while remaining:
                    written = os.write(fd, remaining)
                    if not written:
                        raise OSError('incomplete immutable artifact write')
                    remaining = remaining[written:]
                os.fsync(fd)
            finally:
                os.close(fd)
    return path
