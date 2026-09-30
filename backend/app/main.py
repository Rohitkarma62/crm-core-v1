from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers.auth import router as auth_router
from .routers.leads import router as leads_router
from .routers.pipeline import router as pipeline_router
from .routers.followups import router as followups_router
from .routers.customers import router as customers_router
from .routers.sales import router as sales_router
from .routers.dashboard import router as dashboard_router
from .routers.imports import router as imports_router
from .routers.reports import router as reports_router

app = FastAPI(title=settings.app_name, version="1.0.0")

allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(leads_router)
app.include_router(pipeline_router)
app.include_router(followups_router)
app.include_router(customers_router)
app.include_router(sales_router)
app.include_router(dashboard_router)
app.include_router(imports_router)
app.include_router(reports_router)


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "service": settings.app_name}
