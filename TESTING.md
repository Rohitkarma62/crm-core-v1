# CRM Core V1 - Testing & Hardening

## Security coverage
- Authentication and inactive-user checks
- Business/tenant isolation
- Import/export permission enforcement
- Import history isolation
- Formula-injection-safe CSV/XLSX exports
- Import row/size bounds
- Reports route registration and tenant scoping

## Run
```bash
cd backend
python -m pip install -r requirements.txt
pytest -q
```

Frontend:
```bash
cd frontend
npm install
npm run build
```

The development container used during hardening did not have network access to install missing Python/Node packages, so a local collection failure due to missing `python-jose` must not be interpreted as a product test failure. The suite is designed to run in a normal dependency-complete environment.
