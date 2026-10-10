from datetime import datetime

from pydantic import BaseModel

from app.models import Project
from app.schemas.projects import FileOut


class ForkedFrom(BaseModel):
    """Only ever built from a parent that is still public."""

    slug: str
    title: str
    author: str


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
    forked_from: ForkedFrom | None = None

    @classmethod
    def from_project(
        cls, project: Project, parent: Project | None = None
    ) -> "PublicProjectDetail":
        files = [
            FileOut(path=f.file_path, content=f.content)
            for f in sorted(project.files, key=lambda f: f.file_path)
        ]
        forked_from = (
            ForkedFrom(slug=parent.slug, title=parent.title, author=parent.owner.username)
            if parent is not None
            else None
        )
        return cls(
            slug=project.slug,
            title=project.title,
            description=project.description,
            author=project.owner.username,
            created_at=project.created_at,
            updated_at=project.updated_at,
            files=files,
            forked_from=forked_from,
        )
