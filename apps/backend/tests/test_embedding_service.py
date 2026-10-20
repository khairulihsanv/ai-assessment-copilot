import os
import pytest
from unittest.mock import patch, MagicMock
from app.services.embedding_service import (
    EmbeddingDimensionMismatchError,
    EmbeddingError,
    EmbeddingProviderUnavailableError,
    EmbeddingResult,
    generate_embedding,
    generate_embedding_result,
)


@pytest.mark.asyncio
async def test_embedding_result_mock_mode():
    """Verify that in test/mock mode, the embedding is labeled as test-deterministic-mock-v1 and dimension is 768."""
    result = await generate_embedding_result("Tes teks representasi algoritma", allow_mock=True)
    assert isinstance(result, EmbeddingResult)
    assert result.model == "test-deterministic-mock-v1"
    assert result.dimension == 768
    assert result.is_mock is True
    assert len(result.vector) == 768


@pytest.mark.asyncio
async def test_embedding_result_empty_text():
    """Verify that empty text produces 768-dim zero vector with correct model label."""
    result = await generate_embedding_result("", allow_mock=True)
    assert result.model == "test-deterministic-mock-v1"
    assert result.dimension == 768
    assert len(result.vector) == 768
    assert all(x == 0.0 for x in result.vector)


@pytest.mark.asyncio
async def test_embedding_provider_unavailable_raises_error():
    """Verify that in production mode (non-mock), an unreachable Ollama raises EmbeddingProviderUnavailableError."""
    with patch.dict(os.environ, {"TEST_MOCK_EMBEDDING": "false", "ALLOW_STUB_PROVIDERS": "false"}):
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("httpx.AsyncClient.post", side_effect=Exception("Connection refused to Ollama")):
                with pytest.raises(EmbeddingProviderUnavailableError) as exc_info:
                    await generate_embedding_result("Konsep machine learning", allow_mock=False)
                assert "tidak tersedia" in str(exc_info.value)
                # Verify that no fallback hash was returned as nomic-embed-text


@pytest.mark.asyncio
async def test_embedding_dimension_mismatch_raises_error():
    """Verify that if Ollama returns vector dimension != 768, EmbeddingDimensionMismatchError is raised."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"embedding": [0.1] * 512}  # 512 instead of 768

    with patch.dict(os.environ, {"TEST_MOCK_EMBEDDING": "false", "ALLOW_STUB_PROVIDERS": "false"}):
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("httpx.AsyncClient.post", return_value=mock_resp):
                with pytest.raises(EmbeddingDimensionMismatchError) as exc_info:
                    await generate_embedding_result("Konsep machine learning", allow_mock=False)
                assert "tidak sesuai dengan pgvector (768)" in str(exc_info.value)


@pytest.mark.asyncio
async def test_embedding_provider_success():
    """Verify that when Ollama returns valid 768-dim vector, it is labeled as nomic-embed-text."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"embedding": [0.05] * 768}

    with patch.dict(os.environ, {"TEST_MOCK_EMBEDDING": "false", "ALLOW_STUB_PROVIDERS": "false"}):
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("httpx.AsyncClient.post", return_value=mock_resp):
                result = await generate_embedding_result("Konsep machine learning", allow_mock=False)
                assert result.model == "nomic-embed-text"
                assert result.dimension == 768
                assert result.is_mock is False
                assert len(result.vector) == 768
