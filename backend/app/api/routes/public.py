from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.db.session import get_db
from app.schemas.public import PublicProjectDetail, PublicProjectSummary
from app.services import public as public_service

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/projects", response_model=list[PublicProjectSummary])
@limiter.limit("120/minute")
def list_projects(
    request: Request,
    response: Response,
    q: str | None = Query(default=None, max_length=100),
    sort: Literal["updated", "title"] = "updated",
    limit: int = Query(default=24, ge=1, le=50),
    offset: int = Query(default=0, ge=0, le=10000),
    db: Session = Depends(get_db),
) -> list[PublicProjectSummary]:
    # no-store: a project made private again must not linger in any cache.
    response.headers["Cache-Control"] = "no-store"
    projects = public_service.list_public_projects(db, q, sort, limit, offset)
    return [PublicProjectSummary.from_project(p) for p in projects]


@router.get("/projects/{slug}", response_model=PublicProjectDetail)
@limiter.limit("120/minute")
def get_project(
    request: Request,
    response: Response,
    slug: str,
    db: Session = Depends(get_db),
) -> PublicProjectDetail:
    response.headers["Cache-Control"] = "no-store"
    return PublicProjectDetail.from_project(public_service.get_public_project(db, slug))
