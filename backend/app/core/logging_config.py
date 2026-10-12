import logging
import re

_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+"), r"\1[REDACTED]"),
    (
        re.compile(
            r"(?i)((?:password|refresh_token|access_token|token|secret|authorization)[\"']?\s*[:=]\s*[\"']?)[^\s\"',;&}]+"
        ),
        r"\1[REDACTED]",
    ),
    (re.compile(r"(?i)(postgres(?:ql)?(?:\+\w+)?://[^:/\s]+:)[^@\s]+@"), r"\1[REDACTED]@"),
]


def redact(text: str) -> str:
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class RedactingFormatter(logging.Formatter):
    """Wraps another formatter and scrubs secrets from the whole output, tracebacks included."""

    def __init__(self, inner: logging.Formatter | None = None) -> None:
        super().__init__()
        self._inner = inner

    def format(self, record: logging.LogRecord) -> str:
        text = self._inner.format(record) if self._inner else super().format(record)
        return redact(text)


def install_redaction() -> None:
    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(
            level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
        )
    for name in ("", "uvicorn", "uvicorn.error", "uvicorn.access"):
        for handler in logging.getLogger(name).handlers:
            if handler.__class__.__module__.startswith("_pytest"):
                continue
            if not isinstance(handler.formatter, RedactingFormatter):
                handler.setFormatter(RedactingFormatter(handler.formatter))
