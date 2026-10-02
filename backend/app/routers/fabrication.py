from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Customer, FabricationOrder, Lead

router = APIRouter(prefix="/api/v1/fabrication", tags=["Fabrication"])
STAGES = ["New Enquiry","Measurement","Quotation","Material Pending","Fabrication","Welding","Grinding","Painting","Ready","Delivered"]

def row(o):
    return {
        "id": o.id, "customer_id": o.customer_id, "lead_id": o.lead_id,
        "customer": o.customer_name, "phone": o.phone, "site": o.site,
        "work": o.work, "measurement": o.measurement, "amount": float(o.amount or 0),
        "delivery": o.delivery_date.isoformat() if o.delivery_date else "",
        "stage": o.stage, "notes": o.notes,
        "created_at": o.created_at.isoformat() if o.created_at else ""
    }

@router.get("/available-customers")
def available_customers(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    customers = db.scalars(select(Customer).where(Customer.business_id == user.business_id).order_by(Customer.name)).all()
    leads = db.scalars(select(Lead).where(Lead.business_id == user.business_id).order_by(Lead.created_at.desc())).all()
    customer_lead_ids = {c.lead_id for c in customers if c.lead_id is not None}
    items = [{"type":"customer","id":c.id,"lead_id":c.lead_id,"name":c.name,"phone":c.phone or ""} for c in customers]
    items += [{"type":"enquiry","id":l.id,"lead_id":l.id,"name":l.name,"phone":l.phone or "",
               "work":l.interested_service or "", "amount":float(l.estimated_value or 0)}
              for l in leads if l.id not in customer_lead_ids]
    return {"items": items}

@router.get("")
def list_orders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.scalars(select(FabricationOrder).where(FabricationOrder.business_id == user.business_id).order_by(FabricationOrder.created_at.desc())).all()
    return {"items": [row(o) for o in items], "stages": STAGES}

@router.post("")
def create_order(payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cid = payload.get("customer_id"); lid = payload.get("lead_id")
    if cid is not None and not db.scalar(select(Customer.id).where(Customer.id == cid, Customer.business_id == user.business_id)):
        raise HTTPException(400, "Invalid customer")
    lead = None
    if lid is not None:
        lead = db.scalar(select(Lead).where(Lead.id == lid, Lead.business_id == user.business_id))
        if not lead:
            raise HTTPException(400, "Invalid lead")
        # An enquiry becomes a customer automatically when its first work order is created.
        if cid is None:
            customer = db.scalar(select(Customer).where(Customer.business_id == user.business_id, Customer.lead_id == lead.id))
            if not customer:
                customer = Customer(
                    business_id=user.business_id, lead_id=lead.id, name=lead.name,
                    phone=lead.phone, email=lead.email, company=lead.company, address=None
                )
                db.add(customer); db.flush()
            cid = customer.id
    try:
        amount = Decimal(str(payload.get("amount") or 0))
        delivery = datetime.fromisoformat(payload["delivery"]) if payload.get("delivery") else None
    except (ValueError, TypeError, ArithmeticError) as exc:
        raise HTTPException(400, "Invalid amount or delivery date") from exc
    o = FabricationOrder(
        business_id=user.business_id, customer_id=cid, lead_id=lid,
        customer_name=str(payload.get("customer") or "").strip(),
        phone=payload.get("phone"), site=payload.get("site"),
        work=str(payload.get("work") or "").strip(), measurement=payload.get("measurement"),
        amount=amount, delivery_date=delivery,
        stage=payload.get("stage") if payload.get("stage") in STAGES else "New Enquiry",
        notes=payload.get("notes")
    )
    if not o.customer_name or not o.work:
        raise HTTPException(400, "Customer and work are required")
    db.add(o); db.commit(); db.refresh(o)
    return row(o)

@router.put("/{order_id}")
def update_order(order_id: int, payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    o = db.scalar(select(FabricationOrder).where(FabricationOrder.id == order_id, FabricationOrder.business_id == user.business_id))
    if not o:
        raise HTTPException(404, "Fabrication order not found")
    for k in ("customer_name","phone","site","work","measurement","notes"):
        if k in payload:
            setattr(o, k, payload[k])
    if "amount" in payload:
        try: o.amount = Decimal(str(payload["amount"] or 0))
        except (ValueError, TypeError, ArithmeticError) as exc: raise HTTPException(400, "Invalid amount") from exc
    if "delivery" in payload:
        try: o.delivery_date = datetime.fromisoformat(payload["delivery"]) if payload["delivery"] else None
        except (ValueError, TypeError) as exc: raise HTTPException(400, "Invalid delivery date") from exc
    if "stage" in payload:
        if payload["stage"] not in STAGES:
            raise HTTPException(400, "Invalid fabrication stage")
        o.stage = payload["stage"]
    db.commit(); db.refresh(o)
    return row(o)

@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    o = db.scalar(select(FabricationOrder).where(FabricationOrder.id == order_id, FabricationOrder.business_id == user.business_id))
    if not o:
        raise HTTPException(404, "Fabrication order not found")
    db.delete(o); db.commit()
