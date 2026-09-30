# CRM Core V1 Tests

Run from `backend/` after installing `requirements.txt`:

```bash
pytest -q
```

The tenant isolation suite creates separate businesses and verifies that one business cannot read, update, delete, report, or export another business's data.

If dependencies are missing, install them first:

```bash
python -m pip install -r requirements.txt
```
