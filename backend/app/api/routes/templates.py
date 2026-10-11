from fastapi import APIRouter
from pydantic import BaseModel

from app.services.templates import TEMPLATE_INFO

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateOut(BaseModel):
    id: str
    name: str
    description: str


@router.get("", response_model=list[TemplateOut])
def list_templates() -> list[TemplateOut]:
    return [TemplateOut(**t) for t in TEMPLATE_INFO]
