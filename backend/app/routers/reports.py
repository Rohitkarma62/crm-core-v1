from datetime import datetime, time
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Lead, LeadStatus, LeadSource, Sale, Payment, FollowUp, Customer

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])

def date_filter(column, start_date, end_date):
    filters = []
    if start_date:
        filters.append(column >= datetime.combine(start_date, time.min))
    if end_date:
        filters.append(column <= datetime.combine(end_date, time.max))
    return filters

def parse_dates(start_date: str | None, end_date: str | None):
    start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else None
    end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None
    return start, end

def money(v):
    return float(v or Decimal("0"))

@router.get("/leads")
def lead_report(
    start_date: str | None = Query(None), end_date: str | None = Query(None),
    status: str | None = Query(None), source_id: int | None = Query(None),
    priority: str | None = Query(None), db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    start, end = parse_dates(start_date, end_date)
    filters = [Lead.business_id == user.business_id, *date_filter(Lead.created_at, start, end)]
    if status: filters.append(func.lower(LeadStatus.name) == status.lower())
    if source_id: filters.append(Lead.source_id == source_id)
    if priority: filters.append(func.lower(Lead.priority) == priority.lower())
    total = db.query(func.count(Lead.id)).join(LeadStatus, Lead.status_id == LeadStatus.id, isouter=True).filter(*filters).scalar() or 0
    converted = db.query(func.count(Lead.id)).join(LeadStatus, Lead.status_id == LeadStatus.id).filter(*filters, func.lower(LeadStatus.name) == "converted").scalar() or 0
    lost = db.query(func.count(Lead.id)).join(LeadStatus, Lead.status_id == LeadStatus.id).filter(*filters, func.lower(LeadStatus.name) == "lost").scalar() or 0
    statuses = db.query(LeadStatus.name, func.count(Lead.id)).join(Lead, Lead.status_id == LeadStatus.id).filter(*filters).group_by(LeadStatus.name).order_by(func.count(Lead.id).desc()).all()
    sources = db.query(LeadSource.name, func.count(Lead.id)).join(Lead, Lead.source_id == LeadSource.id).filter(*filters).group_by(LeadSource.name).order_by(func.count(Lead.id).desc()).all()
    priorities = db.query(Lead.priority, func.count(Lead.id)).filter(*filters).group_by(Lead.priority).order_by(func.count(Lead.id).desc()).all()
    return {"total": total, "converted": converted, "lost": lost, "conversion_rate": round(converted / total * 100, 2) if total else 0, "by_status": [{"name": n or "Unassigned", "count": c} for n,c in statuses], "by_source": [{"name": n or "Unknown", "count": c} for n,c in sources], "by_priority": [{"name": n or "Unknown", "count": c} for n,c in priorities]}

@router.get("/sales")
def sales_report(
    start_date: str | None = Query(None), end_date: str | None = Query(None),
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    start, end = parse_dates(start_date, end_date)
    filters = [Sale.business_id == user.business_id, *date_filter(Sale.sale_date, start, end)]
    rows = db.query(Sale).filter(*filters).order_by(Sale.sale_date.desc()).all()
    sale_ids = [s.id for s in rows]
    payments = db.query(Payment).filter(Payment.business_id == user.business_id, Payment.sale_id.in_(sale_ids), Payment.status == "completed").all() if sale_ids else []
    paid_by_sale = {}
    for p in payments: paid_by_sale[p.sale_id] = paid_by_sale.get(p.sale_id, 0) + money(p.amount)
    total_value = sum(money(s.amount) for s in rows)
    collected = sum(paid_by_sale.values())
    by_status = {}
    by_day = {}
    for s in rows:
        paid = paid_by_sale.get(s.id, 0); key = "paid" if paid >= money(s.amount) else ("partial" if paid > 0 else "pending")
        by_status[key] = by_status.get(key, {"count":0,"value":0})
        by_status[key]["count"] += 1; by_status[key]["value"] += money(s.amount)
        day = s.sale_date.strftime("%Y-%m-%d"); by_day.setdefault(day, {"sales":0,"value":0,"collected":0}); by_day[day]["sales"] += 1; by_day[day]["value"] += money(s.amount); by_day[day]["collected"] += paid
    return {"total_sales":len(rows),"total_value":round(total_value,2),"collected":round(collected,2),"outstanding":round(max(total_value-collected,0),2),"average_sale":round(total_value/len(rows),2) if rows else 0,"by_status":[{"status":k,**v} for k,v in by_status.items()],"by_day":[{"date":k,**v} for k,v in sorted(by_day.items(), reverse=True)]}

@router.get("/payments")
def payment_report(
    start_date: str | None = Query(None), end_date: str | None = Query(None),
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    start, end = parse_dates(start_date, end_date)
    filters = [Payment.business_id == user.business_id, *date_filter(Payment.payment_date, start, end)]
    rows = db.query(Payment).filter(*filters).order_by(Payment.payment_date.desc()).all()
    completed_rows = [p for p in rows if p.status == "completed"]
    methods = {}; statuses = {}
    for p in rows:
        method = p.payment_method or "Other"; methods[method] = methods.get(method, 0) + money(p.amount) if p.status == "completed" else methods.get(method, 0)
        st = p.status or "unknown"; statuses[st] = statuses.get(st, 0) + money(p.amount)
    customer_ids = {p.customer_id for p in rows}
    customers = db.query(Customer).filter(Customer.business_id == user.business_id, Customer.id.in_(customer_ids)).all() if customer_ids else []
    customer_names = {c.id: c.name for c in customers}
    history = [{
        "id": p.id, "customer_id": p.customer_id, "customer_name": customer_names.get(p.customer_id, f"Customer #{p.customer_id}"),
        "sale_id": p.sale_id, "amount": round(money(p.amount), 2), "payment_method": p.payment_method or "other",
        "payment_date": p.payment_date.isoformat(), "status": p.status, "reference": p.reference
    } for p in rows]
    return {"total_payments":len(completed_rows),"total_amount":round(sum(money(p.amount) for p in completed_rows),2),"by_method":[{"name":k,"amount":round(v,2)} for k,v in sorted(methods.items(), key=lambda x:x[1], reverse=True) if v > 0],"by_status":[{"name":k,"amount":round(v,2)} for k,v in statuses.items()],"history":history}

@router.get("/staff")
def staff_report(
    start_date: str | None = Query(None), end_date: str | None = Query(None),
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    start, end = parse_dates(start_date, end_date)
    lead_filters = [Lead.business_id == user.business_id, *date_filter(Lead.created_at, start, end)]
    follow_filters = [FollowUp.business_id == user.business_id, *date_filter(FollowUp.created_at, start, end)]
    staff = db.query(User).filter(User.business_id == user.business_id, User.is_active == True).order_by(User.name).all()
    out=[]
    for u in staff:
        assigned = db.query(func.count(Lead.id)).filter(*lead_filters, Lead.assigned_to == u.id).scalar() or 0
        converted = db.query(func.count(Lead.id)).join(LeadStatus, Lead.status_id == LeadStatus.id).filter(*lead_filters, Lead.assigned_to == u.id, func.lower(LeadStatus.name) == "converted").scalar() or 0
        followups = db.query(func.count(FollowUp.id)).filter(*follow_filters, FollowUp.assigned_to == u.id).scalar() or 0
        sales = db.query(func.count(Sale.id)).join(Lead, Sale.lead_id == Lead.id).filter(Sale.business_id == user.business_id, Lead.assigned_to == u.id, *date_filter(Sale.sale_date, start, end)).scalar() or 0
        out.append({"id":u.id,"name":u.name,"assigned_leads":assigned,"converted":converted,"conversion_rate":round(converted/assigned*100,2) if assigned else 0,"followups":followups,"sales":sales})
    return {"staff":out}
