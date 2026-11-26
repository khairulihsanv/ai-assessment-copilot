import time
from collections import defaultdict
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.enums import Role
from app.models.models import User
from app.security.tokens import decode_access_token

security_bearer = HTTPBearer(auto_error=False)


# In-memory rate limiter for login
class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.attempts: defaultdict[str, list[float]] = defaultdict(list)
        self._last_sweep = time.time()

    def _sweep(self, now: float) -> None:
        """Forget keys with no recent attempts, so random emails cannot grow memory forever."""
        if now - self._last_sweep < self.window_seconds:
            return
        self._last_sweep = now
        for key in [k for k, times in self.attempts.items() if not times or now - times[-1] >= self.window_seconds]:
            del self.attempts[key]

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        self._sweep(now)
        # Clean older entries
        self.attempts[key] = [t for t in self.attempts[key] if now - t < self.window_seconds]
        if len(self.attempts[key]) >= self.max_requests:
            return False
        self.attempts[key].append(now)
        return True


login_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)


def extract_token(request: Request, creds: HTTPAuthorizationCredentials | None = None) -> str | None:
    """Extract token from Authorization header or cookie."""
    if creds and creds.credentials:
        return creds.credentials

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    # Fallback to cookies
    cookie_token = (
        request.cookies.get("dexa_session")
        or request.cookies.get("session_token")
        or request.cookies.get("authjs.session-token")
    )
    if cookie_token:
        return cookie_token

    return None


UPLOAD_SCOPE = "upload"


def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Authenticate request via JWT token and resolve against database.
    Strictly rejects invalid signatures, expired tokens, invalid claims,
    and nonexistent users. Never fabricates dummy in-memory users.
    Scoped tokens (see ``get_upload_user``) are refused here.
    """
    return _authenticate(request, creds, db, allow_upload_scope=False)


def get_upload_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Like ``get_current_user``, but also accepts an upload ticket for this exact path.

    Vercel caps a request body that passes through the frontend at about 4.5 MB, so the
    browser uploads large files straight to the backend. It gets a short-lived ticket
    (``scope: upload``, ``path``) from the frontend for that one upload, not its session.
    """
    return _authenticate(request, creds, db, allow_upload_scope=True)


def _authenticate(
    request: Request,
    creds: HTTPAuthorizationCredentials | None,
    db: Session,
    allow_upload_scope: bool,
) -> User:
    token = extract_token(request, creds)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid signature, expired token, or invalid issuer/audience",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scope = payload.get("scope")
    if scope is not None:
        # A ticket opens one upload endpoint and nothing else.
        if not (allow_upload_scope and scope == UPLOAD_SCOPE and payload.get("path") == request.url.path):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token unggah tidak berlaku untuk permintaan ini",
                headers={"WWW-Authenticate": "Bearer"},
            )

    user_id = payload.get("sub") or payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Strictly verify user exists in database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in database or access revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # User's role and permissions are strictly derived from the validated database record
    return user


def require_roles(allowed_roles: list[Role]) -> Callable:
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Akses khusus untuk role {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker


require_dosen = require_roles([Role.DOSEN])
require_mahasiswa = require_roles([Role.MAHASISWA])
