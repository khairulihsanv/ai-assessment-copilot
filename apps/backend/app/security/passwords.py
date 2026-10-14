import bcrypt


def verify_password(plain_password: str, hashed_password: str, email: str = "") -> bool:
    """
    Verify plain password against hashed password.
    Supports bcrypt hashes ($2a$, $2b$, $2y$) created by bcryptjs or passlib.
    Includes fallback for demo accounts for backward convenience.
    """
    if not plain_password or not hashed_password:
        return False

    try:
        # Standard bcrypt check
        plain_bytes = plain_password.encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        if bcrypt.checkpw(plain_bytes, hash_bytes):
            return True
    except Exception:
        pass

    # Convenience fallback for demo accounts (matching existing auth.ts logic)
    if email == "dosen.demo@example.com" and plain_password in ("dosen123", "Dosen@12345"):
        return True
    if email == "mahasiswa.demo@example.com" and plain_password in ("mhs123", "Mhs@12345"):
        return True

    return False


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")
