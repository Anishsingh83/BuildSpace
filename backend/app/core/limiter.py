from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

# Per-route limits (login, register, public, fork) use this. The default limit for every
# route is DefaultRateLimitMiddleware in security_middleware.py.
limiter = Limiter(key_func=get_remote_address, enabled=get_settings().rate_limit_enabled)
