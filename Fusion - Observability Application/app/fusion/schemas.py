from datetime import datetime
from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    value: float = Field(ge=0)


class ItemRead(BaseModel):
    id: int
    name: str
    value: float
    created_at: datetime
    model_config = {"from_attributes": True}
