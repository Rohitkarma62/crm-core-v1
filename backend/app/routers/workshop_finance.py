from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Employee, EmployeeAttendance, WorkshopExpense, FabricationOrder

router = APIRouter(prefix="/api/v1/workshop-finance", tags=["Workshop Finance"])
CATEGORIES = ["Material","Labour","Salary","Transport","Electricity","Rent","Tools","Food/Tea","Repair","Other"]

def expense_row(e):
    return {
        "id": e.id,
        "work_order_id": e.work_order_id,
        "employee_id": e.employee_id,
        "date": e.expense_date.isoformat() if e.expense_date else None,
        "category": e.category,
        "title": e.title,
        "amount": float(e.amount or 0),
        "payment_method": e.payment_method,
        "notes": e.notes,
    }

def employee_row(e):
    return {"id":e.id,"name":e.name,"phone":e.phone,"role":e.role,"wage_type":e.wage_type,"wage_amount":float(e.wage_amount or 0),"active":e.active}

def employee_fallback_rows(db, business_id):
    employees = db.scalars(select(Employee).where(Employee.business_id == business_id)).all()
    by_id = {e.id: employee_row(e) for e in employees}
    attendance_rows = db.scalars(
        select(EmployeeAttendance)
        .where(EmployeeAttendance.business_id == business_id)
        .order_by(EmployeeAttendance.work_date.desc())
        .limit(200)
    ).all()
    for a in attendance_rows:
        if a.employee_id in by_id:
            continue
        exp = db.scalar(
            select(WorkshopExpense)
            .where(
                WorkshopExpense.business_id == business_id,
                WorkshopExpense.employee_id == a.employee_id,
                WorkshopExpense.category == "Salary",
            )
            .order_by(WorkshopExpense.expense_date.desc())
        )
        name = (exp.title.replace("Salary - ", "", 1).strip() if exp and exp.title else f"Majdur #{a.employee_id}")
        wage = float((a.amount or 0) / (a.days or 1))
        by_id[a.employee_id] = {
            "id": a.employee_id,
            "name": name,
            "phone": None,
            "role": "Majdur",
            "wage_type": "daily",
            "wage_amount": wage,
            "active": True,
            "recovered": True,
        }
    return list(by_id.values())

def attendance_row(a, employee=None):
    return {
        "id": a.id,
        "employee_id": a.employee_id,
        "employee_name": employee.name if employee else None,
        "employee_wage_type": employee.wage_type if employee else None,
        "employee_wage_amount": float(employee.wage_amount or 0) if employee else 0,
        "date": a.work_date.date().isoformat(),
        "status": a.status,
        "days": float(a.days or 0),
        "amount": float(a.amount or 0),
        "notes": a.notes,
    }

@router.get("/employees")
def employees(db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    return {"items": employee_fallback_rows(db, user.business_id)}

@router.post("/employees")
def add_employee(payload: dict, db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    name=str(payload.get("name") or "").strip()
    if not name: raise HTTPException(400,"Employee name is required")
    try: wage=Decimal(str(payload.get("wage_amount") or 0))
    except (ValueError,TypeError,ArithmeticError) as exc: raise HTTPException(400,"Invalid wage") from exc
    e=Employee(business_id=user.business_id,name=name,phone=payload.get("phone"),role=payload.get("role"),wage_type=payload.get("wage_type") if payload.get("wage_type") in ["daily","monthly"] else "daily",wage_amount=wage,active=True)
    db.add(e);db.commit();db.refresh(e);return employee_row(e)

@router.put("/employees/{employee_id}")
def update_employee(employee_id:int,payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    e=db.scalar(select(Employee).where(Employee.id==employee_id,Employee.business_id==user.business_id))
    if not e: raise HTTPException(404,"Employee not found")
    for k in ("name","phone","role","wage_type","active"):
        if k in payload: setattr(e,k,payload[k])
    if "wage_amount" in payload:
        try:e.wage_amount=Decimal(str(payload["wage_amount"] or 0))
        except (ValueError,TypeError,ArithmeticError) as exc:raise HTTPException(400,"Invalid wage") from exc
    db.commit();db.refresh(e);return employee_row(e)

@router.post("/attendance")
def mark_attendance(payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    emp=db.scalar(select(Employee).where(Employee.id==payload.get("employee_id"),Employee.business_id==user.business_id))
    if not emp: raise HTTPException(400,"Invalid employee")
    try:
        dt=datetime.fromisoformat(payload["date"]) if payload.get("date") else datetime.utcnow()
    except (ValueError,TypeError,ArithmeticError) as exc:
        raise HTTPException(400,"Invalid date") from exc

    status=str(payload.get("status") or "present").strip().lower()
    if status not in {"present","half_day","absent"}:
        raise HTTPException(400,"Invalid attendance status")

    if status == "absent":
        days = Decimal("0")
    elif status == "half_day":
        days = Decimal("0.5")
    else:
        days = Decimal("1")

    base_wage = Decimal(emp.wage_amount or 0)
    amount = base_wage * days if emp.wage_type in {"daily","monthly"} else Decimal("0")

    a=EmployeeAttendance(
        business_id=user.business_id, employee_id=emp.id, work_date=dt,
        status=status, days=days, amount=amount, notes=payload.get("notes")
    )
    db.add(a)
    db.flush()

    if amount > 0:
        ex=WorkshopExpense(
            business_id=user.business_id, employee_id=emp.id, expense_date=dt,
            category="Salary", title=f"Salary - {emp.name}", amount=amount,
            payment_method=payload.get("payment_method"), notes=payload.get("notes")
        )
        db.add(ex)

    db.commit()
    db.refresh(a)
    return attendance_row(a, emp)

@router.get("/attendance")
def attendance(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    rows=db.scalars(select(EmployeeAttendance).where(EmployeeAttendance.business_id==user.business_id).order_by(EmployeeAttendance.work_date.desc()).limit(200)).all()
    employees_by_id = {e.id: e for e in db.scalars(select(Employee).where(Employee.business_id == user.business_id)).all()}
    return {"items": [attendance_row(x, employees_by_id.get(x.employee_id)) for x in rows]}

@router.get("/expenses")
def expenses(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    rows=db.scalars(select(WorkshopExpense).where(WorkshopExpense.business_id==user.business_id).order_by(WorkshopExpense.expense_date.desc()).limit(300)).all()
    total=db.scalar(select(func.coalesce(func.sum(WorkshopExpense.amount),0)).where(WorkshopExpense.business_id==user.business_id)) or 0
    return {"items":[expense_row(x) for x in rows],"total":float(total),"categories":CATEGORIES}

@router.post("/expenses")
def add_expense(payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    try: amount=Decimal(str(payload.get("amount") or 0))
    except (ValueError,TypeError,ArithmeticError) as exc: raise HTTPException(400,"Invalid amount") from exc
    if amount<=0: raise HTTPException(400,"Amount must be greater than 0")
    wid=payload.get("work_order_id")
    if wid is not None and not db.scalar(select(FabricationOrder.id).where(FabricationOrder.id==wid,FabricationOrder.business_id==user.business_id)): raise HTTPException(400,"Invalid work order")
    dt=datetime.fromisoformat(payload["date"]) if payload.get("date") else datetime.utcnow()
    category=payload.get("category") if payload.get("category") in CATEGORIES else "Other"
    e=WorkshopExpense(business_id=user.business_id,work_order_id=wid,expense_date=dt,category=category,title=str(payload.get("title") or category),amount=amount,payment_method=payload.get("payment_method"),notes=payload.get("notes"))
    db.add(e);db.commit();db.refresh(e);return expense_row(e)

@router.delete("/expenses/{expense_id}",status_code=204)
def delete_expense(expense_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    e=db.scalar(select(WorkshopExpense).where(WorkshopExpense.id==expense_id,WorkshopExpense.business_id==user.business_id))
    if not e: raise HTTPException(404,"Expense not found")
    db.delete(e);db.commit()
