import re
from collections.abc import Iterable

SEGMENT = re.compile(r"[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}")
MAX_DEPTH = 5
MAX_PATH_LENGTH = 200
MAX_FILES = 100
MAX_FILE_BYTES = 500 * 1024
MAX_PROJECT_BYTES = 2 * 1024 * 1024


def path_error(path: str) -> str | None:
    """Return a message if the path is not allowed, otherwise None."""
    if not path:
        return "A file path is required."
    if len(path) > MAX_PATH_LENGTH:
        return "A file path is too long."
    segments = path.split("/")
    if len(segments) > MAX_DEPTH:
        return f"Folders can be nested at most {MAX_DEPTH - 1} levels deep."
    # fullmatch (not match) so a trailing newline cannot slip through.
    if not all(SEGMENT.fullmatch(s) for s in segments):
        return (
            "File names may use letters, numbers, dots, hyphens and underscores, "
            "and cannot start with a dot."
        )
    return None


def validate_file_set(files: Iterable[tuple[str, str]]) -> None:
    """Raise ValueError if the set of (path, content) pairs breaks any rule."""
    items = list(files)
    if len(items) > MAX_FILES:
        raise ValueError(f"A project can have at most {MAX_FILES} files.")

    paths: set[str] = set()
    total = 0
    for path, content in items:
        problem = path_error(path)
        if problem:
            raise ValueError(problem)
        if path in paths:
            raise ValueError(f'Duplicate file path: "{path}".')
        paths.add(path)
        if "\x00" in content:
            raise ValueError(f'"{path}" contains a null character.')
        size = len(content.encode("utf-8"))
        if size > MAX_FILE_BYTES:
            raise ValueError(f'"{path}" is larger than {MAX_FILE_BYTES // 1024} KB.')
        total += size

    if total > MAX_PROJECT_BYTES:
        raise ValueError(f"A project can hold at most {MAX_PROJECT_BYTES // (1024 * 1024)} MB.")

    for path in paths:
        parts = path.split("/")
        for i in range(1, len(parts)):
            if "/".join(parts[:i]) in paths:
                raise ValueError(f'"{"/".join(parts[:i])}" is a file, so it cannot contain other items.')
