"""
Application Configuration — Pydantic Settings
================================================
Centralized configuration management using pydantic-settings.
All configuration is loaded from environment variables (typically via .env).

Required Variables (no defaults — startup fails with a named error if missing):
    - GEMINI_API_KEY: Google Gemini API key for video analysis
    - LEDGER_SIGNING_KEY: HMAC key for tamper-evident ledger signing

Optional Variables (with sensible defaults):
    - DATABASE_URL: PostgreSQL connection string (async via asyncpg)
    - REDIS_URL: Redis connection string for Celery broker/backend
    - MAX_UPLOAD_SIZE_MB: Maximum video upload size in megabytes
    - TEMP_UPLOAD_DIR: Directory for temporary video uploads
    - ALLOWED_VIDEO_EXTENSIONS: List of accepted video file extensions
    - FRONTEND_ORIGIN: CORS-allowed frontend origin URL
    - GEMINI_MODEL: Gemini model name for video analysis
    - GEMINI_POLL_MAX_WAIT_SECONDS: Max wait time for Gemini file processing
    - GEMINI_POLL_INTERVAL_SECONDS: Initial polling interval for Gemini file status
    - GEMINI_POLL_MAX_INTERVAL_SECONDS: Maximum backoff interval for polling
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Attributes:
        GEMINI_API_KEY: Google Gemini API key (required, no default).
        LEDGER_SIGNING_KEY: HMAC signing key for ledger (required, no default).
        DATABASE_URL: Async PostgreSQL connection string.
        REDIS_URL: Redis connection string for Celery.
        MAX_UPLOAD_SIZE_MB: Maximum upload file size in MB.
        TEMP_UPLOAD_DIR: Path for temporary video file storage.
        ALLOWED_VIDEO_EXTENSIONS: List of accepted video file extensions.
        FRONTEND_ORIGIN: CORS-allowed origin for the frontend application.
        GEMINI_MODEL: Name of the Gemini model to use for analysis.
        GEMINI_POLL_MAX_WAIT_SECONDS: Maximum total wait time for Gemini polling.
        GEMINI_POLL_INTERVAL_SECONDS: Initial poll interval in seconds.
        GEMINI_POLL_MAX_INTERVAL_SECONDS: Maximum backoff interval for polling.
    """

    # ── Required secrets (fail fast if missing) ──────────────────────────
    GEMINI_API_KEY: str
    LEDGER_SIGNING_KEY: str

    # ── Database & messaging ─────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/video_analyzer"
    REDIS_URL: str = "redis://redis:6379/0"

    # ── Upload constraints ───────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 500
    TEMP_UPLOAD_DIR: str = "/tmp/video-uploads"
    ALLOWED_VIDEO_EXTENSIONS: List[str] = [".mp4", ".avi", ".mov"]

    # ── CORS ─────────────────────────────────────────────────────────────
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # ── Gemini SDK ───────────────────────────────────────────────────────
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_POLL_MAX_WAIT_SECONDS: int = 600  # 10 minutes max wait
    GEMINI_POLL_INTERVAL_SECONDS: int = 2  # Initial poll interval
    GEMINI_POLL_MAX_INTERVAL_SECONDS: int = 30  # Max backoff cap

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @field_validator("GEMINI_API_KEY", "LEDGER_SIGNING_KEY")
    @classmethod
    def secrets_must_not_be_empty(cls, v: str, info) -> str:
        """Validate that required secrets are not empty or placeholder values.

        Args:
            v: The value of the secret.
            info: Pydantic validation info with field name.

        Returns:
            str: The validated non-empty secret value.

        Raises:
            ValueError: If the secret is empty or a placeholder.
        """
        if not v or v.strip() == "" or v.startswith("your-"):
            raise ValueError(
                f"Required secret '{info.field_name}' is missing or set to a placeholder. "
                f"Set a valid value in your .env file or environment variables."
            )
        return v


@lru_cache()
def get_settings() -> Settings:
    """Retrieve cached application settings singleton.

    Returns:
        Settings: The application settings instance.

    Raises:
        pydantic.ValidationError: If required environment variables are missing.
    """
    return Settings()
