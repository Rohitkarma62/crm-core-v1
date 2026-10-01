from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import Business, Role, User
from ..models.crm import LeadStatus
from ..models.billing import BusinessAsset
from .pipeline import DEFAULT_STAGES
from ..schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse, BusinessResponse

REGISTRATION_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}

async def read_registration_asset(file: UploadFile, label: str):
    if file.content_type not in REGISTRATION_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"{label} must be PNG, JPG or WEBP")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail=f"{label} is required")
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"{label} is too large (max 5 MB)")
    return file.filename or label.lower().replace(" ", "-"), file.content_type, data
from ..utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def build_response(user: User, business: Business) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user_id=user.id, business_id=business.id),
        user=UserResponse.model_validate(user),
        business=BusinessResponse.model_validate(business),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    business_name: str = Form(..., min_length=2, max_length=150),
    name: str = Form(..., min_length=2, max_length=120),
    owner_name: str = Form(..., min_length=2, max_length=120),
    email: str = Form(...),
    password: str = Form(..., min_length=8, max_length=128),
    phone: str | None = Form(default=None, max_length=30),
    address: str | None = Form(default=None),
    gstin: str | None = Form(default=None, max_length=30),
    industry: str | None = Form(default=None, max_length=100),
    logo: UploadFile = File(...),
    signature: UploadFile = File(...),
    stamp: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    email_value = email.strip().lower()
    existing = db.scalar(select(User).where(User.email == email_value))
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    logo_file = await read_registration_asset(logo, "Company logo")
    signature_file = await read_registration_asset(signature, "Owner signature")
    stamp_file = await read_registration_asset(stamp, "Company stamp") if stamp else None

    business = Business(
        name=business_name.strip(),
        email=email_value,
        phone=phone,
        owner_name=owner_name.strip(),
        address=address,
        gstin=gstin,
        warranty_text="इस बिल में दिए गए फैब्रिकेशन कार्य पर बिल की तारीख से 1 माह की वारंटी दी जाती है।",
        industry=industry,
    )
    db.add(business)
    db.flush()

    for kind, asset in [("logo", logo_file), ("signature", signature_file), ("stamp", stamp_file)]:
        if asset:
            filename, content_type, data = asset
            db.add(BusinessAsset(
                business_id=business.id,
                kind=kind,
                filename=filename,
                content_type=content_type,
                data=data,
            ))

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
        name=name.strip(),
        email=email_value,
        phone=phone,
        password_hash=hash_password(password),
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
