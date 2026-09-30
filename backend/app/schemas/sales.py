from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class SaleCreate(BaseModel):
    customer_id: int
    lead_id: int | None = None
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    sale_date: datetime | None = None
    notes: str | None = None

class SaleUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    status: str | None = Field(default=None, pattern=r"^(pending|partial|paid)$")
    sale_date: datetime | None = None
    notes: str | None = None

class SaleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    customer_id: int
    lead_id: int | None
    amount: Decimal
    status: str
    sale_date: datetime
    notes: str | None
    created_at: datetime
    paid_amount: Decimal = Decimal("0.00")
    balance_amount: Decimal = Decimal("0.00")

class SaleListResponse(BaseModel):
    items: list[SaleResponse]
    total: int
    page: int
    page_size: int

class PaymentCreate(BaseModel):
    sale_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payment_method: str | None = Field(default=None, max_length=30)
    payment_date: datetime | None = None
    reference: str | None = Field(default=None, max_length=120)

class PaymentUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    payment_method: str | None = Field(default=None, max_length=30)
    payment_date: datetime | None = None
    status: str | None = Field(default=None, pattern=r"^(pending|completed|cancelled)$")
    reference: str | None = Field(default=None, max_length=120)

class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    customer_id: int
    sale_id: int
    amount: Decimal
    payment_method: str | None
    payment_date: datetime
    status: str
    reference: str | None
