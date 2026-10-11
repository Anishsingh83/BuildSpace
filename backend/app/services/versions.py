from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Project, ProjectFile, ProjectVersion, User
from app.schemas.projects import FileIn
from app.schemas.versions import VersionDetail, VersionSummary
from app.services.paths import validate_file_set
from app.services.projects import save_files

MAX_VERSIONS_PER_PROJECT = 50


def _files_of(version: ProjectVersion) -> list[dict[str, str]]:
    return list(version.snapshot.get("files", []))


def to_summary(version: ProjectVersion) -> VersionSummary:
    return VersionSummary(
        id=version.id,
        version_number=version.version_number,
        message=version.message,
        is_auto=version.is_auto,
        created_at=version.created_at,
        file_count=len(_files_of(version)),
    )


def to_detail(version: ProjectVersion) -> VersionDetail:
    files = sorted(_files_of(version), key=lambda f: f["path"])
    return VersionDetail(**to_summary(version).model_dump(), files=files)


def get_owned_version(db: Session, project: Project, version_id: str) -> ProjectVersion:
    """Load a version only if it belongs to this (already ownership-checked) project."""
    version = db.scalar(
        select(ProjectVersion).where(
            ProjectVersion.id == version_id, ProjectVersion.project_id == project.id
        )
    )
    if version is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found.")
    return version


def list_versions(db: Session, project: Project) -> list[ProjectVersion]:
    return list(
        db.scalars(
            select(ProjectVersion)
            .where(ProjectVersion.project_id == project.id)
            .order_by(ProjectVersion.version_number.desc())
        )
    )


def _make_room(db: Session, project: Project) -> None:
    """Keep the project at or under the cap by pruning the oldest automatic versions."""
    count = db.scalar(
        select(func.count()).select_from(ProjectVersion).where(ProjectVersion.project_id == project.id)
    ) or 0
    excess = count - MAX_VERSIONS_PER_PROJECT + 1
    if excess <= 0:
        return
    oldest_auto = list(
        db.scalars(
            select(ProjectVersion)
            .where(ProjectVersion.project_id == project.id, ProjectVersion.is_auto.is_(True))
            .order_by(ProjectVersion.version_number)
            .limit(excess)
        )
    )
    if len(oldest_auto) < excess:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This project already has {MAX_VERSIONS_PER_PROJECT} saved versions. "
            "Delete an old version to make room.",
        )
    for old in oldest_auto:
        db.delete(old)
    db.flush()


def create_snapshot(
    db: Session, project: Project, user: User, message: str, is_auto: bool = False
) -> ProjectVersion:
    _make_room(db, project)
    next_number = (
        db.scalar(
            select(func.max(ProjectVersion.version_number)).where(
                ProjectVersion.project_id == project.id
            )
        )
        or 0
    ) + 1
    version = ProjectVersion(
        project_id=project.id,
        version_number=next_number,
        message=message,
        is_auto=is_auto,
        created_by=user.id,
        snapshot={
            "files": [
                {"path": f.file_path, "content": f.content}
                for f in sorted(project.files, key=lambda f: f.file_path)
            ]
        },
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


def delete_version(db: Session, version: ProjectVersion) -> None:
    db.delete(version)
    db.commit()


def restore_version(db: Session, project: Project, user: User, version: ProjectVersion) -> Project:
    files = _files_of(version)
    try:
        validate_file_set([(f["path"], f["content"]) for f in files])
    except ValueError as exc:
        raise HTTPException(
            422,
            f"This version can no longer be restored: {exc}",
        ) from exc

    # Safety net: the current state is saved first, so a restore never loses work.
    create_snapshot(
        db, project, user, f"Before restoring version {version.version_number}", is_auto=True
    )
    db.refresh(project)
    return save_files(db, project, [FileIn(path=f["path"], content=f["content"]) for f in files])


__all__ = [
    "MAX_VERSIONS_PER_PROJECT",
    "ProjectFile",
    "create_snapshot",
    "delete_version",
    "get_owned_version",
    "list_versions",
    "restore_version",
    "to_detail",
    "to_summary",
]

