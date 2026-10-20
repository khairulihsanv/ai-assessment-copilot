from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.config import settings


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Create a signed JWT access token conforming to strict claims contract.
    Requires subject (sub), issuer (iss), audience (aud), and expiration (exp).
    """
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    user_id = to_encode.get("sub") or to_encode.get("id")
    if not user_id:
        raise ValueError("Cannot create access token without valid subject ID (sub)")

    to_encode.update({
        "sub": str(user_id),
        "id": str(user_id),
        "exp": expire,
        "iat": now,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    })

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify a JWT access token against the configured SECRET_KEY.
    Enforces strict signature, expiration, algorithm, issuer, and audience validation.
    No fallback keys or insecure dev bypasses allowed.
    """
    if not token or not isinstance(token, str):
        return None

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iss": True,
                "verify_aud": True,
                "require": ["exp", "iss", "aud", "sub"],
            },
        )

        user_id = payload.get("sub")
        if not user_id or not str(user_id).strip():
            return None

        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, jwt.PyJWTError):
        return None
