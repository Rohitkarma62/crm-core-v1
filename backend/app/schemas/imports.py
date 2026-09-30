from pydantic import BaseModel, Field
from typing import Any

class ImportOptions(BaseModel):
    job_id: int | None = None
    mapping: dict[str, str] = Field(default_factory=dict)
    duplicate_action: str = Field(default="skip")
    rows: list[dict[str, Any]] = Field(default_factory=list)

class ImportResult(BaseModel):
    total_rows: int
    imported: int
    skipped: int
    errors: int
    error_rows: list[dict[str, Any]] = Field(default_factory=list)
