# CRM Core V1 - Local Machine Setup

This guide runs CRM Core V1 locally with **SQLite**. No PostgreSQL server or Docker database is required.

## Requirements

- Git
- Python 3.11+ (Python 3.12 recommended)
- Node.js 20+
- npm

## 1. Get the project

```bash
git clone https://github.com/Rohitkarma62/crm-core-v1.git
cd crm-core-v1
```

## 2. Configure the backend

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

macOS/Linux:

```bash
source .venv/bin/activate
cp .env.example .env
```

The default database configuration is:

```env
DATABASE_URL=sqlite:///./crm.db
SECRET_KEY=change-this-to-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173
```

## 3. Install backend dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 4. Create/update the database schema

```bash
alembic upgrade head
```

The SQLite database file is created as backend/crm.db.

## 5. Start the backend

```bash
uvicorn app.main:app --reload
```

Backend:

- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/health

## 6. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

http://localhost:5173

## 7. Local architecture

```text
Browser
  |
  v
React + Vite
localhost:5173
  |
  v
FastAPI
localhost:8000
  |
  v
SQLite
backend/crm.db
```

## 8. Verify

Open:

1. http://localhost:5173
2. http://127.0.0.1:8000/health
3. http://127.0.0.1:8000/docs

The health endpoint should report the API and database as healthy.

## 9. Database backup

SQLite is a file, so a simple backup can be made by copying backend/crm.db while the application is stopped.

Keep backups outside the Git repository.

## 10. Common issues

### Port 8000 already in use

```bash
uvicorn app.main:app --reload --port 8001
```

If the port changes, update the frontend API configuration accordingly.

### Frontend cannot connect to API

Check that the frontend points to the local FastAPI URL and that the backend is running.

### Database migration error

Run:

```bash
alembic upgrade head
```

## Security

- Never commit backend/.env.
- Never commit JWT secrets.
- Never commit the SQLite database file.
- Keep production secrets in Railway environment variables.
