from datetime import datetime, time, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Customer, FollowUp, Lead, LeadSource, LeadStatus, Payment, Sale

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


def _count(db, model, business_id: int, *filters) -> int:
    return int(db.query(func.count(model.id)).filter(model.business_id == business_id, *filters).scalar() or 0)


def _money(value) -> float:
    return float(value or Decimal("0"))


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bid = user.business_id
    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), time.min)
    tomorrow = today_start + timedelta(days=1)

    statuses = db.query(LeadStatus.name, func.count(Lead.id)).outerjoin(
        Lead, (Lead.status_id == LeadStatus.id) & (Lead.business_id == bid)
    ).filter(LeadStatus.business_id == bid).group_by(LeadStatus.name).all()
    status_counts = {str(name).strip().lower(): int(count) for name, count in statuses}

    total_leads = _count(db, Lead, bid)
    converted = status_counts.get("converted", 0)
    total_sales = _count(db, Sale, bid)
    total_revenue = db.query(func.sum(Sale.amount)).filter(Sale.business_id == bid).scalar()
    collected = db.query(func.sum(Payment.amount)).filter(
        Payment.business_id == bid, Payment.status == "completed"
    ).scalar()
    total_revenue_f = _money(total_revenue)
    collected_f = _money(collected)

    followups_today = _count(db, FollowUp, bid,
        FollowUp.scheduled_at >= today_start,
        FollowUp.scheduled_at < tomorrow,
        FollowUp.status == "pending",
    )
    overdue = _count(db, FollowUp, bid,
        FollowUp.scheduled_at < now,
        FollowUp.status == "pending",
    )

    return {
        "total_leads": total_leads,
        "new_leads": status_counts.get("new", 0),
        "contacted_leads": status_counts.get("contacted", 0),
        "interested_leads": status_counts.get("interested", 0),
        "followup_leads": status_counts.get("follow-up", status_counts.get("followup", 0)),
        "negotiation_leads": status_counts.get("negotiation", 0),
        "converted_leads": converted,
        "lost_leads": status_counts.get("lost", 0),
        "conversion_rate": round((converted / total_leads) * 100, 2) if total_leads else 0,
        "total_customers": _count(db, Customer, bid),
        "followups_today": followups_today,
        "overdue_followups": overdue,
        "total_sales": total_sales,
        "total_revenue": total_revenue_f,
        "collected_revenue": collected_f,
        "outstanding_revenue": max(total_revenue_f - collected_f, 0),
    }


@router.get("/sources")
def sources(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(LeadSource.name, func.count(Lead.id)).outerjoin(
        Lead, (Lead.source_id == LeadSource.id) & (Lead.business_id == user.business_id)
    ).filter(LeadSource.business_id == user.business_id).group_by(LeadSource.id, LeadSource.name).order_by(func.count(Lead.id).desc()).all()
    return [{"name": name, "count": int(count)} for name, count in rows]


@router.get("/recent-leads")
def recent_leads(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Lead, LeadStatus.name).outerjoin(
        LeadStatus, Lead.status_id == LeadStatus.id
    ).filter(Lead.business_id == user.business_id).order_by(Lead.created_at.desc()).limit(8).all()
    return [
        {
            "id": lead.id,
            "name": lead.name,
            "phone": lead.phone,
            "status": status,
            "priority": lead.priority,
            "created_at": lead.created_at.isoformat(),
        }
        for lead, status in rows
    ]


@router.get("/follow-ups")
def upcoming_followups(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(FollowUp, Lead.name).join(
        Lead, (Lead.id == FollowUp.lead_id) & (Lead.business_id == user.business_id)
    ).filter(
        FollowUp.business_id == user.business_id,
        FollowUp.status == "pending",
    ).order_by(FollowUp.scheduled_at.asc()).limit(8).all()
    return [
        {
            "id": followup.id,
            "lead_id": followup.lead_id,
            "lead_name": lead_name,
            "scheduled_at": followup.scheduled_at.isoformat(),
            "status": followup.status,
            "notes": followup.notes,
        }
        for followup, lead_name in rows
    ]
