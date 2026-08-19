from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://crime_os_user:changeme@localhost:5432/crime_os"
    
    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+psycopg://", 1)
        if v and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v
        
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

