"""stage import rows"""
from alembic import op
import sqlalchemy as sa

revision = "20261001_stage_import_jobs"
down_revision = "20261001_import_jobs"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("import_jobs", sa.Column("staged_rows", sa.Text(), nullable=True))
    op.add_column("import_jobs", sa.Column("staged_headers", sa.Text(), nullable=True))
    op.add_column("import_jobs", sa.Column("status", sa.String(length=20), nullable=False, server_default="staged"))

def downgrade():
    op.drop_column("import_jobs", "status")
    op.drop_column("import_jobs", "staged_headers")
    op.drop_column("import_jobs", "staged_rows")
