from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=3, max_length=30)
    email: str | None = None
    company: str | None = None
    address: str | None = None
    lead_id: int | None = None

class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, min_length=3, max_length=30)
    email: str | None = None
    company: str | None = None
    address: str | None = None

class CustomerPayment(BaseModel):
    id: int
    sale_id: int
    amount: float
    payment_method: str | None
    payment_date: datetime
    status: str
    reference: str | None

class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    lead_id: int | None
    name: str
    phone: str
    email: str | None
    company: str | None
    address: str | None
    created_at: datetime
    updated_at: datetime
    total_sales: float = 0
    collected: float = 0
    outstanding: float = 0
    payment_breakup: list[dict] = []
    payment_history: list[CustomerPayment] = []

class CustomerListResponse(BaseModel):
    items: list[CustomerResponse]
    total: int
    page: int
    page_size: int
