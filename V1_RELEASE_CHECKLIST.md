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
- [x] Local Docker PostgreSQL setup
- [x] Local setup guide
- [x] Testing guide
- [x] GitHub Actions CI
- [x] Backend CI: 17 tests passing
- [x] Frontend production build passing
- [x] Bcrypt/Passlib compatibility pinned
- [x] Import header normalization fixed
- [x] /api/v1/leads/export compatibility route restored
- [x] Alembic V1 bootstrap migration fixed
- [x] Railway backend switched to alembic upgrade head
- [x] Railway PostgreSQL persistent volume created and mounted

## Production

- [x] Railway backend deployment successful
- [x] Railway PostgreSQL deployment successful
- [x] Railway backend healthcheck configured at /health
- [x] Railway environment has no pending changes
- [x] Frontend production build succeeds
- [ ] GitHub Pages deployment: enable GitHub Pages once in repository Settings > Pages with Source = GitHub Actions. The workflow and build are already committed; the deploy API returned 404 only because Pages is currently disabled.
- [ ] Final browser smoke test after Pages is enabled
- [ ] Create final Git tag/release v1.0.0 after the final public frontend smoke test

## Current deployment URLs

- Backend API: https://crm-core-v1-production.up.railway.app
- Frontend target after enabling Pages: https://rohitkarma62.github.io/crm-core-v1/

## Release state

**V1 application: feature-complete and CI-green.**

The remaining release work is platform-level only:
1. Enable GitHub Pages with Source = GitHub Actions.
2. Open the deployed frontend and verify registration/login plus one authenticated CRM flow against the Railway API.
3. Create the final v1.0.0 Git tag/release.

## Important production note

The Railway PostgreSQL persistent volume is 512 MB, which is the current plan limit. It provides persistence for this V1 environment, but backups and capacity should be reviewed before significant real-world data growth.
