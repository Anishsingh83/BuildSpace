from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.projects import (
    CreateProjectRequest,
    ProjectDetail,
    ProjectSummary,
    SaveFilesRequest,
    UpdateProjectRequest,
)
from app.services import projects as project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: CreateProjectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectDetail:
    project = project_service.create_project(db, user, payload)
    return ProjectDetail.from_project(project)


@router.get("", response_model=list[ProjectSummary])
def list_projects(
    q: str | None = Query(default=None, max_length=100),
    sort: Literal["updated", "title"] = "updated",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProjectSummary]:
    projects = project_service.list_projects(db, user, q, sort)
    return [ProjectSummary.model_validate(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectDetail:
    project = project_service.get_owned_project(db, user, project_id)
    return ProjectDetail.from_project(project)


@router.patch("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: str,
    payload: UpdateProjectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectDetail:
    project = project_service.get_owned_project(db, user, project_id)
    project = project_service.update_project(db, project, payload)
    return ProjectDetail.from_project(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    project = project_service.get_owned_project(db, user, project_id)
    project_service.delete_project(db, project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{project_id}/duplicate", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED
)
def duplicate_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectDetail:
    source = project_service.get_owned_project(db, user, project_id)
    copy = project_service.duplicate_project(db, user, source)
    return ProjectDetail.from_project(copy)


@router.put("/{project_id}/files", response_model=ProjectDetail)
def save_files(
    project_id: str,
    payload: SaveFilesRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectDetail:
    project = project_service.get_owned_project(db, user, project_id)
    project = project_service.save_files(db, project, payload.files)
    return ProjectDetail.from_project(project)
