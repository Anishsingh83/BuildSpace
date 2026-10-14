from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.auth import COOKIE_NAME, COOKIE_PATH, _issue_session
from app.core.limiter import limiter
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models import RefreshSession, User
from app.schemas.account import ChangePasswordRequest, DeleteAccountRequest, UpdateProfileRequest
from app.schemas.auth import TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["account"])

# 403 (not 401) for a wrong password: the frontend treats 401 as "session expired".
WRONG_PASSWORD = "Current password is incorrect."


@router.patch("/me", response_model=UserOut)
def update_profile(
    payload: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if payload.username == user.username:
        return user
    taken = "That username is already taken."
    if db.scalar(select(User.id).where(User.username == payload.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, taken)
    user.username = payload.username
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, taken)
    return user


@router.post("/change-password", response_model=TokenResponse)
@limiter.limit("5/minute")
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TokenResponse:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status.HTTP_403_FORBIDDEN, WRONG_PASSWORD)
    if payload.new_password == payload.current_password:
        raise HTTPException(422, "The new password must be different from the current one.")

    user.password_hash = hash_password(payload.new_password)
    # End every session, on every device, then start a fresh one for this browser.
    db.execute(
        update(RefreshSession)
        .where(RefreshSession.user_id == user.id, RefreshSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )
    db.commit()
    return _issue_session(db, user, response)


@router.post("/delete-account", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
def delete_account(
    request: Request,
    payload: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Password is incorrect.")
    # Projects, files and versions are removed by cascade; sessions by the database.
    db.delete(user)
    db.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH)
    return response
