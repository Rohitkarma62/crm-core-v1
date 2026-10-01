from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Lead, LeadSource, LeadStatus
from ..schemas.leads import LeadCreate, LeadListResponse, LeadResponse, LeadUpdate

router = APIRouter(prefix="/api/v1/leads", tags=["Leads"])


def ensure_refs(payload, user: User, db: Session):
    if payload.assigned_to is not None:
        staff = db.scalar(select(User).where(User.id == payload.assigned_to, User.business_id == user.business_id))
        if not staff:
            raise HTTPException(400, "Assigned user does not belong to this business")
    if payload.source_id is not None:
        source = db.scalar(select(LeadSource).where(LeadSource.id == payload.source_id, LeadSource.business_id == user.business_id))
        if not source:
            raise HTTPException(400, "Invalid lead source")
    if payload.status_id is not None:
        lead_status = db.scalar(select(LeadStatus).where(LeadStatus.id == payload.status_id, LeadStatus.business_id == user.business_id))
        if not lead_status:
            raise HTTPException(400, "Invalid lead status")

@router.get("", response_model=LeadListResponse)
def list_leads(
    search: str | None = None,
    status_id: int | None = None,
    source_id: int | None = None,
    assigned_to: int | None = None,
    priority: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conditions = [Lead.business_id == user.business_id]
    if search:
        term = f"%{search.strip()}%"
        conditions.append(or_(Lead.name.ilike(term), Lead.phone.ilike(term), Lead.email.ilike(term), Lead.company.ilike(term)))
    if status_id is not None: conditions.append(Lead.status_id == status_id)
    if source_id is not None: conditions.append(Lead.source_id == source_id)
    if assigned_to is not None: conditions.append(Lead.assigned_to == assigned_to)
    if priority: conditions.append(Lead.priority == priority)
    total = db.scalar(select(func.count()).select_from(Lead).where(*conditions)) or 0
    items = db.scalars(select(Lead).where(*conditions).order_by(Lead.created_at.desc()).offset((page-1)*page_size).limit(page_size)).all()
    return LeadListResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ensure_refs(payload, user, db)
    data = payload.model_dump()
    data["business_id"] = user.business_id
    if data.get("status_id") is None:
        default_stage = db.scalar(select(LeadStatus).where(LeadStatus.business_id == user.business_id).order_by(LeadStatus.sort_order, LeadStatus.id))
        if default_stage is None:
            default_stage = LeadStatus(business_id=user.business_id, name="New", color="#64748b", sort_order=10, is_final=False)
            db.add(default_stage)
            db.flush()
        data["status_id"] = default_stage.id
    lead = Lead(**data)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead



@router.get("/export")
def export_leads_alias(
    fmt: str = "csv",
    search: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Keep the original V1 /leads/export contract while the canonical
    # import/export implementation remains under /imports/leads/export.
    from .imports import export_leads
    return export_leads(fmt=fmt, search=search, status=status, priority=priority, db=db, user=user)

@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.business_id == user.business_id))
    if not lead: raise HTTPException(404, "Lead not found")
    return lead

@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.business_id == user.business_id))
    if not lead: raise HTTPException(404, "Lead not found")
    ensure_refs(payload, user, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, key, value)
    db.commit()
    db.refresh(lead)
    return lead

@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.business_id == user.business_id))
    if not lead: raise HTTPException(404, "Lead not found")
    db.delete(lead)
    db.commit()
