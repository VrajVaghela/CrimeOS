from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://crime_os_user:changeme@localhost:5432/crime_os"
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
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 2000  # Default 2 GB limit (Gemini API maximum file size)

    # --- Local model providers (Ollama + faster-whisper) ---
    # Text generation, structured extraction, embeddings and audio ASR run locally.
    # Vision (image / PDF / video) has no local equivalent and stays on Gemini.
    EMBEDDING_PROVIDER: str = "ollama"  # "ollama" | "gemini" — one corpus, one provider

    OLLAMA_ENABLED: bool = True
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_CHAT_MODEL: str = "qwen2.5:3b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text:latest"
    OLLAMA_EMBED_DIM: int = 768
    OLLAMA_TIMEOUT_SECONDS: float = 120.0
    OLLAMA_CONNECT_TIMEOUT_SECONDS: float = 2.0
    OLLAMA_PROBE_TIMEOUT_SECONDS: float = 1.5
    OLLAMA_PROBE_TTL_SECONDS: float = 30.0
    OLLAMA_KEEP_ALIVE: str = "10m"
    # 8192, not Ollama's 4096 default: assembled copilot / path-revision prompts reach
    # 10-40 KB, and at 4096 Ollama silently drops the FRONT of the prompt (the instructions).
    OLLAMA_NUM_CTX: int = 8192
    OLLAMA_TEMPERATURE: float = 0.2
    # Safety valve: prompts estimated above the token budget skip local entirely. This is a
    # TOKEN budget, not a character one, because Gujarati costs ~4.7x more tokens per
    # character than English (measured: 0.69 vs 3.24 chars/token on qwen2.5:3b), so a flat
    # character cap would silently overflow num_ctx on exactly the trilingual content this
    # app is built for. Kept as a char cap too, as a cheap pre-filter.
    OLLAMA_MAX_PROMPT_CHARS: int = 60000
    # Tokens held back from num_ctx for the model's own response.
    OLLAMA_OUTPUT_TOKEN_RESERVE: int = 1536
    # Comma-separated `purpose` prefixes that must never run locally. Empty = all text local.
    LOCAL_LLM_SKIP_PURPOSE_PREFIXES: str = ""

    WHISPER_ENABLED: bool = True
    WHISPER_MODEL_DIR: str = "E:/models/whisper/faster-whisper-medium"
    # CUDA is ~8.6x faster than CPU int8 (measured: 10.8s vs 92.5s for 57s of Hindi audio).
    # It requires `pip install nvidia-cublas-cu12 nvidia-cudnn-cu12`; whisper_client puts
    # those wheels' DLLs on PATH automatically. If they are missing, the client falls back
    # to cpu/int8 at load AND on the first inference failure, so this default is safe.
    WHISPER_DEVICE: str = "cuda"
    WHISPER_COMPUTE_TYPE: str = "float16"
    WHISPER_BEAM_SIZE: int = 5
    WHISPER_VAD_FILTER: bool = True
    # Languages Whisper medium transcribes too poorly to trust — escalate these to Gemini.
    WHISPER_ESCALATE_LANGUAGES: str = "gu"

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")


settings = Settings()
