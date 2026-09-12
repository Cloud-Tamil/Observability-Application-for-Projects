from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FUSION_", env_file=".env", extra="ignore")

    app_name: str = "fusion-metrics"
    version: str = "2.0.0"
    environment: str = "local"
    log_level: str = "INFO"

    jwt_secret: str = "change-me-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_ttl_seconds: int = 3600
    bootstrap_admin_user: str = "admin"
    bootstrap_admin_password: str = "admin123"

    database_url: str = "postgresql+asyncpg://fusion:fusion@postgres:5432/fusion"
    redis_url: str = "redis://redis:6379/0"
    db_pool_size: int = 10
    db_max_overflow: int = 20

    rate_limit_requests: int = Field(120)
    rate_limit_window_seconds: int = Field(60)

    slo_latency_target_ms: int = 500


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
