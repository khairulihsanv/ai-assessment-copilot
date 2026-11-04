"""Thin, provider-agnostic JSON chat client.

Default provider is a local Ollama server so student work never leaves the
institution's infrastructure. Groq and Gemini are optional. Every failure mode
is surfaced as ``LLMUnavailableError`` with a human-readable Indonesian message
so the caller can fail cleanly (no silent fallback scores, NFR-04).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from collections.abc import Callable
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Set by a caller that wants to follow a long generation; receives the tokens written so far.
llm_progress: ContextVar[Callable[[int], None] | None] = ContextVar("llm_progress", default=None)


class LLMUnavailableError(Exception):
    """The language model could not produce a usable JSON answer."""

    def __init__(self, message: str, *, retriable: bool = False):
        super().__init__(message)
        self.retriable = retriable


@dataclass
class LLMResult:
    content: dict[str, Any]
    provider: str
    model: str
    usage: dict[str, int] = field(
        default_factory=lambda: {"promptTokens": 0, "completionTokens": 0, "totalTokens": 0}
    )
    raw: Any = None


_FENCE_RE = re.compile(r"```(?:json|JSON)?\s*(.*?)\s*```", re.DOTALL)


def parse_json_object(text: str) -> dict[str, Any]:
    """Parse a JSON object from model output, tolerating ```json fences and chatter."""
    if text is None:
        raise ValueError("Respons model kosong")
    candidate = text.strip()
    if not candidate:
        raise ValueError("Respons model kosong")

    fence = _FENCE_RE.search(candidate)
    if fence:
        candidate = fence.group(1).strip()

    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("Respons model bukan JSON yang valid") from None
        try:
            parsed = json.loads(candidate[start : end + 1])
        except json.JSONDecodeError as exc:
            raise ValueError(f"Respons model bukan JSON yang valid: {exc.msg}") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Respons model harus berupa objek JSON")  # noqa: TRY004 - callers catch ValueError
    return parsed


def _status_error(provider: str, res: httpx.Response) -> LLMUnavailableError:
    code = res.status_code
    body = (res.text or "")[:300]
    retriable = code == 429 or code >= 500
    if code == 429:
        msg = f"{provider}: batas permintaan tercapai (HTTP 429). Coba lagi beberapa saat."
    elif code in (401, 403):
        msg = f"{provider}: API key ditolak (HTTP {code}). Periksa konfigurasi."
    else:
        msg = f"{provider}: HTTP {code} — {body}"
    return LLMUnavailableError(msg, retriable=retriable)


def _ollama_model_missing(res: httpx.Response, model: str) -> bool:
    if res.status_code != 404:
        return False
    text = (res.text or "").lower()
    return "not found" in text or "pull" in text or model.lower() in text


async def _ollama_stream(
    client: httpx.AsyncClient, url: str, payload: dict[str, Any]
) -> tuple[httpx.Response, str, dict[str, Any]]:
    """Run one streaming chat. Returns (response, answer text, final stats chunk)."""
    report = llm_progress.get()
    parts: list[str] = []
    tokens = 0
    final: dict[str, Any] = {}
    async with client.stream("POST", url, json=payload) as res:
        if res.status_code != 200:
            await res.aread()
            return res, "", final
        async for line in res.aiter_lines():
            if not line.strip():
                continue
            try:
                chunk = json.loads(line)
            except json.JSONDecodeError as exc:
                raise LLMUnavailableError("Ollama: aliran jawaban rusak.", retriable=True) from exc
            if chunk.get("error"):
                raise LLMUnavailableError(f"Ollama: {chunk['error']}", retriable=True)
            parts.append((chunk.get("message") or {}).get("content") or "")
            tokens += 1  # Ollama sends one token per chunk
            if report:
                report(tokens)
            if chunk.get("done"):
                final = chunk
    return res, "".join(parts), final


async def _chat_ollama(
    client: httpx.AsyncClient, system: str, user: str, schema: dict[str, Any] | None
) -> LLMResult:
    model = settings.OLLAMA_MODEL
    base = settings.OLLAMA_BASE_URL.rstrip("/")
    url = f"{base}/api/chat"
    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": True,
        "format": schema if schema else "json",
        "keep_alive": settings.OLLAMA_KEEP_ALIVE,
        # Reasoning models (qwen3, deepseek-r1, …) otherwise spend minutes "thinking" on CPU.
        "think": settings.OLLAMA_THINK,
        "options": {
            "num_ctx": settings.OLLAMA_NUM_CTX,
            "temperature": settings.LLM_TEMPERATURE,
        },
    }

    # Timeouts are not retried: on CPU a retry would only repeat a wait of many minutes.
    try:
        async with asyncio.timeout(settings.LLM_TOTAL_TIMEOUT_SECONDS):
            res, content_text, final = await _ollama_stream(client, url, payload)
            if res.status_code == 400 and "think" in (res.text or "").lower():
                payload.pop("think", None)
                res, content_text, final = await _ollama_stream(client, url, payload)
            # Older Ollama builds reject JSON-schema formats: retry with plain JSON mode.
            if res.status_code == 400 and schema:
                payload["format"] = "json"
                res, content_text, final = await _ollama_stream(client, url, payload)
    except TimeoutError as exc:
        raise LLMUnavailableError(
            f"Ollama belum selesai setelah {int(settings.LLM_TOTAL_TIMEOUT_SECONDS / 60)} menit. "
            "Coba model yang lebih ringan atau nilai secara manual."
        ) from exc
    except httpx.TimeoutException as exc:
        raise LLMUnavailableError(
            f"Ollama tidak mengirim jawaban selama {int(settings.LLM_TIMEOUT_SECONDS)} detik."
        ) from exc
    except httpx.HTTPError as exc:
        raise LLMUnavailableError(
            f"Tidak dapat terhubung ke Ollama di {base}. Pastikan layanan Ollama berjalan.",
            retriable=True,
        ) from exc

    if _ollama_model_missing(res, model):
        raise LLMUnavailableError(f"Model '{model}' belum tersedia di Ollama. Jalankan: ollama pull {model}")
    if res.status_code != 200:
        raise _status_error("Ollama", res)

    try:
        content = parse_json_object(content_text)
    except ValueError as exc:
        raise LLMUnavailableError(f"Ollama: {exc}", retriable=True) from exc

    prompt_tokens = int(final.get("prompt_eval_count") or 0)
    completion_tokens = int(final.get("eval_count") or 0)
    return LLMResult(
        content=content,
        provider="ollama",
        model=model,
        usage={
            "promptTokens": prompt_tokens,
            "completionTokens": completion_tokens,
            "totalTokens": prompt_tokens + completion_tokens,
        },
        raw={k: final.get(k) for k in ("model", "created_at", "total_duration", "eval_count", "done_reason")},
    )


async def _chat_groq(client: httpx.AsyncClient, system: str, user: str) -> LLMResult:
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY.startswith("your-") or settings.GROQ_API_KEY.startswith("gsk_your"):
        raise LLMUnavailableError("GROQ_API_KEY belum dikonfigurasi.")
    model = settings.GROQ_MODEL
    try:
        res = await client.post(
            f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": settings.LLM_TEMPERATURE,
                "response_format": {"type": "json_object"},
            },
        )
    except httpx.TimeoutException as exc:
        raise LLMUnavailableError("Groq tidak merespons tepat waktu.", retriable=True) from exc
    except httpx.HTTPError as exc:
        raise LLMUnavailableError(f"Tidak dapat terhubung ke Groq: {exc}", retriable=True) from exc

    if res.status_code != 200:
        raise _status_error("Groq", res)
    data = res.json()
    try:
        content = parse_json_object(data["choices"][0]["message"]["content"])
    except (KeyError, IndexError, ValueError) as exc:
        raise LLMUnavailableError(f"Groq: respons tidak valid ({exc})", retriable=True) from exc
    usage = data.get("usage") or {}
    return LLMResult(
        content=content,
        provider="groq",
        model=model,
        usage={
            "promptTokens": int(usage.get("prompt_tokens") or 0),
            "completionTokens": int(usage.get("completion_tokens") or 0),
            "totalTokens": int(usage.get("total_tokens") or 0),
        },
        raw={"id": data.get("id"), "model": data.get("model")},
    )


async def _chat_gemini(client: httpx.AsyncClient, system: str, user: str) -> LLMResult:
    if not settings.GEMINI_API_KEY:
        raise LLMUnavailableError("GEMINI_API_KEY belum dikonfigurasi.")
    model = settings.GEMINI_MODEL
    try:
        res = await client.post(
            f"{settings.GEMINI_BASE_URL.rstrip('/')}/models/{model}:generateContent",
            headers={"x-goog-api-key": settings.GEMINI_API_KEY},
            json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
                "generationConfig": {
                    "temperature": settings.LLM_TEMPERATURE,
                    "responseMimeType": "application/json",
                },
            },
        )
    except httpx.TimeoutException as exc:
        raise LLMUnavailableError("Gemini tidak merespons tepat waktu.", retriable=True) from exc
    except httpx.HTTPError as exc:
        raise LLMUnavailableError(f"Tidak dapat terhubung ke Gemini: {exc}", retriable=True) from exc

    if res.status_code != 200:
        raise _status_error("Gemini", res)
    data = res.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
        content = parse_json_object("".join(p.get("text", "") for p in parts))
    except (KeyError, IndexError, ValueError) as exc:
        raise LLMUnavailableError(f"Gemini: respons tidak valid ({exc})", retriable=True) from exc
    usage = data.get("usageMetadata") or {}
    return LLMResult(
        content=content,
        provider="gemini",
        model=model,
        usage={
            "promptTokens": int(usage.get("promptTokenCount") or 0),
            "completionTokens": int(usage.get("candidatesTokenCount") or 0),
            "totalTokens": int(usage.get("totalTokenCount") or 0),
        },
        raw={"modelVersion": data.get("modelVersion")},
    )


def active_model_name() -> str:
    provider = settings.LLM_PROVIDER
    if provider == "groq":
        return settings.GROQ_MODEL
    if provider == "gemini":
        return settings.GEMINI_MODEL
    return settings.OLLAMA_MODEL


async def chat_json(system: str, user: str, schema: dict[str, Any] | None = None) -> LLMResult:
    """Send one system+user exchange and return the parsed JSON object.

    Retries only retriable failures (timeouts, connection errors, 429/5xx, malformed JSON)
    up to ``LLM_MAX_RETRIES`` additional times.
    """
    provider = settings.LLM_PROVIDER
    attempts = max(0, settings.LLM_MAX_RETRIES) + 1
    timeout = httpx.Timeout(settings.LLM_TIMEOUT_SECONDS, connect=10.0)
    last_error: LLMUnavailableError | None = None

    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(1, attempts + 1):
            try:
                if provider == "groq":
                    return await _chat_groq(client, system, user)
                if provider == "gemini":
                    return await _chat_gemini(client, system, user)
                return await _chat_ollama(client, system, user, schema)
            except LLMUnavailableError as exc:
                last_error = exc
                logger.warning("LLM attempt %s/%s failed (%s): %s", attempt, attempts, provider, exc)
                if not exc.retriable or attempt >= attempts:
                    break
                await asyncio.sleep(min(2.0 * attempt, 5.0))

    assert last_error is not None
    raise last_error


async def check_health() -> dict[str, Any]:
    """Report whether the configured provider can serve chat + embeddings."""
    status: dict[str, Any] = {
        "provider": settings.LLM_PROVIDER,
        "model": active_model_name(),
        "embedModel": settings.OLLAMA_EMBED_MODEL,
        "local": settings.LLM_PROVIDER == "ollama",
        "anonymized": settings.ANONYMIZE_STUDENT_DATA,
        "reachable": False,
        "chatModelReady": False,
        "embedModelReady": False,
        "ready": False,
        "message": "",
    }

    base = settings.OLLAMA_BASE_URL.rstrip("/")
    models: list[str] = []
    ollama_error: str | None = None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(f"{base}/api/tags")
        if res.status_code == 200:
            models = [m.get("name", "") for m in (res.json().get("models") or [])]
        else:
            ollama_error = f"Ollama HTTP {res.status_code}"
    except httpx.HTTPError:
        ollama_error = f"Ollama tidak dapat dihubungi di {base}"

    def has_model(name: str) -> bool:
        wanted = name if ":" in name else f"{name}:latest"
        return any(m == name or m == wanted for m in models)

    status["embedModelReady"] = ollama_error is None and has_model(settings.OLLAMA_EMBED_MODEL)

    if settings.LLM_PROVIDER == "ollama":
        status["reachable"] = ollama_error is None
        status["chatModelReady"] = status["reachable"] and has_model(settings.OLLAMA_MODEL)
        if ollama_error:
            status["message"] = f"{ollama_error}. Dosen tetap dapat menilai secara manual."
        elif not status["chatModelReady"]:
            status["message"] = f"Model belum tersedia. Jalankan: ollama pull {settings.OLLAMA_MODEL}"
        elif not status["embedModelReady"]:
            status["message"] = (
                f"Model embedding belum tersedia (ollama pull {settings.OLLAMA_EMBED_MODEL}); "
                "pencarian bukti memakai mode leksikal."
            )
        else:
            status["message"] = "Siap"
    else:
        key = settings.GROQ_API_KEY if settings.LLM_PROVIDER == "groq" else settings.GEMINI_API_KEY
        status["reachable"] = bool(key)
        status["chatModelReady"] = bool(key)
        status["message"] = "Siap" if key else f"API key {settings.LLM_PROVIDER} belum dikonfigurasi."

    status["ready"] = bool(status["chatModelReady"])
    return status
