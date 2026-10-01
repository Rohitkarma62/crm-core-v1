"""Add customer 360 billing, invoice, receipt and payment proof support."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20261001_customer_billing"
down_revision = "20261001_stage_import_jobs"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    business_columns = {column["name"] for column in inspector.get_columns("businesses")}
    existing_tables = set(inspector.get_table_names())

    for name, column in [
        ("owner_name", sa.Column("owner_name", sa.String(length=120), nullable=True)),
        ("address", sa.Column("address", sa.Text(), nullable=True)),
        ("gstin", sa.Column("gstin", sa.String(length=30), nullable=True)),
        ("invoice_prefix", sa.Column("invoice_prefix", sa.String(length=20), nullable=False, server_default="INV")),
        ("warranty_text", sa.Column("warranty_text", sa.Text(), nullable=True)),
    ]:
        if name not in business_columns:
            op.add_column("businesses", column)

    if "business_assets" not in existing_tables:
        op.create_table(
            "business_assets",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("kind", sa.String(length=20), nullable=False),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=100), nullable=False),
            sa.Column("data", sa.LargeBinary(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("business_id", "kind", name="uq_business_asset_kind"),
        )
        op.create_index("ix_business_assets_business_id", "business_assets", ["business_id"])

    if "invoices" not in existing_tables:
        op.create_table(
            "invoices",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
            sa.Column("invoice_number", sa.String(length=40), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("sale_id", name="uq_invoice_sale"),
        )
        op.create_index("ix_invoices_business_id", "invoices", ["business_id"])

    if "receipts" not in existing_tables:
        op.create_table(
            "receipts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("receipt_number", sa.String(length=40), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("payment_id", name="uq_receipt_payment"),
        )
        op.create_index("ix_receipts_business_id", "receipts", ["business_id"])

    if "payment_proofs" not in existing_tables:
        op.create_table(
            "payment_proofs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("business_id", sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("payment_id", sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=100), nullable=False),
            sa.Column("data", sa.LargeBinary(), nullable=False),
            sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_payment_proofs_business_id", "payment_proofs", ["business_id"])
        op.create_index("ix_payment_proofs_payment_id", "payment_proofs", ["payment_id"])

def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    for table in ("payment_proofs", "receipts", "invoices", "business_assets"):
        if table in tables:
            op.drop_table(table)
    columns = {column["name"] for column in inspector.get_columns("businesses")}
    for name in ("warranty_text", "invoice_prefix", "gstin", "address", "owner_name"):
        if name in columns:
            op.drop_column("businesses", name)
