from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.limiter import limiter
from app.core.security import (
    DUMMY_HASH,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.session import get_db
from app.models import RefreshSession, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "refresh_token"
COOKIE_PATH = "/api/v1/auth"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _issue_session(db: Session, user: User, response: Response) -> TokenResponse:
    """Create a refresh session, set its cookie and return a new access token."""
    settings = get_settings()
    raw_token = generate_refresh_token()
    db.add(
        RefreshSession(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=_now() + timedelta(days=settings.refresh_token_days),
        )
    )
    db.commit()
    response.set_cookie(
        COOKIE_NAME,
        raw_token,
        max_age=settings.refresh_token_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=COOKIE_PATH,
    )
    return TokenResponse(
        access_token=create_access_token(user.id), user=UserOut.model_validate(user)
    )


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(
    request: Request,
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    if db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That username is already taken.")
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered.")

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "That username or email is already in use.")
    return _issue_session(db, user, response)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    # Always verify a hash, so response time does not reveal whether the email exists.
    valid = verify_password(payload.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not valid:
        raise _unauthorized("Invalid email or password.")
    return _issue_session(db, user, response)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def refresh(
    request: Request, response: Response, db: Session = Depends(get_db)
) -> TokenResponse:
    raw_token = request.cookies.get(COOKIE_NAME)
    if not raw_token:
        raise _unauthorized("Not authenticated.")

    session = db.scalar(
        select(RefreshSession).where(RefreshSession.token_hash == hash_token(raw_token))
    )
    if session is None:
        raise _unauthorized("Invalid session.")

    now = _now()
    if session.revoked_at is not None:
        # A revoked token was presented again: assume theft and end every session.
        db.execute(
            update(RefreshSession)
            .where(RefreshSession.user_id == session.user_id, RefreshSession.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        db.commit()
        raise _unauthorized("Invalid session.")
    if session.expires_at <= now:
        raise _unauthorized("Session expired.")

    user = db.get(User, session.user_id)
    if user is None:
        raise _unauthorized("Invalid session.")

    session.revoked_at = now  # rotation: the old token can never be used again
    return _issue_session(db, user, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, db: Session = Depends(get_db)) -> Response:
    raw_token = request.cookies.get(COOKIE_NAME)
    if raw_token:
        session = db.scalar(
            select(RefreshSession).where(RefreshSession.token_hash == hash_token(raw_token))
        )
        if session is not None and session.revoked_at is None:
            session.revoked_at = _now()
            db.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH)
    return response


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
