from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables or backend/.env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "BuildSpace API"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173"]
    database_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
