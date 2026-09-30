# CRM Core V1

CRM Core V1 is a multi-tenant CRM built with FastAPI, PostgreSQL, SQLAlchemy, Alembic, React and Vite.

## Requirements

- Python 3.11+
- Node.js 20+
- npm 10+
- Docker Desktop (recommended for PostgreSQL)

## 1. Start PostgreSQL

```bash
docker compose up -d db
```

## 2. Backend setup

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
alembic upgrade head
uvicorn app.main:app --reload
```

## 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend dependencies are pinned in `package.json` so a fresh install does not silently pull unrelated future versions.

## Backend dependencies

The backend `requirements.txt` includes FastAPI, Uvicorn, SQLAlchemy, PostgreSQL driver, Alembic, Pydantic, JWT/password security, multipart uploads and OpenPyXL for Excel import/export.

## Import / Export

- CSV/XLSX lead import
- Validation and duplicate handling
- Import history and error reports
- Lead/customer/sales/payment CSV/XLSX exports

Never commit `.env`, passwords, JWT secrets, database credentials, `node_modules`, or Python virtual environments.

## CI
GitHub Actions runs backend compile/tests and the frontend production build on every push and pull request.

## Production checklist
- Copy `backend/.env.example` to `backend/.env` and set production secrets.
- Configure PostgreSQL and run `alembic upgrade head`.
- Run backend with Uvicorn behind a production proxy.
- Build frontend with `npm run build` and serve `dist/`.
- Never commit `.env`, credentials, `node_modules`, or `dist/`.
