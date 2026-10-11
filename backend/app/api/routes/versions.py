from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.projects import ProjectDetail
from app.schemas.versions import CreateVersionRequest, VersionDetail, VersionSummary
from app.services import projects as project_service
from app.services import versions as version_service

router = APIRouter(prefix="/projects/{project_id}/versions", tags=["versions"])


@router.post("", response_model=VersionSummary, status_code=status.HTTP_201_CREATED)
def create_version(
    project_id: str,
    payload: CreateVersionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VersionSummary:
    project = project_service.get_owned_project(db, user, project_id)
    version = version_service.create_snapshot(
        db, project, user, payload.message or "Saved version"
    )
    return version_service.to_summary(version)


@router.get("", response_model=list[VersionSummary])
def list_versions(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[VersionSummary]:
    project = project_service.get_owned_project(db, user, project_id)
    return [version_service.to_summary(v) for v in version_service.list_versions(db, project)]


@router.get("/{version_id}", response_model=VersionDetail)
def get_version(
    project_id: str,
    version_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VersionDetail:
    project = project_service.get_owned_project(db, user, project_id)
    return version_service.to_detail(version_service.get_owned_version(db, project, version_id))


@router.post("/{version_id}/restore", response_model=ProjectDetail)
def restore_version(
    project_id: str,
    version_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectDetail:
    project = project_service.get_owned_project(db, user, project_id)
    version = version_service.get_owned_version(db, project, version_id)
    restored = version_service.restore_version(db, project, user, version)
    return ProjectDetail.from_project(restored)


@router.delete("/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_version(
    project_id: str,
    version_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    project = project_service.get_owned_project(db, user, project_id)
    version = version_service.get_owned_version(db, project, version_id)
    version_service.delete_version(db, version)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
