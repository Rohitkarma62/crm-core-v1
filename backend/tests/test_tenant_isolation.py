import os
os.environ.setdefault('DATABASE_URL', 'sqlite:///./test_isolation.db')
os.environ.setdefault('SECRET_KEY', 'test-secret')
os.environ.setdefault('CORS_ORIGINS', 'http://testserver')

import pytest
pytest.importorskip('fastapi')
pytest.importorskip('sqlalchemy')
pytest.importorskip('jose')

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app

engine = create_engine('sqlite:///./test_isolation.db', connect_args={'check_same_thread': False})
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

@pytest.fixture(scope='module', autouse=True)
def db():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)

@pytest.fixture
def client():
    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()
    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def register(client, email, business):
    r = client.post('/api/v1/auth/register', json={
        'name': business + ' Admin', 'email': email, 'password': 'StrongPass123!',
        'business_name': business, 'phone': '9876543210'
    })
    assert r.status_code == 201, r.text
    return r.json()['access_token']


def auth(token):
    return {'Authorization': f'Bearer {token}'}


def test_business_data_isolation_crud_and_reports(client):
    token_a = register(client, 'admin-a@example.com', 'Business A')
    token_b = register(client, 'admin-b@example.com', 'Business B')

    lead = client.post('/api/v1/leads', headers=auth(token_a), json={
        'name': 'Private A', 'phone': '9000000001', 'email': 'private-a@example.com'
    })
    assert lead.status_code == 201, lead.text
    lead_id = lead.json()['id']

    # B must not see A's lead.
    listed = client.get('/api/v1/leads', headers=auth(token_b))
    assert listed.status_code == 200
    assert all(item['id'] != lead_id for item in listed.json()['items'])

    # B cannot read/update/delete A's lead.
    assert client.get(f'/api/v1/leads/{lead_id}', headers=auth(token_b)).status_code == 404
    assert client.put(f'/api/v1/leads/{lead_id}', headers=auth(token_b), json={'name': 'Hijacked'}).status_code == 404
    assert client.delete(f'/api/v1/leads/{lead_id}', headers=auth(token_b)).status_code == 404

    # B's dashboard/reports must not include A's data.
    summary = client.get('/api/v1/dashboard/summary', headers=auth(token_b))
    assert summary.status_code == 200
    assert summary.json()['total_leads'] == 0
    report = client.get('/api/v1/reports/leads', headers=auth(token_b))
    assert report.status_code == 200
    assert report.json()['total'] == 0


def test_import_history_and_exports_are_tenant_scoped(client):
    token_a = register(client, 'admin-c@example.com', 'Business C')
    token_b = register(client, 'admin-d@example.com', 'Business D')

    client.post('/api/v1/leads', headers=auth(token_a), json={'name': 'Export Secret', 'phone': '9000000002'})
    export_b = client.get('/api/v1/leads/export?fmt=csv', headers=auth(token_b))
    assert export_b.status_code == 200
    assert 'Export Secret' not in export_b.text
