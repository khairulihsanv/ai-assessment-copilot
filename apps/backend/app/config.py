from typing import List
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
        default="postgresql://postgres:postgres@localhost:5432/dexa_assessment",
        description="PostgreSQL Connection URL",
    )

    # Security
    SECRET_KEY: str = Field(
        default="super-secret-dexa-assessment-key-change-in-production-2026",
        alias="INTERNAL_API_SECRET",
    )
    JWT_SECRET_KEY: str = Field(
        default="super-secret-dexa-assessment-jwt-key-change-in-production-2026",
        alias="NEXTAUTH_SECRET",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    # CORS
    CORS_ORIGINS: List[str] = [
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
