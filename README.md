# Rent4Fraction 🎪📦

> **Modern Multi-Vendor Event Equipment Rental Platform**  
> Browse, rent, and schedule sound systems, stage lighting, photography gear, audio-visual setups, and event essentials with automated date-based availability, multi-vendor order fulfillment, and commission management.

---

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12-blue?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styles-Tailwind%20CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208.0+-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Cloudinary](https://img.shields.io/badge/Media-Cloudinary-3448C5?style=flat&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Database Setup (MySQL)](#1-database-setup-mysql)
  - [2. Backend Setup (FastAPI)](#2-backend-setup-fastapi)
  - [3. Frontend Setup (React + Vite)](#3-frontend-setup-react--vite)
- [Environment Configuration](#-environment-configuration)
- [Database Migrations & Seeding](#-database-migrations--seeding)
- [API Documentation](#-api-documentation)
- [Testing & Quality Checks](#-testing--quality-checks)
- [Contributing & Branching Workflow](#-contributing--branching-workflow)

---

## 🌟 Overview

**Rent4Fraction** is an enterprise-ready event equipment rental marketplace connecting event planners, corporate organizers, and individuals with local, verified equipment vendors. 

From small private parties to multi-day music festivals and corporate summits, Rent4Fraction handles the entire rental lifecycle: real-time availability checks, double-booking prevention, multi-vendor split orders, delivery and return workflows, security deposits, damage dispute handling, and vendor payouts.

---

## 🚀 Key Features

### 🛒 Customer Experience
- **Smart Catalog & Discovery**: Filter by categories (Audio, Lighting, Staging, AV, Cameras), brand, price range, and date availability.
- **Strict Date Range Availability**: Live calculation prevents overbooking across overlapping rental dates.
- **Cart & Saved Wishlists**: Add equipment items, configure rental duration, and save favorites.
- **Multi-Vendor Single Checkout**: Transparent fee breakdown including refundable security deposits, delivery charges, and taxes.
- **Booking & Delivery Tracking**: Real-time status updates from vendor confirmation to dispatch, delivery, and return inspection.
- **Customer Reviews & Ratings**: Submit verified feedback and ratings after rental completion.

### 🏢 Vendor Dashboard
- **Inventory Management**: Create, update, and manage equipment listings, daily rates, stock levels, and specs.
- **Availability Calendar**: Schedule routine maintenance, block off private bookings, and view incoming orders.
- **Order Lifecycle Management**: Accept or reject order requests, mark items dispatched, delivered, and inspect returns.
- **Damage & Dispute Reports**: Log equipment condition issues with photo proof on return.
- **Payout Tracking**: View earned revenue, platform commission deductions, and payout history.

### 🛡️ Admin Control Panel
- **Vendor KYC & Verification**: Review business licenses, GST credentials, and approve/suspend vendor accounts.
- **Platform Commission Governance**: Configure platform-wide, category-specific, or vendor-customized commission rates.
- **Dispute Resolution Center**: Mediate security deposit claims and damage disputes between customers and vendors.
- **Audit Logs & Metrics**: Monitor transaction volumes, active bookings, user activity, and platform health.

### ⚙️ Core Platform Architecture
- **Concurrency & Anti-Overbooking**: Implements MySQL stored functions (`get_available_quantity`), database-level triggers, and pessimistic locking (`SELECT ... FOR UPDATE`) to guarantee zero race-condition overbookings.
- **Media CDN (Cloudinary)**: Fast, optimized image uploads and CDN delivery for product listings and KYC documentation.
- **Hybrid Payments**: Cash On Delivery (COD) marketplace governance alongside optional online payment gateway integration (Razorpay).
- **Role-Based Access Control (RBAC)**: Secure access policies enforced across `customer`, `vendor`, and `admin` roles.

---

## 🏗️ System Architecture

```
                       ┌───────────────────────────────┐
                       │     React 19 + Vite Client    │
                       │    (Tailwind CSS + Radix UI)   │
                       └───────────────┬───────────────┘
                                       │ HTTP / REST
                                       ▼
                       ┌───────────────────────────────┐
                       │      FastAPI Backend API      │
                       │  • Rate Limiting Middleware    │
                       │  • Request Context & CORS      │
                       │  • RBAC & Firebase Auth        │
                       └───────┬───────────────┬───────┘
                               │               │
                 SQLAlchemy 2.0│               │ Uploads
                               ▼               ▼
           ┌────────────────────────┐    ┌───────────────┐
           │     MySQL 8.0+ / 8.4   │    │  Cloudinary   │
           │  • 20 Migrations       │    │  Image / File │
           │  • Triggers & Views    │    │  CDN Storage  │
           │  • Stored Functions    │    └───────────────┘
           └────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI, Lucide & Tabler Icons, React Router v7, React Hook Form, Zod |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, Pydantic Settings, PyJWT |
| **Database & ORM** | MySQL 8.0.16+ / 8.4 LTS, SQLAlchemy 2.0, PyMySQL, Raw SQL Migrations |
| **Authentication** | Firebase Admin SDK / Firebase Client SDK (Email & Password, Google Sign-In) |
| **Storage & Media** | Cloudinary REST API & SDK |
| **Testing & Tooling** | Pytest, Playwright, Vitest, Ruff, MyPy, ESLint |

---

## 📂 Project Directory Structure

```text
Rent4Fraction/
├── client/                     # React 19 + TypeScript + Vite frontend
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── components/         # Shared UI components (Radix + Tailwind)
│   │   ├── features/           # Feature slices (auth, catalog, cart, bookings, vendor, admin)
│   │   ├── lib/                # API client, Firebase, utility functions
│   │   ├── routes/             # App routing configuration
│   │   └── types/              # TypeScript declarations
│   ├── tests/                  # Playwright and unit tests
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # FastAPI backend
│   ├── app/
│   │   ├── core/               # App configuration, security, DB session, middleware
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── repositories/       # Data access layer
│   │   ├── routers/            # API endpoints (catalog, cart, bookings, vendor, admin, etc.)
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic
│   │   └── main.py             # FastAPI application factory
│   ├── scripts/                # Utility scripts (admin creation, Cloudinary smoke test)
│   ├── tests/                  # Pytest unit & integration test suites
│   ├── pyproject.toml
│   └── requirements.txt
│
├── database/                   # Database migrations, schema, and seed data
│   ├── migrations/             # 20 incremental SQL migration files
│   ├── seeds/                  # SQL seed data (categories, users, equipment, bookings)
│   ├── scripts/
│   │   ├── migrate.py          # Automated migration runner
│   │   ├── seed.py             # Database seed runner
│   │   └── run_checks.py       # Pre-flight schema checks
│   └── tests/                  # Database integrity check scripts
│
└── README.md                   # Project documentation
```

---

## ⚡ Getting Started

### Prerequisites

Ensure you have the following installed on your system:
- **Node.js** (v18.0.0 or higher) & **npm**
- **Python** (v3.11 or v3.12)
- **MySQL Server** (v8.0.16+ or v8.4 LTS)
- **Git**

---

### 1. Database Setup (MySQL)

#### A. Install and Start MySQL

- **macOS** (Homebrew):
  ```bash
  brew install mysql
  brew services start mysql
  ```
- **Ubuntu / Debian**:
  ```bash
  sudo apt update && sudo apt install mysql-server
  sudo systemctl start mysql
  ```
- **Windows**:
  Download and install [MySQL Installer](https://dev.mysql.com/downloads/installer/) (MySQL Community Server 8.0/8.4).

#### B. Initialize Database & Application User

Connect to MySQL as `root`:
```bash
mysql -u root -p
```

Run the following SQL commands to create the database and dedicated user:
```sql
CREATE DATABASE IF NOT EXISTS event_rental CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'rental_user'@'localhost' IDENTIFIED BY 'Real67Human69@Rent';
CREATE USER IF NOT EXISTS 'rental_user'@'127.0.0.1' IDENTIFIED BY 'Real67Human69@Rent';
GRANT ALL PRIVILEGES ON event_rental.* TO 'rental_user'@'localhost';
GRANT ALL PRIVILEGES ON event_rental.* TO 'rental_user'@'127.0.0.1';

-- Enable stored function creation with binary logging enabled:
SET GLOBAL log_bin_trust_function_creators = 1;

FLUSH PRIVILEGES;
EXIT;
```

#### C. Run Migrations & Seed Data

```bash
cd Rent4Fraction/database

# Setup environment config
cp .env.example .env

# Run migrations (creates tables, functions, triggers, and views)
python scripts/migrate.py up

# Seed initial categories, demo equipment, vendors, and admin accounts
python scripts/seed.py
```

---

### 2. Backend Setup (FastAPI)

1. Navigate to the `server` directory:
   ```bash
   cd ../server
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate

   # Windows
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure server environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `DATABASE_URL` matches your MySQL credentials from Step 1).*

5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   The backend API will be live at `http://127.0.0.1:8000`.

---

### 3. Frontend Setup (React + Vite)

1. Navigate to the `client` directory:
   ```bash
   cd ../client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure frontend environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🔐 Environment Configuration

### Server (`server/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `ENV` | Environment mode (`dev`, `test`, `prod`) | `dev` |
| `LOG_LEVEL` | Application logging verbosity (`DEBUG`, `INFO`, `ERROR`) | `INFO` |
| `DATABASE_URL` | MySQL connection string (`mysql+pymysql://...`) | `mysql+pymysql://rental_user:...@127.0.0.1:3306/event_rental?charset=utf8mb4` |
| `CORS_ORIGINS` | Permitted cross-origin endpoints | `http://localhost:5173,http://127.0.0.1:5173` |
| `STORAGE_PROVIDER` | Media storage driver (`cloudinary` or `fake` in dev) | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name | Configured |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Configured |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Configured |
| `COD_ENABLED` | Toggle Cash On Delivery checkout | `true` |
| `PAYMENTS_ONLINE_ENABLED`| Toggle Razorpay payment gateway | `false` |

### Client (`client/.env.local`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_MODE` | API connection mode (`real` for backend, `mock` for local fixtures) | `real` |
| `VITE_API_BASE_URL` | Base URL of the FastAPI backend | `http://127.0.0.1:8000` |
| `VITE_FIREBASE_API_KEY` | Firebase Client API key | Firebase credentials |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain | Firebase credentials |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project identifier | `rent4fraction` |

---

## 🗄️ Database Migrations & Seeding

The platform includes a dedicated migration runner with built-in schema versioning:

```bash
cd Rent4Fraction/database

# Check connection and database health
python scripts/migrate.py check

# Check status of applied / pending migrations
python scripts/migrate.py status

# Apply all pending migrations
python scripts/migrate.py up

# Reset database & re-run all migrations (localhost only)
python scripts/migrate.py reset --yes

# Run test queries and data integrity checks
python scripts/run_checks.py
```

---

## 📖 API Documentation

Interactive API documentation is automatically generated by FastAPI:

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **OpenAPI JSON**: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

### Key API Modules
- `/api/v1/auth`: Registration, session tokens, user profiles.
- `/api/v1/catalog`: Equipment search, category hierarchy, date availability check.
- `/api/v1/cart`: Add, update, and remove cart items.
- `/api/v1/checkout`: Estimates, delivery calculations, coupon validation, order placement.
- `/api/v1/bookings`: Order lifecycle, cancellation, status tracking.
- `/api/v1/vendor`: Vendor inventory, order fulfillment, blockouts, payouts.
- `/api/v1/admin`: Vendor onboarding, disputes, platform metrics, commission overrides.

---

## 🧪 Testing & Quality Checks

### Backend Tests
```bash
cd Rent4Fraction/server

# Run all unit tests
pytest -m unit

# Run code style & linting with Ruff
ruff check .
ruff format --check .

# Run static type checking with MyPy
mypy app
```

### Frontend Checks
```bash
cd Rent4Fraction/client

# Type-check TypeScript code
npm run typecheck

# Lint with ESLint
npm run lint

# Run unit tests
npm test

# Run mobile responsiveness tests
npm run test:mobile
```

---

## 🌿 Contributing & Branching Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b <your-name>/<feature-name>
   ```
2. Make your changes, adhering to code style rules and tests.
3. Commit with clear, descriptive messages:
   ```bash
   git commit -m "feat(catalog): add date availability filtering"
   ```
4. Push your branch to GitHub and submit a Pull Request:
   ```bash
   git push -u origin <your-name>/<feature-name>
   ```

---

## 📄 License

This project is developed for educational and commercial event equipment rental operations. All rights reserved.
