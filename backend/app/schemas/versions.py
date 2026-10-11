from datetime import datetime

from pydantic import BaseModel, ConfigDict, StringConstraints
from typing import Annotated

from app.schemas.projects import FileOut

Message = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class CreateVersionRequest(BaseModel):
    message: Message = ""


class VersionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version_number: int
    message: str
    is_auto: bool
    created_at: datetime
    file_count: int


class VersionDetail(VersionSummary):
    files: list[FileOut]
