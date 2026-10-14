from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import account, auth, projects, public, templates, versions
from app.core.config import get_settings
from app.core.limiter import limiter
from app.core.logging_config import install_redaction
from app.core.security_middleware import (
    RATE_STATE,
    BodySizeLimitMiddleware,
    DefaultRateLimitMiddleware,
    SecurityHeadersMiddleware,
)

settings = get_settings()
install_redaction()
RATE_STATE["enabled"] = settings.rate_limit_enabled

if settings.is_production:
    problems = settings.production_problems()
    if problems:
        raise RuntimeError("Unsafe production configuration: " + "; ".join(problems))

docs_options: dict[str, Any] = {}
if settings.is_production:
    docs_options = {"docs_url": None, "redoc_url": None, "openapi_url": None}

app = FastAPI(title=settings.app_name, **docs_options)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Report which field failed and why, but never echo the submitted value (it may be a password).
    errors = [
        {"loc": list(e.get("loc", [])), "msg": str(e.get("msg", "")), "type": str(e.get("type", ""))}
        for e in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


# Added first = innermost. CORS is added last so it wraps everything, including error responses.
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(DefaultRateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware, hsts=settings.is_production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(account.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(public.router, prefix="/api/v1")
app.include_router(versions.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


