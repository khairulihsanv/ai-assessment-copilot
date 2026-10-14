import logging
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.models.enums import Role
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse, TokenResponse
from app.security.passwords import verify_password, hash_password
from app.security.tokens import create_access_token
from app.security.dependencies import get_current_user, login_rate_limiter

logger = logging.getLogger("auth")

auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{req.email}"

    if not login_rate_limiter.is_allowed(rate_key):
        logger.warning(f"Rate limit exceeded for login attempt from {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Terlalu banyak percobaan login. Silakan tunggu 1 menit.",
        )

    try:
        user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    except Exception as e:
        logger.error(f"Database error during login query: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gangguan koneksi database. Silakan coba sesaat lagi.",
        )

    if not user:
        logger.info(f"Failed login attempt: account not found for email {req.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah.",
        )

    if not verify_password(req.password, user.passwordHash, email=user.email):
        logger.info(f"Failed login attempt: wrong password for user_id={user.id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah.",
        )

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
    })

    # Set HttpOnly, Secure, SameSite cookie
    response.set_cookie(
        key="dexa_session",
        value=token,
        httponly=True,
        secure=False,  # Can be True in production https
        samesite="lax",
        max_age=12 * 3600,
        path="/",
    )

    return TokenResponse(
        access_token=token,
        token_type="Bearer",
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            avatarUrl=user.avatarUrl,
            createdAt=user.createdAt,
        ),
    )


@auth_router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    clean_email = req.email.lower().strip()

    # Disallow unauthorized arbitrary roles (only DOSEN or MAHASISWA)
    if req.role not in (Role.DOSEN, Role.MAHASISWA):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role registrasi tidak sah.",
        )

    try:
        existing = db.query(User).filter(User.email == clean_email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email sudah terdaftar. Silakan gunakan email lain atau login.",
            )

        hashed = hash_password(req.password)
        new_user = User(
            name=req.name.strip(),
            email=clean_email,
            passwordHash=hashed,
            role=req.role,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal memproses pendaftaran. Periksa koneksi database Anda.",
        )

    token = create_access_token({
        "sub": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "role": new_user.role.value if hasattr(new_user.role, "value") else str(new_user.role),
    })

    response.set_cookie(
        key="dexa_session",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=12 * 3600,
        path="/",
    )

    return TokenResponse(
        access_token=token,
        token_type="Bearer",
        user=UserResponse(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            role=new_user.role,
            avatarUrl=new_user.avatarUrl,
            createdAt=new_user.createdAt,
        ),
    )


@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        avatarUrl=current_user.avatarUrl,
        createdAt=current_user.createdAt,
    )


@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="dexa_session", path="/")
    return {"success": True, "message": "Berhasil logout"}
