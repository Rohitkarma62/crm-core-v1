from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_import_export_routes_require_permissions():
    text = (ROOT / 'app' / 'routers' / 'imports.py').read_text()
    required = [
        'require_permission(user, "leads.import", db)',
        'require_permission(user, "leads.export", db)',
        'require_permission(user, "customers.export", db)',
        'require_permission(user, "sales.export", db)',
        'require_permission(user, "payments.export", db)',
    ]
    for item in required:
        assert item in text


def test_exports_neutralize_formula_prefixes():
    text = (ROOT / 'app' / 'routers' / 'imports.py').read_text()
    assert '"=", "+", "-", "@"' in text
    assert "return \"'\" + value" in text


def test_tenant_filters_exist_on_sensitive_import_history_operations():
    text = (ROOT / 'app' / 'routers' / 'imports.py').read_text()
    assert 'ImportJob.id==job_id, ImportJob.business_id==user.business_id' in text
    assert 'ImportJob.business_id == user.business_id' in text


def test_frontend_has_no_node_modules_dependency_bundled():
    assert not (ROOT.parent / 'node_modules').exists()
