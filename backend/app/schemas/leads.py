from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class LeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=3, max_length=30)
    email: str | None = None
    company: str | None = None
    source_id: int | None = None
    status_id: int | None = None
    assigned_to: int | None = None
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    interested_service: str | None = None
    estimated_value: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None

class LeadUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, min_length=3, max_length=30)
    email: str | None = None
    company: str | None = None
    source_id: int | None = None
    status_id: int | None = None
    assigned_to: int | None = None
    priority: str | None = Field(default=None, pattern="^(low|medium|high)$")
    interested_service: str | None = None
    estimated_value: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None

class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    assigned_to: int | None
    source_id: int | None
    status_id: int | None
    name: str
    phone: str
    email: str | None
    company: str | None
    priority: str
    interested_service: str | None
    estimated_value: Decimal | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

class LeadListResponse(BaseModel):
    items: list[LeadResponse]
    total: int
    page: int
    page_size: int
