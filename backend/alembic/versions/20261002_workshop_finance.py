"""Add workshop employees attendance and expenses."""
from alembic import op
import sqlalchemy as sa

revision = "20261002_workshop_finance"
down_revision = "20261002_fabrication_orders"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("phone", sa.String(30)),
        sa.Column("role", sa.String(80)),
        sa.Column("wage_type", sa.String(20), nullable=False, server_default="daily"),
        sa.Column("wage_amount", sa.Numeric(12,2), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_employees_business_id","employees",["business_id"])

    op.create_table(
        "employee_attendance",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_date", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="present"),
        sa.Column("days", sa.Numeric(5,2), nullable=False, server_default="1"),
        sa.Column("amount", sa.Numeric(12,2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_employee_attendance_business_id","employee_attendance",["business_id"])
    op.create_index("ix_employee_attendance_employee_id","employee_attendance",["employee_id"])
    op.create_index("ix_employee_attendance_work_date","employee_attendance",["work_date"])

    op.create_table(
        "workshop_expenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_order_id", sa.Integer(), sa.ForeignKey("fabrication_orders.id", ondelete="SET NULL")),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")),
        sa.Column("expense_date", sa.DateTime(), nullable=False),
        sa.Column("category", sa.String(40), nullable=False, server_default="Other"),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("amount", sa.Numeric(12,2), nullable=False, server_default="0"),
        sa.Column("payment_method", sa.String(30)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_workshop_expenses_business_id","workshop_expenses",["business_id"])
    op.create_index("ix_workshop_expenses_work_order_id","workshop_expenses",["work_order_id"])
    op.create_index("ix_workshop_expenses_employee_id","workshop_expenses",["employee_id"])
    op.create_index("ix_workshop_expenses_expense_date","workshop_expenses",["expense_date"])

def downgrade():
    op.drop_table("workshop_expenses")
    op.drop_table("employee_attendance")
    op.drop_table("employees")
