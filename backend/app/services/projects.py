import re
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Project, ProjectFile, User, Visibility
from app.schemas.projects import CreateProjectRequest, FileIn, UpdateProjectRequest

MAX_PROJECTS_PER_USER = 50

BLANK_FILES: list[tuple[str, str]] = [
    (
        "index.html",
        """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My Project</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1>Hello, BuildSpace!</h1>
    <button id="btn">Click me</button>
    <script src="script.js"></script>
  </body>
</html>
""",
    ),
    (
        "styles.css",
        """body {
  font-family: system-ui, sans-serif;
  text-align: center;
  padding: 2rem;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}
""",
    ),
    (
        "script.js",
        """document.getElementById('btn').addEventListener('click', () => {
  alert('It works!');
});
""",
    ),
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:50].strip("-")
    return slug or "project"


def _unique_slug(db: Session, title: str) -> str:
    base = _slugify(title)
    for _ in range(5):
        candidate = f"{base}-{secrets.token_hex(4)}"
        if db.scalar(select(Project.id).where(Project.slug == candidate)) is None:
            return candidate
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create a unique link.")


def _ensure_quota(db: Session, user: User) -> None:
    count = db.scalar(
        select(func.count()).select_from(Project).where(Project.owner_id == user.id)
    )
    if (count or 0) >= MAX_PROJECTS_PER_USER:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"You can have at most {MAX_PROJECTS_PER_USER} projects. Delete one to make room.",
        )


def get_owned_project(db: Session, user: User, project_id: str) -> Project:
    """Load a project only if the user owns it; otherwise act as if it does not exist."""
    project = db.scalar(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found.")
    return project


def create_project(db: Session, user: User, payload: CreateProjectRequest) -> Project:
    _ensure_quota(db, user)
    project = Project(
        owner_id=user.id,
        title=payload.title,
        slug=_unique_slug(db, payload.title),
        description=payload.description,
        visibility=payload.visibility,
    )
    project.files = [ProjectFile(file_path=p, content=c) for p, c in BLANK_FILES]
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def list_projects(db: Session, user: User, q: str | None, sort: str) -> list[Project]:
    stmt = select(Project).where(Project.owner_id == user.id)
    if q and q.strip():
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        stmt = stmt.where(
            or_(
                Project.title.ilike(pattern, escape="\\"),
                Project.description.ilike(pattern, escape="\\"),
            )
        )
    if sort == "title":
        stmt = stmt.order_by(func.lower(Project.title))
    else:
        stmt = stmt.order_by(Project.updated_at.desc())
    return list(db.scalars(stmt))


def update_project(db: Session, project: Project, payload: UpdateProjectRequest) -> Project:
    if payload.title is not None:
        project.title = payload.title
    if payload.description is not None:
        project.description = payload.description
    if payload.visibility is not None:
        project.visibility = payload.visibility
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project) -> None:
    db.delete(project)
    db.commit()


def duplicate_project(db: Session, user: User, source: Project) -> Project:
    _ensure_quota(db, user)
    copy = Project(
        owner_id=user.id,
        title=f"{source.title[:52]} (copy)",
        slug=_unique_slug(db, source.title),
        description=source.description,
        visibility=Visibility.private,
    )
    copy.files = [ProjectFile(file_path=f.file_path, content=f.content) for f in source.files]
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy


def save_files(db: Session, project: Project, files: list[FileIn]) -> Project:
    """Make the stored files match the given list (update, add, delete) in one transaction."""
    incoming = {f.path: f.content for f in files}
    existing = {f.file_path: f for f in project.files}

    for path, stored in existing.items():
        if path not in incoming:
            db.delete(stored)
        elif stored.content != incoming[path]:
            stored.content = incoming[path]
    for path, content in incoming.items():
        if path not in existing:
            project.files.append(ProjectFile(file_path=path, content=content))

    project.updated_at = _now()
    db.commit()
    db.refresh(project)
    return project
