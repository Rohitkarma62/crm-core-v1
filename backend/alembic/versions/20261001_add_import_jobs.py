"""add import jobs

Revision ID: 20261001_import_jobs
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "20261001_import_jobs"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "import_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("entity", sa.String(length=30), nullable=False, server_default="leads"),
        sa.Column("total_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("imported", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("errors", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_rows", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_import_jobs_business_id", "import_jobs", ["business_id"])
    op.create_index("ix_import_jobs_user_id", "import_jobs", ["user_id"])

def downgrade():
    op.drop_index("ix_import_jobs_user_id", table_name="import_jobs")
    op.drop_index("ix_import_jobs_business_id", table_name="import_jobs")
    op.drop_table("import_jobs")
