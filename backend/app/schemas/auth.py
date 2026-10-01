from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterRequest(BaseModel):
    business_name: str = Field(min_length=2, max_length=150)
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=30)
    industry: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_id: int
    name: str
    email: EmailStr
    phone: str | None
    role_id: int | None


class BusinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr | None
    phone: str | None
    industry: str | None
    timezone: str
    owner_name: str | None = None
    address: str | None = None
    gstin: str | None = None
    invoice_prefix: str = "INV"
    warranty_text: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    business: BusinessResponse
