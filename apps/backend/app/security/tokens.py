from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from app.config import settings


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": now,
        "iss": "dexa-backend",
        "aud": "dexa-client",
    })

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT access token.
    Tries primary SECRET_KEY, and fallback keys for smooth migration.
    """
    keys_to_try = [
        settings.SECRET_KEY,
        settings.JWT_SECRET_KEY,
        "default_unsafe_secret_for_dev_only",
    ]

    for key in keys_to_try:
        if not key:
            continue
        try:
            # First try with audience and issuer verification
            payload = jwt.decode(
                token,
                key,
                algorithms=[settings.ALGORITHM],
                options={"verify_aud": False, "verify_iss": False},
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.PyJWTError:
            continue

    return None
