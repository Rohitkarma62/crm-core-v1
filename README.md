# CRM Core V1

> **A production-ready, multi-tenant CRM foundation for managing leads, customers, sales, follow-ups and business operations from one workspace.**

CRM Core V1 is a full-stack Customer Relationship Management system built for small and growing businesses. It covers the workflow from **lead capture → follow-up → customer → sale → reporting**.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| API | FastAPI |
| Language | Python |
| ORM | SQLAlchemy |
| Database | SQLite for current V1 deployment |
| Migrations | Alembic |
| Authentication | JWT |
| Validation | Pydantic |
| File Processing | OpenPyXL |
| Testing | Pytest |
| CI/CD | GitHub Actions |
| Production API | Railway |

> **Database note:** V1 currently runs on SQLite so the application can stay deployed without waiting for a PostgreSQL plan upgrade. The database URL is configuration-driven, so PostgreSQL can be introduced later without redesigning the CRM modules.

## Core Features

- JWT authentication and business registration
- Multi-tenant data isolation
- Users, roles and permissions
- Leads and lead pipeline / Kanban
- Follow-ups
- Customers and lead conversion
- Sales and payments
- Dashboard analytics and reports
- CSV/XLSX import and export
- Import history and error reports
- Security and tenant-isolation tests

## Core Workflow

```text
Lead Capture
     ↓
Lead Qualification
     ↓
Pipeline / Kanban
     ↓
Follow-up
     ↓
Customer
     ↓
Sale / Payment
     ↓
Dashboard & Reports
```

## Architecture

```text
Browser
   │
   ▼
React + Vite
   │ HTTP / JSON
   ▼
FastAPI
   │ SQLAlchemy
   ▼
SQLite (current V1)
crm.db
```

## Run Locally

### Requirements

- Python 3.11+
- Node.js 20+
- npm

No PostgreSQL or Docker database is required for the current V1 setup.

### Backend

```bash
cd backend
python -m venv .venv
```

Windows CMD:

```cmd
.venv\\Scripts\\activate
copy .env.example .env
```

Install dependencies:

```bash
pip install -r requirements.txt
```

The example configuration uses SQLite:

```env
DATABASE_URL=sqlite:///./crm.db
SECRET_KEY=change-this-to-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173
```

Initialize the schema:

```bash
alembic upgrade head
```

Run the API:

```bash
uvicorn app.main:app --reload
```

API:

- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/health

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

http://localhost:5173

## Production Deployment

The V1 backend is deployed on Railway with FastAPI, SQLite, Alembic migrations, a database-aware /health check, and environment-based secrets.

Production API:

https://crm-core-v1-production.up.railway.app

The current Railway SQLite database is stored on the service filesystem. **Because there is currently no persistent Railway volume attached, this deployment should be treated as V1/early-production infrastructure and database backups are important.**

When the project needs stronger persistence, concurrency and scaling, change DATABASE_URL to a PostgreSQL connection and keep the existing SQLAlchemy/Alembic layer.

## Frontend Deployment

A GitHub Pages workflow is included at .github/workflows/frontend-pages.yml.

Target frontend:

https://rohitkarma62.github.io/crm-core-v1/

## Testing

GitHub Actions covers:

- Python compilation
- Backend automated tests
- Tenant isolation and security checks
- Frontend production build

See TESTING.md for the test workflow.

## Security

Never commit:

- .env
- database passwords
- JWT secrets
- API keys
- node_modules/
- Python virtual environments
- crm.db

Production secrets belong in Railway environment variables.

## Roadmap

### V1
- [x] Core CRM modules
- [x] Multi-tenancy
- [x] Authentication
- [x] Import/export
- [x] Automated tests
- [x] Railway deployment
- [x] SQLite production database

### Later infrastructure upgrade
- PostgreSQL
- Persistent database backups
- Higher concurrency
- Larger-scale deployment

## License

MIT
