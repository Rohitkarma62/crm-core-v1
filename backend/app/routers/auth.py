from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import Business, Role, User
from ..models.crm import LeadStatus
from .pipeline import DEFAULT_STAGES
from ..schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse, BusinessResponse
from ..utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def build_response(user: User, business: Business) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user_id=user.id, business_id=business.id),
        user=UserResponse.model_validate(user),
        business=BusinessResponse.model_validate(business),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    business = Business(
        name=payload.business_name.strip(),
        email=payload.email.lower(),
        phone=payload.phone,
        industry=payload.industry,
    )
    db.add(business)
    db.flush()

    role = Role(
        business_id=business.id,
        name="Admin",
        permissions={"all": True},
    )
    db.add(role)
    for stage_name, color, sort_order, is_final in DEFAULT_STAGES:
        db.add(LeadStatus(business_id=business.id, name=stage_name, color=color, sort_order=sort_order, is_final=is_final))
    db.flush()

    user = User(
        business_id=business.id,
        role_id=role.id,
        name=payload.name.strip(),
        email=payload.email.lower(),
        phone=payload.phone,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(business)
    return build_response(user, business)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    user.last_login = datetime.utcnow()
    db.commit()
    business = db.get(Business, user.business_id)
    return build_response(user, business)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user
