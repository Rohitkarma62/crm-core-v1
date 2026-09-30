from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Activity, FollowUp, Lead
from ..schemas.followups import FollowUpCreate, FollowUpUpdate, FollowUpResponse, FollowUpListResponse

router = APIRouter(prefix="/api/v1/follow-ups", tags=["Follow-ups"])

def get_lead_or_404(db, user, lead_id):
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.business_id == user.business_id))
    if not lead:
        raise HTTPException(404, "Lead not found")
    return lead

def validate_assignee(db, user, assigned_to):
    if assigned_to is None:
        return
    staff = db.scalar(select(User).where(User.id == assigned_to, User.business_id == user.business_id, User.is_active == True))
    if not staff:
        raise HTTPException(400, "Assigned user does not belong to this business or is inactive")

@router.get("", response_model=FollowUpListResponse)
def list_followups(
    status_filter: str | None = Query(None, alias="status", pattern=r"^(pending|completed|cancelled|overdue)$"),
    lead_id: int | None = None,
    assigned_to: int | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    conditions = [FollowUp.business_id == user.business_id]
    if lead_id is not None: conditions.append(FollowUp.lead_id == lead_id)
    if assigned_to is not None: conditions.append(FollowUp.assigned_to == assigned_to)
    if status_filter == "overdue":
        conditions.extend([FollowUp.status == "pending", FollowUp.scheduled_at < now])
    elif status_filter: conditions.append(FollowUp.status == status_filter)
    total = db.scalar(select(func.count()).select_from(FollowUp).where(*conditions)) or 0
    items = db.scalars(select(FollowUp).where(*conditions).order_by(FollowUp.scheduled_at.asc()).offset((page-1)*page_size).limit(page_size)).all()
    return FollowUpListResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_followup(payload: FollowUpCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lead = get_lead_or_404(db, user, payload.lead_id)
    validate_assignee(db, user, payload.assigned_to)
    item = FollowUp(business_id=user.business_id, lead_id=lead.id, assigned_to=payload.assigned_to or lead.assigned_to, scheduled_at=payload.scheduled_at, notes=payload.notes, status="pending")
    db.add(item)
    db.add(Activity(business_id=user.business_id, lead_id=lead.id, user_id=user.id, type="FOLLOW_UP", description=f"Follow-up scheduled for {payload.scheduled_at.isoformat()}"))
    db.commit(); db.refresh(item)
    return item

@router.get("/{followup_id}", response_model=FollowUpResponse)
def get_followup(followup_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.scalar(select(FollowUp).where(FollowUp.id == followup_id, FollowUp.business_id == user.business_id))
    if not item: raise HTTPException(404, "Follow-up not found")
    return item

@router.put("/{followup_id}", response_model=FollowUpResponse)
def update_followup(followup_id: int, payload: FollowUpUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.scalar(select(FollowUp).where(FollowUp.id == followup_id, FollowUp.business_id == user.business_id))
    if not item: raise HTTPException(404, "Follow-up not found")
    data = payload.model_dump(exclude_unset=True)
    if "assigned_to" in data: validate_assignee(db, user, data["assigned_to"])
    old_status = item.status
    for key, value in data.items(): setattr(item, key, value)
    if item.status == "completed" and old_status != "completed": item.completed_at = datetime.utcnow()
    if item.status != "completed": item.completed_at = None
    db.commit(); db.refresh(item)
    return item

@router.post("/{followup_id}/complete", response_model=FollowUpResponse)
def complete_followup(followup_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.scalar(select(FollowUp).where(FollowUp.id == followup_id, FollowUp.business_id == user.business_id))
    if not item: raise HTTPException(404, "Follow-up not found")
    item.status = "completed"; item.completed_at = datetime.utcnow()
    db.add(Activity(business_id=user.business_id, lead_id=item.lead_id, user_id=user.id, type="FOLLOW_UP", description="Follow-up completed"))
    db.commit(); db.refresh(item)
    return item
