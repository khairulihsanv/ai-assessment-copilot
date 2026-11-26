import os
from typing import Literal

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
    # One uploaded document (PDF/DOCX). Lab reports with figures are often well over 10 MB.
    MAX_FILE_SIZE_MB: int = 25
    # Photographed or scanned answer sheets: pages per submission and size of one page image.
    SCAN_MAX_PAGES: int = 40
    SCAN_MAX_IMAGE_MB: int = 10

    # AI & LLM Providers
    # Provider untuk menyusun DRAF penilaian. Default: Ollama lokal (data tidak keluar dari server).
    # "mock" is only for automated tests (TEST_MOCK_LLM=true); it never produces real drafts.
    LLM_PROVIDER: Literal["ollama", "groq", "gemini", "mock"] = "ollama"
    # Ollama answers as a stream: this is the longest allowed silence, not the length of the whole answer.
    LLM_TIMEOUT_SECONDS: float = 300.0
    LLM_TOTAL_TIMEOUT_SECONDS: float = 1800.0
    # Grading should be repeatable: the same answer should get the same draft.
    LLM_TEMPERATURE: float = 0.0
    LLM_SEED: int = 42
    LLM_MAX_RETRIES: int = 1
    # Upper bound for one grading prompt, in estimated tokens. 0 = no limit.
    # Free Groq allows 8000 tokens per minute *including* the answer, so the default keeps
    # the prompt near 5000 and leaves room for the reply. Unset = 5000 on Groq, unlimited elsewhere.
    LLM_MAX_PROMPT_TOKENS: int | None = None
    # Long answers that do not fit one prompt are read in further passes, each one within the
    # prompt budget, so every part of a report reaches the model. 1 = a single pass (old behaviour).
    LLM_MAX_READ_PASSES: int = 8
    # Tokens (prompt + answer) the provider allows per minute; passes wait for the window to refill.
    # Unset = 8000 on Groq's free tier, no pacing elsewhere. 0 = no pacing.
    LLM_TOKENS_PER_MINUTE: int | None = None

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    OLLAMA_NUM_CTX: int = 8192
    OLLAMA_KEEP_ALIVE: str = "30m"
    OLLAMA_THINK: bool = False  # disable chain-of-thought on reasoning models (much faster on CPU)

    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    # Reasoning models (gpt-oss, qwen3) spend hidden "thinking" tokens before answering. "low" keeps
    # grading quality for rubric scoring while using far fewer tokens. Empty = provider default.
    GROQ_REASONING_EFFORT: str = "low"

    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_MODEL: str = "gemini-2.0-flash"

    EMBEDDING_API_KEY: str = ""

    # OCR for photographed / scanned answers.
    # rapidocr: local engine, fast, good for printed text, weak on handwriting.
    # vision:   a vision model reads every page (best for handwriting, costs tokens once per page).
    # auto:     rapidocr first; pages it reads poorly go to the vision model, if one is configured.
    OCR_ENGINE: Literal["rapidocr", "vision", "auto"] = "auto"
    OCR_VISION_PROVIDER: Literal["none", "groq", "ollama"] = "none"
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    OLLAMA_VISION_MODEL: str = "qwen2.5vl:7b"
    # In auto mode, a page whose average rapidocr confidence is below this goes to the vision model.
    OCR_VISION_MIN_CONFIDENCE: float = 0.85
    # Pages are downscaled to this longest side before the vision model sees them (fewer tokens).
    OCR_VISION_MAX_SIDE: int = 1600

    # Retrieval & privasi
    EVIDENCE_TOP_K: int = 3
    # Safety cap on how much of one answer is read (about 30 000 words, a long thesis-size report).
    # Long answers are not cut to fit the model: the most relevant passages per criterion are sent.
    STUDENT_TEXT_MAX_CHARS: int = 200000
    # Drop cover page, preface, table of contents, bibliography and repeated page headers from long
    # reports before grading. They carry no rubric evidence and only cost tokens.
    CLEAN_REPORT_BOILERPLATE: bool = True
    ANONYMIZE_STUDENT_DATA: bool = True


settings = Settings()

# Resolve SECRET_KEY fallback from environment variables
if not settings.SECRET_KEY:
    # Same precedence as the frontend (middleware.ts, server/auth/*): keep these in sync.
    settings.SECRET_KEY = (
        os.getenv("INTERNAL_API_SECRET")
        or os.getenv("SECRET_KEY")
        or os.getenv("AUTH_SECRET")
        or os.getenv("NEXTAUTH_SECRET")
        or ""
    )

# Fail startup immediately if mandatory secret is missing or insecure
if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
    raise RuntimeError(
        "FATAL SECURITY CONFIG ERROR: SECRET_KEY / INTERNAL_API_SECRET is mandatory, "
        "must be configured via environment, and must contain at least 32 characters."
    )
