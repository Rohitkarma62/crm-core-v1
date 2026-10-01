from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import WorkshopPayment, FabricationOrder, Customer

router=APIRouter(prefix="/api/v1/workshop-payments",tags=["Workshop Payments"])

def payment_row(p): return {"id":p.id,"work_order_id":p.work_order_id,"customer_id":p.customer_id,"amount":float(p.amount or 0),"payment_method":p.payment_method,"reference":p.reference,"date":p.payment_date.date().isoformat(),"notes":p.notes}

@router.get("")
def list_payments(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    rows=db.scalars(select(WorkshopPayment).where(WorkshopPayment.business_id==user.business_id).order_by(WorkshopPayment.payment_date.desc()).limit(300)).all()
    total=db.scalar(select(func.coalesce(func.sum(WorkshopPayment.amount),0)).where(WorkshopPayment.business_id==user.business_id)) or 0
    return {"items":[payment_row(x) for x in rows],"total":float(total)}

@router.post("")
def add_payment(payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    wid=payload.get("work_order_id")
    order=db.scalar(select(FabricationOrder).where(FabricationOrder.id==wid,FabricationOrder.business_id==user.business_id))
    if not order: raise HTTPException(400,"Invalid work order")
    try: amount=Decimal(str(payload.get("amount") or 0))
    except (ValueError,TypeError,ArithmeticError) as exc: raise HTTPException(400,"Invalid amount") from exc
    if amount<=0: raise HTTPException(400,"Amount must be greater than 0")
    paid=db.scalar(select(func.coalesce(func.sum(WorkshopPayment.amount),0)).where(WorkshopPayment.work_order_id==wid,WorkshopPayment.business_id==user.business_id)) or 0
    if paid+amount>Decimal(order.amount or 0): raise HTTPException(400,"Payment cannot exceed work order amount")
    cid=order.customer_id
    if cid is not None and not db.scalar(select(Customer.id).where(Customer.id==cid,Customer.business_id==user.business_id)): cid=None
    dt=datetime.fromisoformat(payload["date"]) if payload.get("date") else datetime.utcnow()
    p=WorkshopPayment(business_id=user.business_id,work_order_id=wid,customer_id=cid,amount=amount,payment_method=payload.get("payment_method") or "Cash",reference=payload.get("reference"),payment_date=dt,notes=payload.get("notes"))
    db.add(p);db.commit();db.refresh(p);return payment_row(p)
