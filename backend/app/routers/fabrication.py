from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Customer, FabricationOrder, Lead
router=APIRouter(prefix="/api/v1/fabrication",tags=["Fabrication"])
STAGES=["New Enquiry","Measurement","Material Pending","Fabrication","Welding","Grinding","Painting","Ready","Delivered"]
def row(o): return {"id":o.id,"customer_id":o.customer_id,"lead_id":o.lead_id,"customer":o.customer_name,"phone":o.phone,"site":o.site,"work":o.work,"measurement":o.measurement,"amount":float(o.amount or 0),"delivery":o.delivery_date.isoformat() if o.delivery_date else "","stage":o.stage,"notes":o.notes,"created_at":o.created_at.isoformat() if o.created_at else ""}
@router.get("")
def list_orders(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    return {"items":[row(o) for o in db.scalars(select(FabricationOrder).where(FabricationOrder.business_id==user.business_id).order_by(FabricationOrder.created_at.desc())).all()],"stages":STAGES}
@router.post("")
def create_order(payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    cid=payload.get("customer_id"); lid=payload.get("lead_id")
    if cid is not None and not db.scalar(select(Customer.id).where(Customer.id==cid,Customer.business_id==user.business_id)): raise HTTPException(400,"Invalid customer")
    if lid is not None and not db.scalar(select(Lead.id).where(Lead.id==lid,Lead.business_id==user.business_id)): raise HTTPException(400,"Invalid lead")
    o=FabricationOrder(business_id=user.business_id,customer_id=cid,lead_id=lid,customer_name=str(payload.get("customer") or "").strip(),phone=payload.get("phone"),site=payload.get("site"),work=str(payload.get("work") or "").strip(),measurement=payload.get("measurement"),amount=Decimal(str(payload.get("amount") or 0)),delivery_date=datetime.fromisoformat(payload["delivery"]) if payload.get("delivery") else None,stage=payload.get("stage") if payload.get("stage") in STAGES else "New Enquiry",notes=payload.get("notes"))
    if not o.customer_name or not o.work: raise HTTPException(400,"Customer and work are required")
    db.add(o);db.commit();db.refresh(o);return row(o)
@router.put("/{order_id}")
def update_order(order_id:int,payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    o=db.scalar(select(FabricationOrder).where(FabricationOrder.id==order_id,FabricationOrder.business_id==user.business_id))
    if not o: raise HTTPException(404,"Fabrication order not found")
    for k in ("customer_name","phone","site","work","measurement","notes"):
        if k in payload:setattr(o,k,payload[k])
    if "amount" in payload:o.amount=Decimal(str(payload["amount"] or 0))
    if "delivery" in payload:o.delivery_date=datetime.fromisoformat(payload["delivery"]) if payload["delivery"] else None
    if "stage" in payload:
        if payload["stage"] not in STAGES: raise HTTPException(400,"Invalid fabrication stage")
        o.stage=payload["stage"]
    db.commit();db.refresh(o);return row(o)
@router.delete("/{order_id}",status_code=204)
def delete_order(order_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    o=db.scalar(select(FabricationOrder).where(FabricationOrder.id==order_id,FabricationOrder.business_id==user.business_id))
    if not o: raise HTTPException(404,"Fabrication order not found")
    db.delete(o);db.commit()
