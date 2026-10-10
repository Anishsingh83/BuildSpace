from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, contains_eager, joinedload, selectinload

from app.models import Project, ProjectFile, User, Visibility
from app.services.projects import _ensure_quota, _unique_slug


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


def public_parent(db: Session, project: Project) -> Project | None:
    """The project this one was forked from, but only if it is still public."""
    if project.forked_from_id is None:
        return None
    return db.scalar(
        select(Project)
        .options(joinedload(Project.owner))
        .where(Project.id == project.forked_from_id, Project.visibility == Visibility.public)
    )


def fork_project(db: Session, user: User, slug: str) -> Project:
    source = get_public_project(db, slug)
    _ensure_quota(db, user)
    fork = Project(
        owner_id=user.id,
        title=f"{source.title[:52]} (fork)",
        slug=_unique_slug(db, source.title),
        description=source.description,
        visibility=Visibility.private,
        forked_from_id=source.id,
    )
    fork.files = [ProjectFile(file_path=f.file_path, content=f.content) for f in source.files]
    db.add(fork)
    db.commit()
    db.refresh(fork)
    return fork


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
