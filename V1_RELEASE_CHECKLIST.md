# CRM Core V1 - Final Release Checklist

## V1 application

- [x] Authentication / JWT
- [x] Business registration and tenant isolation
- [x] Users and roles
- [x] Leads CRUD
- [x] Lead pipeline / Kanban
- [x] Follow-ups
- [x] Customers
- [x] Sales and payments
- [x] Dashboard analytics
- [x] Reports
- [x] CSV/XLSX import
- [x] Import history and error reports
- [x] CSV/XLSX exports
- [x] Permission checks
- [x] Security/tenant isolation tests

## Engineering / repository

- [x] Complete backend source in GitHub
- [x] Complete frontend source in GitHub
- [x] SQLite local setup
- [x] Local setup guide
- [x] Testing guide
- [x] GitHub Actions CI
- [x] Backend automated tests
- [x] Frontend production build
- [x] Bcrypt/Passlib compatibility pinned
- [x] Import header normalization fixed
- [x] /api/v1/leads/export compatibility route restored
- [x] Alembic migration chain
- [x] Railway backend uses alembic upgrade head
- [x] Railway backend configured for SQLite

## Production

- [x] Railway backend deployment successful
- [x] SQLite database connection verified by /health
- [x] Railway backend healthcheck configured at /health
- [x] Frontend production build succeeds
- [ ] GitHub Pages deployment / public browser smoke test
- [ ] Final Git tag/release v1.0.0

## Current deployment URLs

- Backend API: https://crm-core-v1-production.up.railway.app
- Frontend target: https://rohitkarma62.github.io/crm-core-v1/

## Release state

**V1 application is feature-complete and currently deployed with SQLite.**

PostgreSQL is intentionally deferred. The SQLAlchemy/Alembic database layer remains configuration-driven so a later PostgreSQL migration can be performed without rewriting the CRM modules.

## Important SQLite production note

The current Railway service has **no persistent volume attached**. SQLite therefore lives on the service filesystem and may be lost after a destructive redeploy/replacement. Keep backups before important real-world use.

When the project grows, move DATABASE_URL to PostgreSQL and keep the existing application/database abstraction.
