import os
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

from app.routers.imports import MAX_BYTES, MAX_ROWS, normalize_header, normalize_phone, parse_value, suggest_mapping


def test_limits_are_sane():
    assert MAX_BYTES == 10 * 1024 * 1024
    assert MAX_ROWS == 10000


def test_normalizers():
    assert normalize_header("Lead-Source") == "lead source"
    assert normalize_phone("+91 98765-43210") == "919876543210"
    assert parse_value("₹25,000") == 25000


def test_mapping():
    mapping = suggest_mapping(["Full Name", "Mobile Number", "E-mail", "Lead Source"])
    assert mapping["Full Name"] == "name"
    assert mapping["Mobile Number"] == "phone"
    assert mapping["E-mail"] == "email"
    assert mapping["Lead Source"] == "source"
