import os
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

from app.main import app


def test_health_route_exists():
    assert any(getattr(route, "path", None) == "/health" for route in app.routes)


def test_import_export_routes_exist():
    paths = {getattr(route, "path", None) for route in app.routes}
    assert "/api/v1/imports/leads/preview" in paths
    assert "/api/v1/leads/export" in paths
    assert "/api/v1/imports/history" in paths
    assert "/api/v1/reports/leads" in paths
    assert "/api/v1/reports/sales" in paths
    assert "/api/v1/reports/payments" in paths
    assert "/api/v1/reports/staff" in paths
