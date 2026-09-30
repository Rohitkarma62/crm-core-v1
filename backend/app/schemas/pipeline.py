from pydantic import BaseModel, ConfigDict, Field

class PipelineStageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    color: str | None
    sort_order: int
    is_final: bool

class PipelineLeadResponse(BaseModel):
    id: int
    name: str
    phone: str
    company: str | None
    priority: str
    interested_service: str | None
    estimated_value: float | None
    status_id: int | None
    assigned_to: int | None

class PipelineColumnResponse(BaseModel):
    stage: PipelineStageResponse
    leads: list[PipelineLeadResponse]

class PipelineResponse(BaseModel):
    columns: list[PipelineColumnResponse]

class MoveLeadRequest(BaseModel):
    status_id: int = Field(gt=0)
