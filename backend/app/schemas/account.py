from pydantic import BaseModel, Field, field_validator

from app.schemas.auth import USERNAME_RE


class UpdateProfileRequest(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def check_username(cls, value: str) -> str:
        value = value.strip()
        if not USERNAME_RE.match(value):
            raise ValueError("Use 3-30 letters, numbers, underscores or hyphens.")
        return value.lower()


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)
