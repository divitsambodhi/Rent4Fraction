
# Rent4Fraction FastAPI Server (`/server`)

The high-performance, asynchronous-capable REST API backend for Rent4Fraction, built on Python 3.11+, FastAPI, SQLAlchemy 2.0 (synchronous with PyMySQL driver), Pydantic v2, and MySQL 8.x.

---

## 1. Quick Start (Windows PowerShell)

Follow these steps from the repository root (`d:\DBMS project\Rent4Fraction`):

### Step 1: Navigate to `/server`
```powershell
cd server
```

### Step 2: Create and Activate Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 3: Install Dependencies
```powershell
python -m pip install -r requirements-dev.txt
```

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Open `.env` and fill in your local MySQL credentials:
```ini
DATABASE_URL=mysql+pymysql://rental_user:YOUR_LOCAL_DB_PASSWORD@127.0.0.1:3306/event_rental?charset=utf8mb4
TEST_DATABASE_URL=mysql+pymysql://rental_user:YOUR_LOCAL_DB_PASSWORD@127.0.0.1:3306/event_rental_test?charset=utf8mb4
```

### Step 5: Start Development Server
```powershell
uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Liveness check: [http://localhost:8000/health](http://localhost:8000/health)
- Database readiness check: [http://localhost:8000/health/db](http://localhost:8000/health/db)
- App version: [http://localhost:8000/version](http://localhost:8000/version)

---

## 2. Developer Workflow & Quality Checks

Run all verification tools directly from `server/`:

### Run Unit Tests
```powershell
pytest -m unit -v
```

### Run Code Formatter & Linter (Ruff)
```powershell
ruff check .
ruff format --check .
```

### Run Static Type Checker (Mypy)
```powershell
mypy app tests
```

### Export OpenAPI Schema
Exports `server/openapi.json` for frontend TypeScript codegen:
```powershell
python scripts/export_openapi.py
```

---

## 3. Live Database Verification & Integration Tests

### Creating the Dedicated Test Database (`event_rental_test`)
To run live integration tests without affecting development data:

1. In MySQL (Workbench or Command Line):
```sql
CREATE DATABASE IF NOT EXISTS event_rental_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON event_rental_test.* TO 'rental_user'@'localhost';
GRANT ALL PRIVILEGES ON event_rental_test.* TO 'rental_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

2. Run migrations against `event_rental_test` from the repo root:
```powershell
# Temporarily override database name in your database/.env or command line
python database\scripts\migrate.py up
```

3. Run integration tests and schema drift validation:
```powershell
$env:TEST_DATABASE_URL="mysql+pymysql://rental_user:YOUR_PASSWORD@127.0.0.1:3306/event_rental_test?charset=utf8mb4"
pytest -m integration -v
```

---

## 4. Documentation Links
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Layered design, transaction model, monetary arithmetic rules.
- [ENV.md](docs/ENV.md) — Reference for all configuration variables and secrets.
- [ENDPOINTS.md](docs/ENDPOINTS.md) — REST endpoint tracking table mapped to frontend services.
