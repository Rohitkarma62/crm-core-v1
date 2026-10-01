from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import WorkshopMaterial, WorkshopMaterialTxn, FabricationOrder

router=APIRouter(prefix="/api/v1/workshop-materials",tags=["Workshop Materials"])

def material_row(m):
    return {"id":m.id,"name":m.name,"unit":m.unit,"stock_qty":float(m.stock_qty or 0),"min_stock_qty":float(m.min_stock_qty or 0),"rate":float(m.rate or 0),"supplier":m.supplier,"notes":m.notes,"active":m.active}

@router.get("")
def list_materials(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    rows=db.scalars(select(WorkshopMaterial).where(WorkshopMaterial.business_id==user.business_id).order_by(WorkshopMaterial.name)).all()
    return {"items":[material_row(x) for x in rows]}

@router.post("")
def add_material(payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    name=str(payload.get("name") or "").strip()
    if not name: raise HTTPException(400,"Material name is required")
    try:
        stock=Decimal(str(payload.get("stock_qty") or 0)); minimum=Decimal(str(payload.get("min_stock_qty") or 0)); rate=Decimal(str(payload.get("rate") or 0))
    except (ValueError,TypeError,ArithmeticError) as exc: raise HTTPException(400,"Invalid stock or rate") from exc
    m=WorkshopMaterial(business_id=user.business_id,name=name,unit=payload.get("unit") or "pcs",stock_qty=stock,min_stock_qty=minimum,rate=rate,supplier=payload.get("supplier"),notes=payload.get("notes"),active=True)
    db.add(m);db.commit();db.refresh(m);return material_row(m)

@router.post("/{material_id}/transaction")
def material_transaction(material_id:int,payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    m=db.scalar(select(WorkshopMaterial).where(WorkshopMaterial.id==material_id,WorkshopMaterial.business_id==user.business_id))
    if not m: raise HTTPException(404,"Material not found")
    try: qty=Decimal(str(payload.get("qty") or 0)); rate=Decimal(str(payload.get("rate") if payload.get("rate") is not None else m.rate or 0))
    except (ValueError,TypeError,ArithmeticError) as exc: raise HTTPException(400,"Invalid quantity") from exc
    typ=payload.get("txn_type")
    if typ not in ("in","out"): raise HTTPException(400,"Transaction type must be in or out")
    if qty<=0: raise HTTPException(400,"Quantity must be greater than 0")
    if typ=="out" and m.stock_qty<qty: raise HTTPException(400,"Insufficient stock")
    wid=payload.get("work_order_id")
    if wid is not None and not db.scalar(select(FabricationOrder.id).where(FabricationOrder.id==wid,FabricationOrder.business_id==user.business_id)): raise HTTPException(400,"Invalid work order")
    if typ=="in": m.stock_qty+=qty
    else: m.stock_qty-=qty
    t=WorkshopMaterialTxn(business_id=user.business_id,material_id=m.id,work_order_id=wid,txn_type=typ,qty=qty,rate=rate,notes=payload.get("notes"),txn_date=datetime.fromisoformat(payload["date"]) if payload.get("date") else datetime.utcnow())
    db.add(t);db.commit();db.refresh(m);return material_row(m)

@router.get("/{material_id}/transactions")
def material_transactions(material_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    m=db.scalar(select(WorkshopMaterial.id).where(WorkshopMaterial.id==material_id,WorkshopMaterial.business_id==user.business_id))
    if not m: raise HTTPException(404,"Material not found")
    rows=db.scalars(select(WorkshopMaterialTxn).where(WorkshopMaterialTxn.material_id==material_id,WorkshopMaterialTxn.business_id==user.business_id).order_by(WorkshopMaterialTxn.txn_date.desc()).limit(200)).all()
    return {"items":[{"id":x.id,"material_id":x.material_id,"work_order_id":x.work_order_id,"txn_type":x.txn_type,"qty":float(x.qty or 0),"rate":float(x.rate or 0),"date":x.txn_date.date().isoformat(),"notes":x.notes} for x in rows]}
