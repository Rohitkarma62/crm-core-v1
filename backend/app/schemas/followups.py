from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class FollowUpCreate(BaseModel):
    lead_id: int
    scheduled_at: datetime
    assigned_to: int | None = None
    notes: str | None = None

class FollowUpUpdate(BaseModel):
    scheduled_at: datetime | None = None
    assigned_to: int | None = None
    notes: str | None = None
    status: str | None = Field(default=None, pattern=r"^(pending|completed|cancelled)$")

class FollowUpResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    lead_id: int
    assigned_to: int | None
    scheduled_at: datetime
    notes: str | None
    status: str
    completed_at: datetime | None
    created_at: datetime

class FollowUpListResponse(BaseModel):
    items: list[FollowUpResponse]
    total: int
    page: int
    page_size: int
