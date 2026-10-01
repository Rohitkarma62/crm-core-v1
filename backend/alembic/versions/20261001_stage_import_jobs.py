"""V1 staging migration.

The V1 bootstrap migration creates the complete current schema, including
staging fields. This revision remains as the historical second revision and
does not alter the already-created schema.
"""
from alembic import op

revision = "20261001_stage_import_jobs"
down_revision = "20261001_import_jobs"
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
