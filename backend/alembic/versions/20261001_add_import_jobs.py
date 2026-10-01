"""CRM Core V1 schema bootstrap.

This migration intentionally bootstraps the complete V1 SQLAlchemy schema.
Future releases should use focused, versioned Alembic migrations.
"""
from alembic import op

revision = "20261001_import_jobs"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    from app.database import Base
    import app.models  # noqa: F401

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade():
    from app.database import Base
    import app.models  # noqa: F401

    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
