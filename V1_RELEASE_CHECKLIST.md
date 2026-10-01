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
- [x] Frontend production build verified by CI
- [x] Bcrypt/Passlib compatibility pinned
- [x] Import header normalization fixed
- [x] /api/v1/leads/export compatibility route restored
- [x] Alembic V1 bootstrap migration fixed
- [x] Railway backend switched to alembic upgrade head
- [x] Railway PostgreSQL persistent volume attached and deployed

## Production

- [x] Railway backend deployment successful
- [x] Railway PostgreSQL deployment successful
- [x] Railway backend healthcheck configured at /health
- [x] Frontend production build succeeds
- [ ] GitHub Pages deployment: GitHub Pages must be enabled once in repository Settings > Pages with Source = GitHub Actions. The workflow is already committed and the build job succeeds, but GitHub's Pages deployment API currently returns 404 because Pages is disabled.
- [ ] Final production browser smoke test after Pages is enabled
- [ ] Create final Git tag/release v1.0.0 after the final CI run is green

## Current deployment URLs

- Backend API: https://crm-core-v1-production.up.railway.app
- Frontend target after enabling Pages: https://rohitkarma62.github.io/crm-core-v1/

## V1 release note

The V1 codebase is feature-complete. The remaining release actions are platform-level verification: enable GitHub Pages, confirm the deployed frontend can authenticate against the Railway API, then create the final v1.0.0 release tag.

## Important production note

The Railway PostgreSQL volume is 512 MB, which is the current plan limit. It provides persistence for this V1 environment, but production backups and capacity should be reviewed before significant real-world data growth.
