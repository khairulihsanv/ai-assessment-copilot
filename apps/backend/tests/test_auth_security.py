from datetime import UTC, datetime, timedelta
import jwt
import pytest
from fastapi import status

from app.config import settings
from app.models.enums import Role
from app.models.models import User
from app.security.passwords import hash_password, verify_password
from app.security.tokens import create_access_token, decode_access_token


def test_token_with_old_fallback_secret_rejected(client):
    """Tokens signed with old/insecure fallback secrets must be rejected."""
    old_secret = "default_unsafe_secret_for_dev_only"
    payload = {
        "sub": "some_user_id",
        "id": "some_user_id",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "exp": datetime.now(UTC) + timedelta(hours=1),
    }
    forged_token = jwt.encode(payload, old_secret, algorithm="HS256")

    # Decoder must return None
    assert decode_access_token(forged_token) is None

    # Endpoint must return 401 Unauthorized
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
    assert res.status_code == status.HTTP_401_UNAUTHORIZED


def test_forged_or_expired_or_missing_claim_token_rejected(client):
    """Tokens with invalid signatures, expired tokens, or missing required claims must be rejected."""
    now = datetime.now(UTC)

    # 1. Expired token
    expired_payload = {
        "sub": "user_123",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "exp": now - timedelta(minutes=5),
        "iat": now - timedelta(minutes=10),
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm="HS256")
    assert decode_access_token(expired_token) is None
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Missing sub claim
    no_sub_payload = {
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "exp": now + timedelta(hours=1),
    }
    no_sub_token = jwt.encode(no_sub_payload, settings.SECRET_KEY, algorithm="HS256")
    assert decode_access_token(no_sub_token) is None
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {no_sub_token}"})
    assert res.status_code == status.HTTP_401_UNAUTHORIZED

    # 3. Forged signature
    valid_token = create_access_token({"sub": "user_123", "role": "DOSEN"})
    tampered_token = valid_token[:-4] + "abcd"
    assert decode_access_token(tampered_token) is None
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == status.HTTP_401_UNAUTHORIZED


def test_wrong_issuer_and_audience_rejected(client):
    """Tokens with incorrect issuer or audience must be rejected."""
    now = datetime.now(UTC)

    # Wrong issuer
    bad_iss_payload = {
        "sub": "user_123",
        "iss": "untrusted-issuer",
        "aud": settings.JWT_AUDIENCE,
        "exp": now + timedelta(hours=1),
    }
    bad_iss_token = jwt.encode(bad_iss_payload, settings.SECRET_KEY, algorithm="HS256")
    assert decode_access_token(bad_iss_token) is None

    # Wrong audience
    bad_aud_payload = {
        "sub": "user_123",
        "iss": settings.JWT_ISSUER,
        "aud": "wrong-audience",
        "exp": now + timedelta(hours=1),
    }
    bad_aud_token = jwt.encode(bad_aud_payload, settings.SECRET_KEY, algorithm="HS256")
    assert decode_access_token(bad_aud_token) is None


def test_token_for_nonexistent_database_user_rejected(client, db_session):
    """
    Critical security test: tokens containing valid signatures but referencing a user ID
    that does NOT exist in the database must be rejected with 401 Unauthorized.
    No dummy User object must ever be fabricated.
    """
    fake_user_id = "nonexistent_fake_user_99999"
    # Verify user definitely does not exist in DB
    existing = db_session.query(User).filter(User.id == fake_user_id).first()
    assert existing is None

    token = create_access_token({
        "sub": fake_user_id,
        "name": "Hacker Attacker",
        "email": "hacker@evil.com",
        "role": "DOSEN",
    })

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert "tidak ditemukan" in res.json().get("detail", "").lower() or "revoked" in res.json().get("detail", "").lower()


def test_demo_password_bypass_eliminated():
    """Verify that demo password bypass strings are strictly rejected if bcrypt check fails."""
    # Real hash of something completely different
    unrelated_hash = hash_password("CompletelyDifferentPassword999!")

    # Attempting to use demo bypass passwords against unrelated hash must FAIL
    assert verify_password("dosen123", unrelated_hash, email="dosen.demo@example.com") is False
    assert verify_password("Dosen@12345", unrelated_hash, email="dosen.demo@example.com") is False
    assert verify_password("mhs123", unrelated_hash, email="mahasiswa.demo@example.com") is False

    # Standard valid password must pass
    valid_hash = hash_password("ValidSecurePass123!")
    assert verify_password("ValidSecurePass123!", valid_hash) is True


def test_valid_login_and_role_access_control(client, db_session):
    """
    Test positive control: valid lecturer and student accounts login normally.
    Test negative control: student cannot access lecturer class creation endpoint.
    """
    # 1. Register lecturer
    dosen_res = client.post(
        "/auth/register",
        json={
            "name": "Dosen Sah",
            "email": "dosen.sah.test@example.com",
            "password": "PasswordSah123!",
            "role": "DOSEN",
        },
    )
    assert dosen_res.status_code == status.HTTP_201_CREATED
    dosen_token = dosen_res.json()["access_token"]

    # 2. Register student
    mhs_res = client.post(
        "/auth/register",
        json={
            "name": "Mahasiswa Sah",
            "email": "mhs.sah.test@example.com",
            "password": "PasswordSah123!",
            "role": "MAHASISWA",
        },
    )
    assert mhs_res.status_code == status.HTTP_201_CREATED
    mhs_token = mhs_res.json()["access_token"]

    # 3. Dosen creates class -> Allowed (201)
    create_res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={"name": "Kelas Uji Role Sah", "description": "Desc", "subject": "Math"},
    )
    assert create_res.status_code == status.HTTP_201_CREATED

    # 4. Student tries to create class -> Forbidden (403)
    forbidden_res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={"name": "Kelas Ilegal Mahasiswa"},
    )
    assert forbidden_res.status_code == status.HTTP_403_FORBIDDEN
