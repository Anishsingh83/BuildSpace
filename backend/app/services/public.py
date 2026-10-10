from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, contains_eager, joinedload, selectinload

from app.models import Project, User, Visibility


def get_public_project(db: Session, slug: str) -> Project:
    """Return a project only if it is public. Private and unknown look identical."""
    project = db.scalar(
        select(Project)
        .options(joinedload(Project.owner), selectinload(Project.files))
        .where(Project.slug == slug, Project.visibility == Visibility.public)
    )
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found.")
    return project


def _like_pattern(text: str) -> str:
    escaped = text.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def list_public_projects(
    db: Session, q: str | None, sort: str, limit: int, offset: int
) -> list[Project]:
    stmt = (
        select(Project)
        .join(Project.owner)
        .options(contains_eager(Project.owner))
        .where(Project.visibility == Visibility.public)
    )
    if q and q.strip():
        pattern = _like_pattern(q)
        stmt = stmt.where(
            or_(
                Project.title.ilike(pattern, escape="\\"),
                Project.description.ilike(pattern, escape="\\"),
                User.username.ilike(pattern, escape="\\"),
            )
        )
    if sort == "title":
        stmt = stmt.order_by(func.lower(Project.title), Project.id)
    else:
        stmt = stmt.order_by(Project.updated_at.desc(), Project.id)
    return list(db.scalars(stmt.limit(limit).offset(offset)))
