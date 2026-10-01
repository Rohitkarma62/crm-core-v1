# CRM Core V1

CRM Core V1 is a multi-tenant CRM built with FastAPI, PostgreSQL, SQLAlchemy, Alembic, React and Vite.

## Requirements

- Python 3.11+
- Node.js 20+
- npm 10+
- Docker Desktop (recommended for PostgreSQL)

## Quick local setup

For the complete Windows/local-machine guide, see **[LOCAL_SETUP.md](LOCAL_SETUP.md)**.

### 1. Start PostgreSQL

From the project root:

```bash
docker compose up -d db
docker compose ps
```

### 2. Backend

```bash
cd backend
python -m venv .venv
```

Windows CMD:

```cmd
.venv\\Scripts\\activate
copy .env.example .env
```

Windows PowerShell:

```powershell
.venv\\Scripts\\Activate.ps1
Copy-Item .env.example .env
```

Install dependencies:

```bash
pip install -r requirements.txt
```

For the current V1 bootstrap, create tables from the SQLAlchemy models:

```bash
python -c "from app.database import Base, engine; import app.models; Base.metadata.create_all(bind=engine)"
```

Start the API:

```bash
uvicorn app.main:app --reload
```

Backend:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

### 3. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

- http://localhost:5173

### Local architecture

```text
Browser
  |
  v
React + Vite :5173
  |
  v
FastAPI :8000
  |
  v
PostgreSQL :5432
```

## Import / Export

- CSV/XLSX lead import
- Validation and duplicate handling
- Import history and error reports
- Lead/customer/sales/payment CSV/XLSX exports

## CI

GitHub Actions runs backend compile/tests and the frontend production build on every push and pull request.

## Production checklist

- Configure production secrets in Railway/environment variables.
- Configure PostgreSQL and ensure database persistence/backups are enabled.
- The current V1 Railway bootstrap creates tables from SQLAlchemy models at startup.
- For V2, complete and validate the Alembic migration chain and switch deployment back to `alembic upgrade head`.
- Run backend with Uvicorn behind the production platform/proxy.
- Build frontend with `npm run build`.
- Never commit `.env`, credentials, `node_modules`, or `dist/`.

## Security

Never commit `.env`, passwords, JWT secrets, database credentials, `node_modules`, or Python virtual environments.

Local development credentials are documented only for the local Docker PostgreSQL instance.