# CRM Core V1 - Local Machine Setup

This guide runs the complete CRM Core V1 stack on a local Windows machine. The recommended setup uses Docker only for PostgreSQL, while FastAPI and React run directly on the machine.

## Requirements

- Git
- Docker Desktop
- Python 3.11+ (Python 3.12 is recommended)
- Node.js 20+
- npm

## 1. Get the project

Clone the repository and enter the project folder:

```bash
git clone https://github.com/Rohitkarma62/crm-core-v1.git
cd crm-core-v1
```

If the repository is already downloaded, just open a terminal in the project root.

## 2. Start PostgreSQL

Make sure Docker Desktop is running, then from the project root:

```bash
docker compose up -d db
docker compose ps
```

PostgreSQL is exposed locally on port `5432`.

Default local database:

- Database: `crm_core`
- User: `postgres`
- Password: `postgres`
- Host: `localhost`
- Port: `5432`

## 3. Configure the backend

Open a new terminal:

```bash
cd backend
python -m venv .venv
```

### Windows CMD

```cmd
.venv\\Scripts\\activate
copy .env.example .env
```

### Windows PowerShell

```powershell
.venv\\Scripts\\Activate.ps1
Copy-Item .env.example .env
```

### macOS/Linux

```bash
source .venv/bin/activate
cp .env.example .env
```

Open `backend/.env` and use:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/crm_core
SECRET_KEY=local-dev-secret-key-change-this
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173
```

## 4. Install backend dependencies

With the virtual environment active:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 5. Create the local database tables

For the current V1 release, initialize the schema directly from the SQLAlchemy models:

```bash
python -c "from app.database import Base, engine; import app.models; Base.metadata.create_all(bind=engine)"
```

This is intentional for the current V1 local/production bootstrap. The Alembic migration chain should be completed and used for future versioned schema changes.

## 6. Start the backend

```bash
uvicorn app.main:app --reload
```

Backend URLs:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

Keep this terminal running.

## 7. Start the frontend

Open a second terminal in the project root:

```bash
cd frontend
npm install
npm run dev
```

Vite normally starts the frontend at:

http://localhost:5173

Keep this terminal running too.

## 8. Local architecture

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
PostgreSQL
localhost:5432
```

## 9. Verify the setup

Open these URLs in your browser:

1. http://localhost:5173
2. http://127.0.0.1:8000/health
3. http://127.0.0.1:8000/docs

The health endpoint should return a successful response.

## 10. Stop the application

Stop FastAPI and Vite with `Ctrl+C` in their terminals.

Stop PostgreSQL:

```bash
docker compose down
```

To stop PostgreSQL without deleting its Docker volume, use the command above. Do not use `docker compose down -v` unless you intentionally want to delete the local database volume.

## Common Windows issues

### PowerShell blocks activation

Run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\\Scripts\\Activate.ps1
```

### Port 5432 already in use

Check which process is using the port, or stop the other PostgreSQL instance before starting Docker PostgreSQL.

### Port 8000 already in use

Start FastAPI on another port:

```bash
uvicorn app.main:app --reload --port 8001
```

If you change the backend port, make sure the frontend API configuration points to the new URL.

### Frontend cannot connect to the API

Check the frontend API configuration and make sure it points to the local FastAPI server, not the Railway production URL. The exact environment variable name is defined by the frontend source/configuration in this repository.

### Database connection error

Check:

```bash
docker compose ps
```

Then confirm that `backend/.env` uses:

```text
postgresql+psycopg2://postgres:postgres@localhost:5432/crm_core
```

## Security

- Never commit `backend/.env`.
- Never put production database passwords in source files.
- Never commit JWT secrets.
- The credentials in this document are for local development only.
