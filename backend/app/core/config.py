from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables or backend/.env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "BuildSpace API"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173"]
    database_url: str = ""

    jwt_secret: str = ""
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    cookie_secure: bool = False
    rate_limit_enabled: bool = True

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() == "production"

    def production_problems(self) -> list[str]:
        """Reasons this configuration is unsafe for production (empty means fine)."""
        problems: list[str] = []
        if len(self.jwt_secret) < 32 or "CHANGE_ME" in self.jwt_secret.upper():
            problems.append("JWT_SECRET must be a random string of 32+ characters")
        if not self.database_url:
            problems.append("DATABASE_URL is not set")
        if not self.cookie_secure:
            problems.append("COOKIE_SECURE must be true (HTTPS only)")
        if not self.rate_limit_enabled:
            problems.append("RATE_LIMIT_ENABLED must be true")
        if not self.cors_origins or any(not o.startswith("https://") for o in self.cors_origins):
            problems.append("CORS_ORIGINS must list https:// origins only")
        return problems


@lru_cache
def get_settings() -> Settings:
    return Settings()
