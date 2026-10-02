"""Add fabrication workshop orders."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20261002_fabrication_orders"
down_revision = "20261001_password_reset"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    if inspect(bind).has_table("fabrication_orders"):
        return
    op.create_table(
        "fabrication_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("customer_name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("site", sa.Text(), nullable=True),
        sa.Column("work", sa.String(length=255), nullable=False),
        sa.Column("measurement", sa.String(length=255), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("delivery_date", sa.DateTime(), nullable=True),
        sa.Column("stage", sa.String(length=40), nullable=False, server_default="New Enquiry"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_fabrication_orders_business_id", "fabrication_orders", ["business_id"])
    op.create_index("ix_fabrication_orders_customer_id", "fabrication_orders", ["customer_id"])
    op.create_index("ix_fabrication_orders_lead_id", "fabrication_orders", ["lead_id"])
    op.create_index("ix_fabrication_orders_stage", "fabrication_orders", ["stage"])

def downgrade():
    op.drop_index("ix_fabrication_orders_stage", table_name="fabrication_orders")
    op.drop_index("ix_fabrication_orders_lead_id", table_name="fabrication_orders")
    op.drop_index("ix_fabrication_orders_customer_id", table_name="fabrication_orders")
    op.drop_index("ix_fabrication_orders_business_id", table_name="fabrication_orders")
    op.drop_table("fabrication_orders")
