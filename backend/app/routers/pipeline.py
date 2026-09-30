from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Lead, LeadStatus, Activity
from ..schemas.pipeline import PipelineResponse, PipelineColumnResponse, PipelineLeadResponse, PipelineStageResponse, MoveLeadRequest

router = APIRouter(prefix="/api/v1/pipeline", tags=["Pipeline"])

DEFAULT_STAGES = [
    ("New", "#64748b", 10, False),
    ("Contacted", "#2563eb", 20, False),
    ("Interested", "#7c3aed", 30, False),
    ("Follow-up", "#d97706", 40, False),
    ("Negotiation", "#db2777", 50, False),
    ("Converted", "#16a34a", 60, True),
    ("Lost", "#dc2626", 70, True),
]

def ensure_default_stages(db: Session, business_id: int):
    existing = db.scalars(select(LeadStatus).where(LeadStatus.business_id == business_id).order_by(LeadStatus.sort_order)).all()
    if existing:
        return existing
    stages = [LeadStatus(business_id=business_id, name=n, color=c, sort_order=o, is_final=f) for n,c,o,f in DEFAULT_STAGES]
    db.add_all(stages)
    db.commit()
    return db.scalars(select(LeadStatus).where(LeadStatus.business_id == business_id).order_by(LeadStatus.sort_order)).all()

@router.get("", response_model=PipelineResponse)
def get_pipeline(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stages = ensure_default_stages(db, user.business_id)
    leads = db.scalars(select(Lead).where(Lead.business_id == user.business_id).order_by(Lead.created_at.desc())).all()
    by_stage = {stage.id: [] for stage in stages}
    for lead in leads:
        if lead.status_id in by_stage:
            by_stage[lead.status_id].append(PipelineLeadResponse(
                id=lead.id, name=lead.name, phone=lead.phone, company=lead.company,
                priority=lead.priority, interested_service=lead.interested_service,
                estimated_value=float(lead.estimated_value) if lead.estimated_value is not None else None,
                status_id=lead.status_id, assigned_to=lead.assigned_to,
            ))
    return PipelineResponse(columns=[PipelineColumnResponse(
        stage=PipelineStageResponse.model_validate(stage), leads=by_stage[stage.id]
    ) for stage in stages])

@router.put("/leads/{lead_id}/move", response_model=PipelineLeadResponse)
def move_lead(lead_id: int, payload: MoveLeadRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.business_id == user.business_id))
    if not lead:
        raise HTTPException(404, "Lead not found")
    target = db.scalar(select(LeadStatus).where(LeadStatus.id == payload.status_id, LeadStatus.business_id == user.business_id))
    if not target:
        raise HTTPException(400, "Invalid pipeline stage")
    old_stage = db.scalar(select(LeadStatus).where(LeadStatus.id == lead.status_id, LeadStatus.business_id == user.business_id)) if lead.status_id else None
    lead.status_id = target.id
    db.add(Activity(
        business_id=user.business_id, lead_id=lead.id, user_id=user.id,
        type="STATUS_CHANGE", description=f"Stage changed from {old_stage.name if old_stage else 'Unassigned'} to {target.name}"
    ))
    db.commit(); db.refresh(lead)
    return PipelineLeadResponse(
        id=lead.id, name=lead.name, phone=lead.phone, company=lead.company,
        priority=lead.priority, interested_service=lead.interested_service,
        estimated_value=float(lead.estimated_value) if lead.estimated_value is not None else None,
        status_id=lead.status_id, assigned_to=lead.assigned_to,
    )
