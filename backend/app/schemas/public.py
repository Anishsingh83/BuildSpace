from datetime import datetime

from pydantic import BaseModel

from app.models import Project
from app.schemas.projects import FileOut


class PublicProjectSummary(BaseModel):
    """What anyone may see about a public project. Never add emails or ids here."""

    slug: str
    title: str
    description: str
    author: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_project(cls, project: Project) -> "PublicProjectSummary":
        return cls(
            slug=project.slug,
            title=project.title,
            description=project.description,
            author=project.owner.username,
            created_at=project.created_at,
            updated_at=project.updated_at,
        )


class PublicProjectDetail(PublicProjectSummary):
    files: list[FileOut]

    @classmethod
    def from_project(cls, project: Project) -> "PublicProjectDetail":
        files = [
            FileOut(path=f.file_path, content=f.content)
            for f in sorted(project.files, key=lambda f: f.file_path)
        ]
        return cls(
            slug=project.slug,
            title=project.title,
            description=project.description,
            author=project.owner.username,
            created_at=project.created_at,
            updated_at=project.updated_at,
            files=files,
        )
