from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from ..models.core import Business, User, Role
from ..models.crm import Activity, Customer, FollowUp, ImportJob, Lead, LeadSource, LeadStatus, Payment, Sale
from ..models.billing import BusinessAsset, Invoice, PaymentProof, Receipt

router = APIRouter(prefix="/api/v1/billing", tags=["Billing & Documents"])
DEFAULT_WARRANTY = "इस बिल में दिए गए फैब्रिकेशन कार्य पर बिल की तारीख से 1 माह की वारंटी दी जाती है। वारंटी केवल निर्माण/फैब्रिकेशन से संबंधित दोषों पर लागू होगी। गलत उपयोग, बाहरी क्षति, प्राकृतिक कारणों अथवा सामान्य टूट-फूट से हुई क्षति वारंटी में शामिल नहीं होगी।"
ASSET_TYPES = {"logo": {"image/png","image/jpeg","image/webp"}, "signature": {"image/png","image/jpeg","image/webp"}, "stamp": {"image/png","image/jpeg","image/webp"}}

@router.get("/company")
def get_company(db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    b=db.get(Business,user.business_id)
    assets={a.kind:{"id":a.id,"filename":a.filename,"content_type":a.content_type} for a in db.scalars(select(BusinessAsset).where(BusinessAsset.business_id==b.id)).all()}
    return {"id":b.id,"name":b.name,"owner_name":b.owner_name,"phone":b.phone,"email":b.email,"address":b.address,"gstin":b.gstin,"invoice_prefix":b.invoice_prefix,"warranty_text":b.warranty_text or DEFAULT_WARRANTY,"assets":assets}

@router.put("/company")
def update_company(payload: dict, db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    b=db.get(Business,user.business_id)
    for k in ("name","owner_name","phone","email","address","gstin","invoice_prefix","warranty_text"):
        if k in payload: setattr(b,k,payload[k])
    db.commit(); db.refresh(b); return get_company(db,user)

@router.post("/company/asset/{kind}")
async def upload_company_asset(kind:str,file:UploadFile=File(...),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    if kind not in ASSET_TYPES or file.content_type not in ASSET_TYPES[kind]: raise HTTPException(400,"Unsupported image type")
    data=await file.read()
    if len(data)>5*1024*1024: raise HTTPException(413,"File too large (max 5 MB)")
    a=db.scalar(select(BusinessAsset).where(BusinessAsset.business_id==user.business_id,BusinessAsset.kind==kind))
    if a: a.filename=file.filename or kind; a.content_type=file.content_type; a.data=data
    else: db.add(BusinessAsset(business_id=user.business_id,kind=kind,filename=file.filename or kind,content_type=file.content_type,data=data))
    db.commit(); return {"kind":kind,"filename":file.filename}

@router.get("/assets/{kind}")
def get_company_asset(kind:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    a=db.scalar(select(BusinessAsset).where(BusinessAsset.business_id==user.business_id,BusinessAsset.kind==kind))
    if not a: raise HTTPException(404,"Asset not found")
    return Response(a.data,media_type=a.content_type,headers={"Content-Disposition":f'inline; filename="{a.filename}"'})


def require_admin(user: User, db: Session):
    role = db.get(Role, user.role_id) if user.role_id else None
    if not role or role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Only the business admin can clear CRM data")


@router.delete("/company/clear-data")
def clear_company_crm_data(db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    """Delete all CRM/customer/financial/import data for the current business, preserving the account and company settings."""
    require_admin(user, db)
    bid = user.business_id

    # Delete deepest dependent records first so SQLite/Postgres foreign keys remain valid.
    payment_ids = list(db.scalars(select(Payment.id).where(Payment.business_id == bid)).all())
    sale_ids = list(db.scalars(select(Sale.id).where(Sale.business_id == bid)).all())

    if payment_ids:
        db.query(PaymentProof).filter(PaymentProof.business_id == bid).delete(synchronize_session=False)
        db.query(Receipt).filter(Receipt.business_id == bid).delete(synchronize_session=False)
    if sale_ids:
        db.query(Invoice).filter(Invoice.business_id == bid).delete(synchronize_session=False)

    for model in (Payment, Sale, WorkshopExpense, EmployeeAttendance, FabricationOrder, Employee, Activity, FollowUp, Customer, ImportJob, Lead, LeadSource, LeadStatus):
        db.query(model).filter(model.business_id == bid).delete(synchronize_session=False)

    db.commit()
    return {"message": "All CRM data cleared. Business account and company settings were preserved."}

def sale_or_404(sale_id,user,db):
    s=db.scalar(select(Sale).where(Sale.id==sale_id,Sale.business_id==user.business_id))
    if not s: raise HTTPException(404,"Sale not found")
    return s

def payment_or_404(payment_id,user,db):
    p=db.scalar(select(Payment).where(Payment.id==payment_id,Payment.business_id==user.business_id))
    if not p: raise HTTPException(404,"Payment not found")
    return p

def invoice_for(sale,user,db):
    inv=db.scalar(select(Invoice).where(Invoice.sale_id==sale.id,Invoice.business_id==user.business_id))
    if inv: return inv
    b=db.get(Business,user.business_id); n=db.scalar(select(func.count(Invoice.id)).where(Invoice.business_id==user.business_id)) or 0
    inv=Invoice(business_id=user.business_id,sale_id=sale.id,invoice_number=f"{b.invoice_prefix or 'INV'}-{n+1:05d}")
    db.add(inv); db.commit(); db.refresh(inv); return inv

def receipt_for(payment,user,db):
    r=db.scalar(select(Receipt).where(Receipt.payment_id==payment.id,Receipt.business_id==user.business_id))
    if r: return r
    n=db.scalar(select(func.count(Receipt.id)).where(Receipt.business_id==user.business_id)) or 0
    r=Receipt(business_id=user.business_id,payment_id=payment.id,receipt_number=f"REC-{n+1:05d}")
    db.add(r); db.commit(); db.refresh(r); return r

@router.get("/sales/{sale_id}/invoice")
def invoice_data(sale_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    s=sale_or_404(sale_id,user,db); c=db.get(Customer,s.customer_id); inv=invoice_for(s,user,db)
    payments=db.scalars(select(Payment).where(Payment.sale_id==s.id).order_by(Payment.payment_date)).all()
    paid=sum((p.amount for p in payments if p.status=="completed"),start=0)
    return {"invoice_number":inv.invoice_number,"sale":s,"customer":c,"payments":payments,"paid_amount":paid,"balance_amount":max(s.amount-paid,0),"company":get_company(db,user)}

@router.get("/payments/{payment_id}/receipt")
def receipt_data(payment_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    p=payment_or_404(payment_id,user,db); c=db.get(Customer,p.customer_id); r=receipt_for(p,user,db)
    return {"receipt_number":r.receipt_number,"payment":p,"customer":c,"company":get_company(db,user)}

@router.post("/payments/{payment_id}/proof",status_code=status.HTTP_201_CREATED)
async def upload_payment_proof(payment_id:int,file:UploadFile=File(...),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    p=payment_or_404(payment_id,user,db)
    if file.content_type not in {"image/png","image/jpeg","image/webp","application/pdf"}: raise HTTPException(400,"Only image or PDF proof files are allowed")
    data=await file.read()
    if len(data)>8*1024*1024: raise HTTPException(413,"Proof file too large (max 8 MB)")
    proof=PaymentProof(business_id=user.business_id,payment_id=p.id,filename=file.filename or "payment-proof",content_type=file.content_type,data=data,uploaded_by=user.id)
    db.add(proof); db.commit(); db.refresh(proof)
    return {"id":proof.id,"filename":proof.filename,"content_type":proof.content_type,"uploaded_at":proof.uploaded_at}

@router.get("/payment-proofs/{proof_id}")
def get_payment_proof(proof_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    p=db.scalar(select(PaymentProof).where(PaymentProof.id==proof_id,PaymentProof.business_id==user.business_id))
    if not p: raise HTTPException(404,"Payment proof not found")
    return Response(p.data,media_type=p.content_type,headers={"Content-Disposition":f'inline; filename="{p.filename}"'})

@router.get("/payments/{payment_id}/proofs")
def list_payment_proofs(payment_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    payment_or_404(payment_id,user,db)
    return db.scalars(select(PaymentProof).where(PaymentProof.payment_id==payment_id,PaymentProof.business_id==user.business_id).order_by(PaymentProof.uploaded_at.desc())).all()
