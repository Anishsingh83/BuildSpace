from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.limiter import limiter
from app.db.session import get_db
from app.models import User
from app.schemas.projects import ProjectDetail
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
    project = public_service.get_public_project(db, slug)
    parent = public_service.public_parent(db, project)
    return PublicProjectDetail.from_project(project, parent)


@router.post(
    "/projects/{slug}/fork", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED
)
@limiter.limit("20/minute")
def fork_project(
    request: Request,
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectDetail:
    fork = public_service.fork_project(db, user, slug)
    return ProjectDetail.from_project(fork)
