"""Add secure password reset tokens."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20261001_password_reset"
down_revision = "20261001_customer_billing"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()
    if "password_reset_tokens" not in tables:
        op.create_table(
            "password_reset_tokens",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    existing = {x["name"] for x in inspect(bind).get_indexes("password_reset_tokens")}
    if "ix_password_reset_tokens_user_id" not in existing:
        op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    if "ix_password_reset_tokens_token_hash" not in existing:
        op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)
    if "ix_password_reset_tokens_expires_at" not in existing:
        op.create_index("ix_password_reset_tokens_expires_at", "password_reset_tokens", ["expires_at"])

def downgrade():
    bind = op.get_bind()
    if "password_reset_tokens" in inspect(bind).get_table_names():
        for name in ("ix_password_reset_tokens_expires_at", "ix_password_reset_tokens_token_hash", "ix_password_reset_tokens_user_id"):
            if name in {x["name"] for x in inspect(bind).get_indexes("password_reset_tokens")}:
                op.drop_index(name, table_name="password_reset_tokens")
        op.drop_table("password_reset_tokens")
