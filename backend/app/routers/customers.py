from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Activity, Customer, Lead, LeadStatus
from ..schemas.customers import CustomerCreate, CustomerListResponse, CustomerResponse, CustomerUpdate

router = APIRouter(prefix="/api/v1/customers", tags=["Customers"])

def get_customer_or_404(customer_id: int, user: User, db: Session):
    customer = db.scalar(select(Customer).where(Customer.id == customer_id, Customer.business_id == user.business_id))
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer

@router.get("", response_model=CustomerListResponse)
def list_customers(search: str | None = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conditions = [Customer.business_id == user.business_id]
    if search:
        term = f"%{search.strip()}%"
        conditions.append(or_(Customer.name.ilike(term), Customer.phone.ilike(term), Customer.email.ilike(term), Customer.company.ilike(term)))
    total = db.scalar(select(func.count()).select_from(Customer).where(*conditions)) or 0
    items = db.scalars(select(Customer).where(*conditions).order_by(Customer.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return CustomerListResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.lead_id is not None:
        lead = db.scalar(select(Lead).where(Lead.id == payload.lead_id, Lead.business_id == user.business_id))
        if not lead:
            raise HTTPException(400, "Invalid lead")
        existing = db.scalar(select(Customer).where(Customer.lead_id == lead.id, Customer.business_id == user.business_id))
        if existing:
            raise HTTPException(409, "This lead is already a customer")
    customer = Customer(business_id=user.business_id, **payload.model_dump())
    db.add(customer)
    db.commit(); db.refresh(customer)
    return customer

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_customer_or_404(customer_id, user, db)

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    customer = get_customer_or_404(customer_id, user, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    db.commit(); db.refresh(customer)
    return customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    customer = get_customer_or_404(customer_id, user, db)
    db.delete(customer); db.commit()

@router.post("/from-lead/{lead_id}", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def convert_lead_to_customer(lead_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.business_id == user.business_id))
    if not lead:
        raise HTTPException(404, "Lead not found")
    existing = db.scalar(select(Customer).where(Customer.lead_id == lead.id, Customer.business_id == user.business_id))
    if existing:
        raise HTTPException(409, "Lead is already converted to a customer")

    customer = Customer(
        business_id=user.business_id,
        lead_id=lead.id,
        name=lead.name,
        phone=lead.phone,
        email=lead.email,
        company=lead.company,
    )
    db.add(customer)
    db.flush()

    converted_status = db.scalar(select(LeadStatus).where(
        LeadStatus.business_id == user.business_id,
        func.lower(LeadStatus.name) == "converted"
    ))
    if converted_status:
        lead.status_id = converted_status.id
    db.add(Activity(business_id=user.business_id, lead_id=lead.id, user_id=user.id, type="CONVERSION", description=f"Lead converted to customer #{customer.id}"))
    db.commit(); db.refresh(customer)
    return customer
