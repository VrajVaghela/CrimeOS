import os
import logging
from urllib.parse import urlparse, urlunparse
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("crimeos.config")


def sanitize_url(url: str) -> str:
    """Mask password in URL for safe logging."""
    try:
        # Standardize scheme for urllib parse
        target = url
        prefix = ""
        if "+psycopg" in target:
            prefix = "postgresql+psycopg://"
            target = "http://" + target[len(prefix):]
        parsed = urlparse(target)
        if parsed.password:
            netloc = f"{parsed.username}:***@{parsed.hostname}"
            if parsed.port:
                netloc += f":{parsed.port}"
            reconstructed = urlunparse(parsed._replace(netloc=netloc))
            if prefix:
                reconstructed = prefix + reconstructed[len("http://"):]
            return reconstructed
    except Exception:
        pass
    return url


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://crime_os_user:changeme@localhost:5432/crime_os"
    PORT: int = 8000
    GEMINI_API_KEY: str = ""
    GEMINI_FLASH_MODEL: str = "gemini-2.5-flash"
    GEMINI_PRO_MODEL: str = "gemini-2.5-pro"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    JWT_SECRET: str = Field(default="dev-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    DEMO_PROVIDER_INBOX: str = "demo-provider@example.com"
    FRONTEND_ORIGIN: str = "http://localhost:3000,http://127.0.0.1:3000"
    UPLOAD_DIR: str = "uploads"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str | None) -> str:
        if not v or not str(v).strip():
            v = "postgresql+psycopg://crime_os_user:changeme@localhost:5432/crime_os"

        v = str(v).strip()

        # Render, Heroku, Supabase, Neon use postgres:// or postgresql:// without driver
        if v.startswith("postgres://"):
            v = "postgresql+psycopg://" + v[len("postgres://"):]
        elif v.startswith("postgresql://") and not v.startswith("postgresql+psycopg://"):
            v = "postgresql+psycopg://" + v[len("postgresql://"):]

        try:
            target = v.replace("postgresql+psycopg://", "http://")
            parsed = urlparse(target)
            hostname = parsed.hostname or ""

            # Ensure sslmode=require for Render external postgres
            if hostname.endswith(".render.com") and "sslmode=" not in v:
                sep = "&" if "?" in v else "?"
                v = f"{v}{sep}sslmode=require"

            is_render = bool(os.environ.get("RENDER") or os.environ.get("RENDER_SERVICE_ID"))
            if is_render and hostname in ("localhost", "127.0.0.1", "0.0.0.0"):
                logger.warning(
                    "[CONFIG WARNING] Application running on Render, but DATABASE_URL points to '%s'. "
                    "Render Web Services do not have a local database. "
                    "Please configure DATABASE_URL in your Render Dashboard environment variables.",
                    hostname,
                )
        except Exception as err:
            logger.debug("Failed checking DATABASE_URL hostname: %s", err)

        return v

    @property
    def cors_origins(self) -> list[str]:
        origins = [o.strip() for o in self.FRONTEND_ORIGIN.split(",") if o.strip()]
        defaults = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        for d in defaults:
            if d not in origins:
                origins.append(d)
        return origins

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")


settings = Settings()


