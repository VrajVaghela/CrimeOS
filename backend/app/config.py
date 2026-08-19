import os
from pydantic import Field, field_validator
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine.url import make_url


def normalize_db_url(raw_url: str) -> str:
    if not raw_url:
        return raw_url
    try:
        url = make_url(raw_url)
        driver = url.drivername
        if driver in ("postgres", "postgresql", "postgresql+psycopg2"):
            driver = "postgresql+psycopg"
        
        database = url.database
        if not database:
            database = (
                os.environ.get("POSTGRES_DB")
                or os.environ.get("PGDATABASE")
                or os.environ.get("DB_NAME")
                or "crime_os"
            )
        
        url = url.set(drivername=driver, database=database)
        return url.render_as_string(hide_password=False)
    except Exception as e:
        print(f"[CONFIG WARNING] Failed to parse URL with make_url: {e}")
        if raw_url.startswith("postgres://"):
            return raw_url.replace("postgres://", "postgresql+psycopg://", 1)
        if raw_url.startswith("postgresql://"):
            return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return raw_url


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://crime_os_user:rTzAn2CxPsmJ8sQDvf6GE0CFBPnH42Nd@dpg-da2huv6gekts73b0k5q0-a/crime_os"
    
    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        return normalize_db_url(v)
        
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
try:
    _url = make_url(settings.DATABASE_URL)
    print(f"[CONFIG] Database Driver: {_url.drivername} | Host: {_url.host} | Database: {_url.database}")
except Exception as _e:
    print(f"[CONFIG] Could not parse DATABASE_URL: {_e}")

