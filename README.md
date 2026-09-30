# CRM Core V1

CRM Core V1 is a multi-tenant CRM built with FastAPI, PostgreSQL, SQLAlchemy, Alembic, React and Vite.

## Requirements
- Python 3.11+
- Node.js 20+
- npm 10+
- Docker Desktop (recommended for PostgreSQL)

## Setup
```bash
docker compose up -d db
cd backend
python -m venv .venv
pip install --upgrade pip
pip install -r requirements.txt
# copy backend/.env.example to backend/.env and set secrets
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Included
- Authentication, business accounts, roles and permissions
- Leads, Kanban pipeline, follow-ups and customers
- Sales and payments
- Dashboard analytics and reports
- CSV/XLSX import and export with validation and duplicate handling
- Import history and error reports
- Multi-tenant isolation and security hardening
- Automated CI for backend tests and frontend build

Never commit `.env`, credentials, `node_modules`, or Python virtual environments.
