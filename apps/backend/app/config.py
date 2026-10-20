import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server
    PORT: int = 3001
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = Field(default="development", alias="NODE_ENV")

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://postgres:password@127.0.0.1:5432/ai_assessment_copilot",
        description="PostgreSQL Connection URL",
    )

    # Security
    SECRET_KEY: str = Field(
        default="",
        alias="INTERNAL_API_SECRET",
        description="Mandatory secret for JWT HMAC signing (min 32 chars)",
    )
    JWT_SECRET_KEY: str = Field(
        default="",
        alias="NEXTAUTH_SECRET",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    JWT_ISSUER: str = "dexa-backend"
    JWT_AUDIENCE: str = "dexa-client"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    # File Storage
    STORAGE_DIR: str = "./storage"
    MAX_FILE_SIZE_MB: int = 10

    # AI & LLM Providers
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    EMBEDDING_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"


settings = Settings()

# Resolve SECRET_KEY fallback from environment variables
if not settings.SECRET_KEY:
    settings.SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("INTERNAL_API_SECRET") or os.getenv("AUTH_SECRET") or ""

# Fail startup immediately if mandatory secret is missing or insecure
if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
    raise RuntimeError(
        "FATAL SECURITY CONFIG ERROR: SECRET_KEY / INTERNAL_API_SECRET is mandatory, "
        "must be configured via environment, and must contain at least 32 characters."
    )
