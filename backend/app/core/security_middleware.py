import time
from typing import Any

from fastapi.responses import JSONResponse
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

DEFAULT_BODY_LIMIT = 64 * 1024
FILES_BODY_LIMIT = 5 * 1024 * 1024  # a project may hold 2 MB of text, which grows when JSON-escaped

DEFAULT_RATE_LIMIT = 300  # requests per window, per client IP, on every route
RATE_WINDOW_SECONDS = 60

DOCS_PATHS = {"/docs", "/redoc", "/openapi.json", "/docs/oauth2-redirect"}
API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=()"

# Shared state, so tests can switch the limiter on and clear it.
RATE_STATE: dict[str, Any] = {"enabled": True, "hits": {}}

TOO_LARGE_BODY = b'{"detail":"Request body is too large."}'


class _BodyTooLarge(Exception):
    pass


class DefaultRateLimitMiddleware:
    """Fixed-window limit per client IP, applied to every route."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not RATE_STATE["enabled"]:
            await self.app(scope, receive, send)
            return

        client = scope.get("client")
        key = client[0] if client else "unknown"
        now = time.monotonic()
        hits: dict[str, tuple[float, int]] = RATE_STATE["hits"]

        start, count = hits.get(key, (now, 0))
        if now - start >= RATE_WINDOW_SECONDS:
            start, count = now, 0
        count += 1
        hits[key] = (start, count)

        if len(hits) > 10_000:  # keep memory bounded
            for stale in [k for k, (s, _) in hits.items() if now - s >= RATE_WINDOW_SECONDS]:
                del hits[stale]

        if count > DEFAULT_RATE_LIMIT:
            retry = max(1, int(RATE_WINDOW_SECONDS - (now - start)))
            response = JSONResponse(
                {"detail": "Too many requests. Please slow down."},
                status_code=429,
                headers={"Retry-After": str(retry)},
            )
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)


class BodySizeLimitMiddleware:
    """Rejects oversized request bodies, both by Content-Length and while streaming."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    @staticmethod
    def _limit_for(scope: Scope) -> int:
        if scope["method"] == "PUT" and scope["path"].endswith("/files"):
            return FILES_BODY_LIMIT
        return DEFAULT_BODY_LIMIT

    @staticmethod
    async def _reject(scope: Scope, receive: Receive, send: Send, status: int, detail: str) -> None:
        await JSONResponse({"detail": detail}, status_code=status)(scope, receive, send)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        limit = self._limit_for(scope)
        declared = Headers(scope=scope).get("content-length")
        if declared is not None:
            try:
                size = int(declared)
            except ValueError:
                await self._reject(scope, receive, send, 400, "Invalid Content-Length header.")
                return
            if size > limit:
                await self._reject(scope, receive, send, 413, "Request body is too large.")
                return

        received = 0
        exceeded = False
        responded = False  # True once any response has started (ours or the app's)

        async def limited_receive() -> Message:
            nonlocal received, exceeded
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    exceeded = True
                    raise _BodyTooLarge
            return message

        async def guarded_send(message: Message) -> None:
            nonlocal responded
            if exceeded:
                # Frameworks may turn our exception into a 400. Replace whatever they send.
                if not responded:
                    responded = True
                    await send(
                        {
                            "type": "http.response.start",
                            "status": 413,
                            "headers": [
                                (b"content-type", b"application/json"),
                                (b"content-length", str(len(TOO_LARGE_BODY)).encode()),
                            ],
                        }
                    )
                    await send({"type": "http.response.body", "body": TOO_LARGE_BODY})
                return
            if message["type"] == "http.response.start":
                responded = True
            await send(message)

        try:
            await self.app(scope, limited_receive, guarded_send)
        except _BodyTooLarge:
            if not responded:
                await self._reject(scope, receive, send, 413, "Request body is too large.")


class SecurityHeadersMiddleware:
    """Adds defensive headers to every API response."""

    def __init__(self, app: ASGIApp, hsts: bool = False) -> None:
        self.app = app
        self.hsts = hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope["path"]

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                message.setdefault("headers", [])
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["Referrer-Policy"] = "no-referrer"
                headers["Permissions-Policy"] = PERMISSIONS_POLICY
                if path not in DOCS_PATHS:  # Swagger UI needs inline scripts from a CDN
                    headers["Content-Security-Policy"] = API_CSP
                if path.startswith("/api/v1/auth"):
                    headers["Cache-Control"] = "no-store"
                if self.hsts:
                    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            await send(message)

        await self.app(scope, receive, send_with_headers)
