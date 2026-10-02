"""SourceSense – Application configuration (env-var driven)."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", protected_namespaces=('settings_',))

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = Field(
        default="sqlite+aiosqlite:///./sourcesense.db",
        alias="DATABASE_URL",
    )
    
    def get_async_db_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    sync_database_url: str = Field(
        default="sqlite:///./sourcesense.db",
        alias="SYNC_DATABASE_URL",
    )
    
    def get_sync_db_url(self) -> str:
        url = self.sync_database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url


    # ── Relay / trigger defaults (overridden per-node in DB) ──────────────────
    default_pm10_threshold: float = Field(default=50.0, alias="DEFAULT_PM10_THRESHOLD")
    default_relay_delay_minutes: int = Field(default=5, alias="DEFAULT_RELAY_DELAY_MINUTES")

    # ── Humidity correction defaults (Laulainen/Chakrabarti) ─────────────────
    default_calib_a: float = Field(default=0.33, alias="DEFAULT_CALIB_A")
    default_calib_b: float = Field(default=0.17, alias="DEFAULT_CALIB_B")

    # ── Alerts ────────────────────────────────────────────────────────────────
    twilio_account_sid: Optional[str] = Field(default=None, alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: Optional[str] = Field(default=None, alias="TWILIO_AUTH_TOKEN")
    twilio_from_number: Optional[str] = Field(default=None, alias="TWILIO_FROM_NUMBER")
    twilio_whatsapp_from: Optional[str] = Field(default=None, alias="TWILIO_WHATSAPP_FROM")
    smtp_host: Optional[str] = Field(default=None, alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: Optional[str] = Field(default=None, alias="SMTP_USER")
    smtp_password: Optional[str] = Field(default=None, alias="SMTP_PASSWORD")
    smtp_from: Optional[str] = Field(default="alerts@sourcesense.io", alias="SMTP_FROM")
    city_infrastructure_webhook_url: Optional[str] = Field(default="https://mock-city-api.sourcesense.io/v1/mitigate", alias="CITY_INFRASTRUCTURE_WEBHOOK_URL")

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        alias="CORS_ORIGINS",
    )

    # ── ML model ─────────────────────────────────────────────────────────────
    model_path: str = Field(default="app/ml/model.pkl", alias="MODEL_PATH")

    # ── Warm-up period detection (minutes from node first-seen) ──────────────
    warmup_minutes: int = Field(default=5, alias="WARMUP_MINUTES")

    # ── Timestamp gap threshold (minutes) ────────────────────────────────────
    gap_threshold_minutes: int = Field(default=10, alias="GAP_THRESHOLD_MINUTES")


settings = Settings()
