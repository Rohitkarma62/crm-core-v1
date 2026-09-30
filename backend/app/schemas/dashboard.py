from pydantic import BaseModel

class DashboardSummary(BaseModel):
    total_leads: int
    new_leads: int
    contacted_leads: int
    interested_leads: int
    followup_leads: int
    negotiation_leads: int
    converted_leads: int
    lost_leads: int
    conversion_rate: float
    total_customers: int
    followups_today: int
    overdue_followups: int
    total_sales: int
    total_revenue: float
    collected_revenue: float
    outstanding_revenue: float

class DashboardLeadSource(BaseModel):
    name: str
    count: int

class DashboardRecentLead(BaseModel):
    id: int
    name: str
    phone: str
    status: str | None
    priority: str
    created_at: str

class DashboardFollowUp(BaseModel):
    id: int
    lead_id: int
    lead_name: str
    scheduled_at: str
    status: str
    notes: str | None
