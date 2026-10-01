from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import FabricationOrder, WorkshopExpense, WorkshopPayment, WorkshopMaterial

router=APIRouter(prefix="/api/v1/workshop-reports",tags=["Workshop Reports"])

@router.get("")
def report(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    bid=user.business_id
    orders=db.scalars(select(FabricationOrder).where(FabricationOrder.business_id==bid)).all()
    expenses=db.scalar(select(func.coalesce(func.sum(WorkshopExpense.amount),0)).where(WorkshopExpense.business_id==bid)) or 0
    payments=db.scalar(select(func.coalesce(func.sum(WorkshopPayment.amount),0)).where(WorkshopPayment.business_id==bid)) or 0
    materials=db.scalars(select(WorkshopMaterial).where(WorkshopMaterial.business_id==bid)).all()
    rows=[]
    for o in orders:
        exp=db.scalar(select(func.coalesce(func.sum(WorkshopExpense.amount),0)).where(WorkshopExpense.business_id==bid,WorkshopExpense.work_order_id==o.id)) or 0
        paid=db.scalar(select(func.coalesce(func.sum(WorkshopPayment.amount),0)).where(WorkshopPayment.business_id==bid,WorkshopPayment.work_order_id==o.id)) or 0
        rows.append({"id":o.id,"customer":o.customer_name,"work":o.work,"amount":float(o.amount or 0),"expense":float(exp),"paid":float(paid),"outstanding":float(max((o.amount or 0)-paid,0)),"profit":float((o.amount or 0)-exp),"stage":o.stage})
    return {"summary":{"order_value":float(sum((o.amount or 0) for o in orders)),"expenses":float(expenses),"payments":float(payments),"balance":float(sum((o.amount or 0) for o in orders)-expenses),"stock_value":float(sum((m.stock_qty or 0)*(m.rate or 0) for m in materials))},"jobs":rows}
