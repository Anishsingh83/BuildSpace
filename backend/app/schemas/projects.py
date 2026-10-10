from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from app.models import Project, Visibility
from app.services.paths import validate_file_set

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class CreateProjectRequest(BaseModel):
    title: Title
    description: Description = ""
    visibility: Visibility = Visibility.private


class UpdateProjectRequest(BaseModel):
    title: Title | None = None
    description: Description | None = None
    visibility: Visibility | None = None


class FileIn(BaseModel):
    path: str
    content: str = ""


class SaveFilesRequest(BaseModel):
    files: list[FileIn]

    @field_validator("files")
    @classmethod
    def check_files(cls, files: list[FileIn]) -> list[FileIn]:
        validate_file_set([(f.path, f.content) for f in files])
        return files


class FileOut(BaseModel):
    path: str
    content: str


class ProjectSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    slug: str
    description: str
    visibility: Visibility
    forked_from_id: str | None
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectSummary):
    files: list[FileOut]

    @classmethod
    def from_project(cls, project: Project) -> "ProjectDetail":
        base = ProjectSummary.model_validate(project).model_dump()
        files = [
            FileOut(path=f.file_path, content=f.content)
            for f in sorted(project.files, key=lambda f: f.file_path)
        ]
        return cls(**base, files=files)
