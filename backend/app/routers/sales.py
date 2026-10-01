from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import User
from ..models.crm import Customer, Payment, Sale
from ..models.billing import PaymentProof, Receipt, Invoice
from ..schemas.sales import PaymentCreate, PaymentResponse, PaymentUpdate, SaleCreate, SaleListResponse, SaleResponse, SaleUpdate

router = APIRouter(prefix="/api/v1", tags=["Sales & Payments"])


def get_sale(sale_id: int, user: User, db: Session) -> Sale:
    sale = db.scalar(select(Sale).where(Sale.id == sale_id, Sale.business_id == user.business_id))
    if not sale:
        raise HTTPException(404, "Sale not found")
    return sale


def paid_total(sale_id: int, db: Session) -> Decimal:
    return db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(
        Payment.sale_id == sale_id, Payment.status == "completed"
    )) or Decimal("0")


def sync_sale_status(sale: Sale, db: Session) -> tuple[Decimal, Decimal]:
    paid = paid_total(sale.id, db)
    balance = max(Decimal("0"), sale.amount - paid)
    if paid >= sale.amount:
        sale.status = "paid"
    elif paid > 0:
        sale.status = "partial"
    else:
        sale.status = "pending"
    return paid, balance


def sale_response(sale: Sale, db: Session) -> SaleResponse:
    paid = paid_total(sale.id, db)
    return SaleResponse.model_validate(sale).model_copy(update={
        "paid_amount": paid,
        "balance_amount": max(Decimal("0"), sale.amount - paid),
    })


@router.get("/sales", response_model=SaleListResponse)
def list_sales(customer_id: int | None = None, status_filter: str | None = Query(default=None, alias="status"), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conditions = [Sale.business_id == user.business_id]
    if customer_id is not None:
        conditions.append(Sale.customer_id == customer_id)
    if status_filter:
        conditions.append(Sale.status == status_filter)
    total = db.scalar(select(func.count()).select_from(Sale).where(*conditions)) or 0
    sales = db.scalars(select(Sale).where(*conditions).order_by(Sale.sale_date.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    for sale in sales:
        sync_sale_status(sale, db)
    db.commit()
    return SaleListResponse(items=[sale_response(s, db) for s in sales], total=total, page=page, page_size=page_size)


@router.post("/sales", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    customer = db.scalar(select(Customer).where(Customer.id == payload.customer_id, Customer.business_id == user.business_id))
    if not customer:
        raise HTTPException(400, "Invalid customer")
    if payload.lead_id is not None:
        # Keep the sale tenant-safe. The lead relation is optional for historical sales.
        from ..models.crm import Lead
        if not db.scalar(select(Lead.id).where(Lead.id == payload.lead_id, Lead.business_id == user.business_id)):
            raise HTTPException(400, "Invalid lead")
    payment_total = sum((p.amount for p in payload.payments), Decimal("0"))
    if payment_total > payload.amount:
        raise HTTPException(400, "Initial payments cannot exceed sale amount")
    sale = Sale(business_id=user.business_id, customer_id=payload.customer_id, lead_id=payload.lead_id,
                amount=payload.amount, sale_date=payload.sale_date or datetime.utcnow(), notes=payload.notes)
    db.add(sale); db.flush()
    for p in payload.payments:
        db.add(Payment(business_id=user.business_id, customer_id=payload.customer_id, sale_id=sale.id,
                       amount=p.amount, payment_method=p.payment_method,
                       payment_date=p.payment_date or datetime.utcnow(), reference=p.reference))
    sync_sale_status(sale, db); db.commit(); db.refresh(sale)
    return sale_response(sale, db)

@router.get("/sales/{sale_id}", response_model=SaleResponse)
def get_sale_detail(sale_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return sale_response(get_sale(sale_id, user, db), db)


@router.put("/sales/{sale_id}", response_model=SaleResponse)
def update_sale(sale_id: int, payload: SaleUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sale = get_sale(sale_id, user, db)
    data = payload.model_dump(exclude_unset=True)
    if "amount" in data:
        paid = paid_total(sale.id, db)
        if data["amount"] < paid:
            raise HTTPException(400, "Sale amount cannot be lower than completed payments")
    for key, value in data.items():
        setattr(sale, key, value)
    sync_sale_status(sale, db); db.commit(); db.refresh(sale)
    return sale_response(sale, db)


@router.delete("/sales/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(sale_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sale = get_sale(sale_id, user, db)
    payment_ids = list(db.scalars(select(Payment.id).where(
        Payment.sale_id == sale.id,
        Payment.business_id == user.business_id,
    )).all())

    if payment_ids:
        db.query(PaymentProof).filter(
            PaymentProof.payment_id.in_(payment_ids),
            PaymentProof.business_id == user.business_id,
        ).delete(synchronize_session=False)
        db.query(Receipt).filter(
            Receipt.payment_id.in_(payment_ids),
            Receipt.business_id == user.business_id,
        ).delete(synchronize_session=False)

    db.query(Invoice).filter(
        Invoice.sale_id == sale.id,
        Invoice.business_id == user.business_id,
    ).delete(synchronize_session=False)

    db.query(Payment).filter(
        Payment.sale_id == sale.id,
        Payment.business_id == user.business_id,
    ).delete(synchronize_session=False)

    db.delete(sale)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(409, "Sale cannot be deleted because another record is linked to it") from exc


@router.get("/payments", response_model=list[PaymentResponse])
def list_payments(sale_id: int | None = None, customer_id: int | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conditions = [Payment.business_id == user.business_id]
    if sale_id is not None: conditions.append(Payment.sale_id == sale_id)
    if customer_id is not None: conditions.append(Payment.customer_id == customer_id)
    return db.scalars(select(Payment).where(*conditions).order_by(Payment.payment_date.desc())).all()


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sale = get_sale(payload.sale_id, user, db)
    customer = db.scalar(select(Customer).where(Customer.id == sale.customer_id, Customer.business_id == user.business_id))
    if not customer:
        raise HTTPException(400, "Invalid customer")
    if payload.amount > max(Decimal("0"), sale.amount - paid_total(sale.id, db)):
        raise HTTPException(400, "Payment exceeds outstanding balance")
    payment = Payment(business_id=user.business_id, customer_id=sale.customer_id, sale_id=sale.id,
                      amount=payload.amount, payment_method=payload.payment_method,
                      payment_date=payload.payment_date or datetime.utcnow(), reference=payload.reference)
    db.add(payment); db.flush(); sync_sale_status(sale, db); db.commit(); db.refresh(payment)
    return payment


@router.get("/payments/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    payment = db.scalar(select(Payment).where(Payment.id == payment_id, Payment.business_id == user.business_id))
    if not payment: raise HTTPException(404, "Payment not found")
    return payment


@router.put("/payments/{payment_id}", response_model=PaymentResponse)
def update_payment(payment_id: int, payload: PaymentUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    payment = db.scalar(select(Payment).where(Payment.id == payment_id, Payment.business_id == user.business_id))
    if not payment: raise HTTPException(404, "Payment not found")
    sale = get_sale(payment.sale_id, user, db)
    data = payload.model_dump(exclude_unset=True)
    new_amount = data.get("amount", payment.amount)
    new_status = data.get("status", payment.status)
    if new_status == "completed":
        other_completed = db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.sale_id == sale.id, Payment.status == "completed", Payment.id != payment.id
        )) or Decimal("0")
        if new_amount > max(Decimal("0"), sale.amount - other_completed):
            raise HTTPException(400, "Payment exceeds outstanding balance")
    for key, value in data.items(): setattr(payment, key, value)
    sync_sale_status(sale, db); db.commit(); db.refresh(payment)
    return payment
