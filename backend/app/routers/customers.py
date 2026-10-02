from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Activity, Customer, Lead, LeadStatus, Sale, Payment
from ..models.billing import Invoice, Receipt, PaymentProof
from ..schemas.customers import CustomerCreate, CustomerListResponse, CustomerResponse, CustomerUpdate

router = APIRouter(prefix="/api/v1/customers", tags=["Customers"])


def customer_response(customer: Customer, db: Session):
    """Build a JSON-safe customer response.

    Keep financial children tenant-scoped and convert SQLAlchemy/Decimal values
    to plain JSON-compatible values before Pydantic validation.
    """
    sales = db.scalars(
        select(Sale).where(
            Sale.customer_id == customer.id,
            Sale.business_id == customer.business_id,
        )
    ).all()
    payments = db.scalars(
        select(Payment)
        .where(
            Payment.customer_id == customer.id,
            Payment.business_id == customer.business_id,
        )
        .order_by(Payment.payment_date.desc())
    ).all()

    fabrication_orders = db.scalars(select(FabricationOrder).where(FabricationOrder.customer_id == customer.id, FabricationOrder.business_id == customer.business_id)).all()
    workshop_payments = db.scalars(select(WorkshopPayment).where(WorkshopPayment.customer_id == customer.id, WorkshopPayment.business_id == customer.business_id)).all()
    total_sales = sum(float(s.amount or 0) for s in sales) + sum(float(o.amount or 0) for o in fabrication_orders)
    completed = [p for p in payments if p.status == "completed"]
    collected = sum(float(p.amount or 0) for p in completed) + sum(float(p.amount or 0) for p in workshop_payments)

    breakup = {}
    for p in completed:
        method = p.payment_method or "other"
        breakup[method] = breakup.get(method, 0) + float(p.amount or 0)
    for p in workshop_payments:
        method = p.payment_method or "other"
        breakup[method] = breakup.get(method, 0) + float(p.amount or 0)

    data = {
        "id": customer.id,
        "business_id": customer.business_id,
        "lead_id": customer.lead_id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "company": customer.company,
        "address": customer.address,
        "created_at": customer.created_at,
        "updated_at": customer.updated_at,
        "total_sales": round(total_sales, 2),
        "collected": round(collected, 2),
        "outstanding": round(max(total_sales - collected, 0), 2),
        "payment_breakup": [
            {"method": method, "amount": round(amount, 2)}
            for method, amount in sorted(
                breakup.items(), key=lambda item: item[1], reverse=True
            )
        ],
        "payment_history": [
            {
                "id": p.id,
                "sale_id": p.sale_id,
                "amount": float(p.amount or 0),
                "payment_method": p.payment_method,
                "payment_date": p.payment_date,
                "status": p.status,
                "reference": p.reference,
            }
            for p in payments
        ] + [
            {"id": p.id, "sale_id": None, "work_order_id": p.work_order_id, "amount": float(p.amount or 0), "payment_method": p.payment_method, "payment_date": p.payment_date, "status": "completed", "reference": p.reference}
            for p in workshop_payments
        ],
    }
    return CustomerResponse.model_validate(data)


def get_customer_or_404(customer_id: int, user: User, db: Session):
    customer = db.scalar(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == user.business_id,
        )
    )
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


@router.get("", response_model=CustomerListResponse)
def list_customers(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    converted_status = db.scalar(
        select(LeadStatus).where(
            LeadStatus.business_id == user.business_id,
            func.lower(LeadStatus.name) == "converted",
        )
    )
    if converted_status:
        converted_leads = db.scalars(
            select(Lead).where(
                Lead.business_id == user.business_id,
                Lead.status_id == converted_status.id,
            )
        ).all()
        changed = False
        for lead in converted_leads:
            existing = db.scalar(
                select(Customer).where(
                    Customer.lead_id == lead.id,
                    Customer.business_id == user.business_id,
                )
            )
            if not existing:
                db.add(
                    Customer(
                        business_id=user.business_id,
                        lead_id=lead.id,
                        name=lead.name,
                        phone=lead.phone,
                        email=lead.email,
                        company=lead.company,
                    )
                )
                changed = True
        if changed:
            db.commit()

    conditions = [Customer.business_id == user.business_id]
    if search:
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Customer.name.ilike(term),
                Customer.phone.ilike(term),
                Customer.email.ilike(term),
                Customer.company.ilike(term),
            )
        )

    total = db.scalar(
        select(func.count()).select_from(Customer).where(*conditions)
    ) or 0
    items = db.scalars(
        select(Customer)
        .where(*conditions)
        .order_by(Customer.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return CustomerListResponse(
        items=[customer_response(c, db) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.lead_id is not None:
        lead = db.scalar(
            select(Lead).where(
                Lead.id == payload.lead_id,
                Lead.business_id == user.business_id,
            )
        )
        if not lead:
            raise HTTPException(400, "Invalid lead")
        existing = db.scalar(
            select(Customer).where(
                Customer.lead_id == lead.id,
                Customer.business_id == user.business_id,
            )
        )
        if existing:
            raise HTTPException(409, "This lead is already a customer")

    customer = Customer(business_id=user.business_id, **payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer_response(customer, db)


@router.get("/{customer_id}/profile")
def customer_profile(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = get_customer_or_404(customer_id, user, db)
    sales = db.scalars(
        select(Sale)
        .where(Sale.customer_id == customer.id, Sale.business_id == user.business_id)
        .order_by(Sale.sale_date.desc())
    ).all()
    payments = db.scalars(
        select(Payment)
        .where(Payment.customer_id == customer.id, Payment.business_id == user.business_id)
        .order_by(Payment.payment_date.desc())
    ).all()
    invoices = db.scalars(
        select(Invoice)
        .join(Sale, Invoice.sale_id == Sale.id)
        .where(Invoice.business_id == user.business_id, Sale.customer_id == customer.id)
        .order_by(Invoice.created_at.desc())
    ).all()
    receipts = db.scalars(
        select(Receipt)
        .join(Payment, Receipt.payment_id == Payment.id)
        .where(Receipt.business_id == user.business_id, Payment.customer_id == customer.id)
    ).all()
    proofs = db.scalars(
        select(PaymentProof)
        .join(Payment, PaymentProof.payment_id == Payment.id)
        .where(PaymentProof.business_id == user.business_id, Payment.customer_id == customer.id)
        .order_by(PaymentProof.uploaded_at.desc())
    ).all()
    fabrication_orders = db.scalars(select(FabricationOrder).where(FabricationOrder.customer_id == customer.id, FabricationOrder.business_id == user.business_id)).all()
    workshop_payments = db.scalars(select(WorkshopPayment).where(WorkshopPayment.customer_id == customer.id, WorkshopPayment.business_id == user.business_id).order_by(WorkshopPayment.payment_date.desc())).all()
    completed = [p for p in payments if p.status == "completed"]
    total_sales = sum((s.amount for s in sales), start=0) + sum((o.amount for o in fabrication_orders), start=0)
    collected = sum((p.amount for p in completed), start=0) + sum((p.amount for p in workshop_payments), start=0)
    return {
        "customer": CustomerResponse.model_validate(customer),
        "summary": {
            "total_sales": total_sales,
            "collected": collected,
            "outstanding": max(total_sales - collected, 0),
            "payment_count": len(payments) + len(workshop_payments),
            "invoice_count": len(invoices) + len(fabrication_orders),
        },
        "sales": sales,
        "payments": payments,
        "workshop_payments": workshop_payments,
        "fabrication_jobs": fabrication_orders,
        "invoices": invoices,
        "receipts": receipts,
        "proofs": [
            {
                "id": p.id,
                "payment_id": p.payment_id,
                "filename": p.filename,
                "content_type": p.content_type,
                "uploaded_at": p.uploaded_at,
            }
            for p in proofs
        ],
    }


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return customer_response(get_customer_or_404(customer_id, user, db), db)


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = get_customer_or_404(customer_id, user, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer_response(customer, db)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = get_customer_or_404(customer_id, user, db)

    payment_ids = [
        p.id
        for p in db.scalars(
            select(Payment).where(
                Payment.customer_id == customer.id,
                Payment.business_id == user.business_id,
            )
        ).all()
    ]
    if payment_ids:
        db.query(PaymentProof).filter(
            PaymentProof.payment_id.in_(payment_ids),
            PaymentProof.business_id == user.business_id,
        ).delete(synchronize_session=False)
        db.query(Receipt).filter(
            Receipt.payment_id.in_(payment_ids),
            Receipt.business_id == user.business_id,
        ).delete(synchronize_session=False)

    sale_ids = [
        s.id
        for s in db.scalars(
            select(Sale).where(
                Sale.customer_id == customer.id,
                Sale.business_id == user.business_id,
            )
        ).all()
    ]
    if sale_ids:
        db.query(Invoice).filter(
            Invoice.sale_id.in_(sale_ids),
            Invoice.business_id == user.business_id,
        ).delete(synchronize_session=False)

    db.query(Payment).filter(
        Payment.customer_id == customer.id,
        Payment.business_id == user.business_id,
    ).delete(synchronize_session=False)
    db.query(Sale).filter(
        Sale.customer_id == customer.id,
        Sale.business_id == user.business_id,
    ).delete(synchronize_session=False)

    db.delete(customer)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            409,
            "Customer cannot be deleted because another record is linked to this customer",
        ) from exc


@router.post("/from-lead/{lead_id}", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def convert_lead_to_customer(
    lead_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lead = db.scalar(
        select(Lead).where(Lead.id == lead_id, Lead.business_id == user.business_id)
    )
    if not lead:
        raise HTTPException(404, "Lead not found")

    existing = db.scalar(
        select(Customer).where(
            Customer.lead_id == lead.id,
            Customer.business_id == user.business_id,
        )
    )
    if existing:
        raise HTTPException(409, "Lead is already converted to a customer")

    customer = Customer(
        business_id=user.business_id,
        lead_id=lead.id,
        name=lead.name,
        phone=lead.phone,
        email=lead.email,
        company=lead.company,
    )
    db.add(customer)
    db.flush()

    converted_status = db.scalar(
        select(LeadStatus).where(
            LeadStatus.business_id == user.business_id,
            func.lower(LeadStatus.name) == "converted",
        )
    )
    if converted_status:
        lead.status_id = converted_status.id

    db.add(
        Activity(
            business_id=user.business_id,
            lead_id=lead.id,
            user_id=user.id,
            type="CONVERSION",
            description=f"Lead converted to customer #{customer.id}",
        )
    )
    db.commit()
    db.refresh(customer)
    return customer_response(customer, db)
