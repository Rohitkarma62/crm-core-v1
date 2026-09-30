from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text()

def test_sales_reject_non_positive_and_overpayment():
    schema = read("app/schemas/sales.py")
    router = read("app/routers/sales.py")
    assert 'amount: Decimal = Field(gt=0' in schema
    assert 'amount: Decimal | None = Field(default=None, gt=0' in schema
    assert 'Payment exceeds outstanding balance' in router
    assert 'Sale amount cannot be lower than completed payments' in router

def test_payment_status_is_constrained():
    schema = read("app/schemas/sales.py")
    assert 'pattern=r"^(pending|completed|cancelled)$"' in schema

def test_sale_status_is_constrained():
    schema = read("app/schemas/sales.py")
    assert 'pattern=r"^(pending|partial|paid)$"' in schema

def test_followup_status_and_assignment_are_validated():
    schema = read("app/schemas/followups.py")
    router = read("app/routers/followups.py")
    assert 'pattern=r"^(pending|completed|cancelled)$"' in schema
    assert 'Assigned user does not belong to this business or is inactive' in router

def test_pipeline_stage_is_tenant_scoped():
    router = read("app/routers/pipeline.py")
    assert 'LeadStatus.id == payload.status_id, LeadStatus.business_id == user.business_id' in router

def test_customer_conversion_duplicate_is_blocked():
    router = read("app/routers/customers.py")
    assert 'Lead is already converted to a customer' in router
