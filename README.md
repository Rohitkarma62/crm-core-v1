# CRM Core V1

> **A production-ready, multi-tenant CRM foundation for managing leads, customers, sales, follow-ups and business operations from one workspace.**

CRM Core V1 is a full-stack Customer Relationship Management system built for small and growing businesses that need a structured workflow from **lead capture → follow-up → customer → sale → reporting**.

It is designed as a modular SaaS foundation, with tenant isolation, role-based access, analytics, import/export workflows and a clean API-first architecture.

[![CI](https://github.com/Rohitkarma62/crm-core-v1/actions/workflows/ci.yml/badge.svg)](https://github.com/Rohitkarma62/crm-core-v1/actions/workflows/ci.yml)
[![Backend](https://img.shields.io/badge/backend-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/frontend-React%2018-61DAFB)](https://react.dev/)
[![Database](https://img.shields.io/badge/database-PostgreSQL-4169E1)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Product Overview

CRM Core V1 gives a business a central place to manage its customer lifecycle.

### Core workflow

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

Instead of keeping customer information scattered across spreadsheets, chats and notebooks, CRM Core provides a structured system where business data can be organized and tracked.

---

## Key Features

### 🔐 Authentication & Business Accounts
- JWT-based authentication
- Business registration
- User accounts
- Role-based permissions
- Multi-tenant data isolation

### 🎯 Lead Management
- Create, update and delete leads
- Lead status management
- Priority tracking
- Search and filtering
- Lead ownership
- Pipeline workflow

### 📋 Sales Pipeline
- Kanban-style pipeline
- Lead stage tracking
- Follow-up workflow
- Sales progression visibility

### 📞 Follow-ups
- Schedule follow-ups
- Track follow-up status
- Maintain customer communication history
- Keep pending work visible

### 👥 Customer Management
- Convert/manage leads as customers
- Customer records
- Customer-related sales data
- Tenant-safe customer access

### 💰 Sales & Payments
- Sales records
- Payment tracking
- Payment status
- Revenue-oriented dashboard data

### 📊 Dashboard & Analytics
- Business performance overview
- Lead metrics
- Customer metrics
- Sales/payment metrics
- Operational reporting

### 📥 Import & Export
- CSV import
- XLSX import
- Validation
- Duplicate handling
- Import history
- Error reporting
- CSV/XLSX exports

### 🛡️ Security
- JWT authentication
- Tenant isolation
- Permission checks
- Protected CRUD operations
- Environment-based secrets
- Security-focused automated tests

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| API | FastAPI |
| Language | Python |
| ORM | SQLAlchemy |
| Database | PostgreSQL |
| Migrations | Alembic |
| Authentication | JWT |
| Validation | Pydantic |
| File Processing | OpenPyXL |
| Testing | Pytest |
| Local Infrastructure | Docker Compose |
| CI/CD | GitHub Actions |
| Production API | Railway |

---

## Architecture

```text
                    ┌─────────────────────┐
                    │      Browser        │
                    │   React + Vite      │
                    └──────────┬──────────┘
                               │ HTTP / JSON
                               ▼
                    ┌─────────────────────┐
                    │     FastAPI API     │
                    │ Authentication      │
                    │ Business Logic      │
                    │ Permissions         │
                    │ Tenant Isolation    │
                    └──────────┬──────────┘
                               │ SQLAlchemy
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │ Business Data       │
                    │ Users / Leads       │
                    │ Customers / Sales   │
                    └─────────────────────┘
```

---

## Project Structure

```text
crm-core-v1/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── railway.toml
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── LOCAL_SETUP.md
├── TESTING.md
├── V1_RELEASE_CHECKLIST.md
└── README.md
```

---

## Run Locally

### Requirements

- Python 3.11+
- Node.js 20+
- npm
- Docker Desktop

### 1. Start PostgreSQL

```bash
docker compose up -d db
```

### 2. Start the backend

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

Create the local schema:

```bash
python -c "from app.database import Base, engine; import app.models; Base.metadata.create_all(bind=engine)"
```

Run the API:

```bash
uvicorn app.main:app --reload
```

API endpoints:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

**http://localhost:5173**

For the complete Windows setup, see [LOCAL_SETUP.md](LOCAL_SETUP.md).

---

## API

FastAPI provides interactive API documentation at:

**http://127.0.0.1:8000/docs**

The API is organized around business domains including:

- Authentication
- Leads
- Pipeline
- Follow-ups
- Customers
- Sales
- Dashboard
- Imports / Exports
- Reports

---

## Testing

The project uses Pytest for backend verification and GitHub Actions for automated CI.

Current CI coverage includes:

- Python compilation
- Backend automated tests
- Tenant isolation checks
- Security/permission checks
- Frontend production build

Latest verified V1 CI status: **17 backend tests passing + frontend build passing**.

See [TESTING.md](TESTING.md).

---

## Deployment

### Backend

The V1 backend is deployed on Railway with:

- FastAPI
- PostgreSQL
- Health check at `/health`
- Environment-based configuration
- Persistent PostgreSQL storage

Production API:

**https://crm-core-v1-production.up.railway.app**

### Frontend

A GitHub Pages deployment workflow is included in:

`/.github/workflows/frontend-pages.yml`

The repository's GitHub Pages setting must be enabled with **GitHub Actions** as the source before the public frontend is available.

---

## Security

Never commit:

- `.env`
- Database passwords
- JWT secrets
- API keys
- `node_modules/`
- Python virtual environments

Production secrets must be stored in the deployment platform's environment variables.

For security issues, please avoid opening a public issue containing credentials or exploit details. Contact the repository owner privately.

---

## Roadmap

### V1 — Core CRM
- [x] Authentication
- [x] Multi-tenancy
- [x] Leads
- [x] Pipeline
- [x] Follow-ups
- [x] Customers
- [x] Sales & payments
- [x] Dashboard
- [x] Reports
- [x] Import / export
- [x] Automated tests
- [x] Production backend deployment

### V2 — Scale & Automation
Planned areas include:

- Advanced user/team management
- Richer dashboard analytics
- Automated follow-up reminders
- Notifications
- Advanced search and filtering
- Activity timeline
- Improved audit logging
- More granular permissions
- Better reporting and exports
- Production-grade migration history
- Backup/restore workflows
- SaaS billing and subscription support

---

## Documentation

| Document | Purpose |
|---|---|
| [LOCAL_SETUP.md](LOCAL_SETUP.md) | Run CRM Core locally |
| [TESTING.md](TESTING.md) | Run and understand tests |
| [V1_RELEASE_CHECKLIST.md](V1_RELEASE_CHECKLIST.md) | V1 release status |
| [Backend](backend/) | FastAPI application |
| [Frontend](frontend/) | React application |

---

## Project Status

**CRM Core V1 is feature-complete and CI-green.**

The application is currently positioned as a strong V1 foundation for a multi-tenant CRM SaaS. The remaining public-release step is enabling GitHub Pages and completing a browser-level smoke test of the deployed frontend.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
