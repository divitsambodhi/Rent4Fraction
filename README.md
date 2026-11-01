<a id="readme-top"></a>

<br />
<div align="center">
  <h1>Rent4Fraction</h1>

  <p align="center">
    A vendor-to-customer marketplace for event equipment rental: sound, lighting, stage, AV and photography gear.
    <br />
    <em>100% Cash on Delivery · 0% platform commission · Admin-moderated trust and safety.</em>
    <br /><br />
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#live-deployments">Live Deployments</a></li>
    <li><a href="#business-model">Business Model</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#environment-variables">Environment Variables</a></li>
    <li><a href="#core-features-and-pages">Core Features and Pages</a></li>
    <li><a href="#roles-and-permissions">Roles and Permissions</a></li>
    <li><a href="#key-workflows">Key Workflows</a></li>
    <li><a href="#database">Database</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#testing">Testing</a></li>
    <li><a href="#deployment">Deployment</a></li>
    <li><a href="#design-language">Design Language</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#team">Team</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

**Rent4Fraction** connects professional equipment vendors directly with event organizers and individuals. Customers browse a live catalog, check real-time availability for their dates and request a booking. Vendors accept or decline, deliver the equipment and settle payment in cash on delivery. The platform never touches the money: there are no payment gateways, no escrow and no commission. The platform administrator acts strictly as a trust, safety and listing moderator.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LIVE DEPLOYMENTS -->
## Live Deployments

| Component | Platform |
|:---|:---|
| **Web Application** | Vercel |
| **API Backend** | Render |
| **Database** | Aiven |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- BUSINESS MODEL -->
## Business Model

1. **Direct vendor-to-customer, COD only.** No card, UPI or gateway transactions are processed. Rental fees and security deposits are settled between customer and vendor at delivery and inspection, which avoids escrow delays, gateway fees and payment failures.
2. **Zero platform commission.** Vendors keep 100% of their stated price. The platform is a matching and coordination marketplace, not a payment intermediary.
3. **Admin as moderator and verifier.** Admins collect no funds. They verify vendor legitimacy (GSTIN, government ID, business address) before granting listing privileges, review disputed bookings and damage claims, moderate listings and monitor audit logs.
4. **Strict timezone invariant.** Every timestamp is stored in **UTC**. Every customer- and vendor-facing screen displays **Indian Standard Time (IST, UTC+05:30)**.
5. **Non-locking inventory.** Adding to cart or wishlist never reserves stock. Availability is computed in real time against active bookings (`pending_vendor`, `confirmed`, `out_for_delivery`, `active`) and vendor maintenance blocks.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
* [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
* [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
* [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
* [![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)](https://reactrouter.com/)
* [![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radixui&logoColor=white)](https://www.radix-ui.com/)
* [![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
* [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
* [![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
* [![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy_2-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
* [![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
* [![Firebase](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
* [![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
* [![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
* [![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com/)

**Frontend (`client/`)**: React 19 SPA with TypeScript 5.7 and Vite 6; React Router v7 with chunk-level code splitting and route prefetching; Tailwind CSS v4, Lucide and Tabler icons, Radix UI primitives; React Hook Form with Zod v4; client-side media pipeline (HEIC/HEIF conversion via `heic2any`, EXIF orientation fix, canvas downscaling to max 2000 px, WebP, at most 5 MB).

**Backend (`server/`)**: FastAPI on Python 3.12 with Uvicorn; SQLAlchemy 2.0 with PyMySQL and connection pooling; Pydantic v2 and `pydantic-settings`; Firebase Admin SDK for server-side ID-token verification, PyJWT and Cryptography.

**Database (`database/`)**: MySQL 8.0 on Aiven with 20 idempotent migrations, foreign-key integrity, triggers, stored procedures, availability views and audit logging.

**Third-party services**: Firebase Authentication (email/password and Google OAuth); Cloudinary with direct, signed browser uploads verified by the API.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ARCHITECTURE -->
## Architecture

```
                       +---------------------------------------+
                       |             User Browser              |
                       |       (React 19 + Vite on Vercel)     |
                       +-------------------+-------------------+
                                           |
                    +----------------------+----------------------+
                    |                      |                      |
             REST API Calls         Auth Token Flow        Direct Media Upload
                    |                      |                      |
                    v                      v                      v
         +--------------------+  +--------------------+  +--------------------+
         |   FastAPI Server   |  |   Firebase Auth    |  |  Cloudinary Media  |
         | (Python on Render) |  |  (Google & Email)  |  |  (Signed Storage)  |
         +---------+----------+  +---------+----------+  +--------------------+
                   |                       |
            PyMySQL Connection       Token Verify
                   |                       |
                   v                       v
         +--------------------+  +--------------------+
         |   MySQL on Aiven   |  | Firebase Admin SDK |
         | (Tables, Triggers) |  | (Service Account)  |
         +--------------------+  +--------------------+
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

To get a local copy running, follow these steps.

### Prerequisites

* [Node.js](https://nodejs.org/) v20 or higher
* [Python](https://www.python.org/) 3.12
* MySQL 8.0 (local, or an Aiven connection)
* [Git](https://git-scm.com/)

### Installation

All commands are for Windows PowerShell.

1. **Set up the database** (from the repository root)
```powershell
   cp database\.env.example database\.env
   # Edit database\.env with your MySQL credentials, for example:
   # DATABASE_URL=mysql+pymysql://rental_user:password@127.0.0.1:3306/event_rental?charset=utf8mb4

   python database\scripts\migrate.py up
   python database\scripts\run_checks.py
```

2. **Set up and start the backend**
```powershell
   cd server
   python -m venv .venv312
   .\.venv312\Scripts\Activate.ps1
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   cp .env.example .env
   python -m uvicorn app.main:app --reload --port 8000
```
   Interactive API docs are available locally at `http://127.0.0.1:8000/docs` and `/redoc` (disabled in production).

3. **Set up and start the frontend** (in a new terminal)
```powershell
   cd client
   npm install
   cp .env.example .env.local
   npm run dev
```
   The app runs at `http://localhost:5173`.

4. **Create the first admin.** Register the account through the app, then promote it:
```powershell
   cd server
   python scripts/create_admin.py --email <your-email> --yes
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ENVIRONMENT VARIABLES -->
## Environment Variables

Never commit real values. Only the `.env.example` files with empty values belong in the repository.

### Backend (`server/.env`)

| Variable | Required | Default | Description |
|:---|:---:|:---:|:---|
| `ENV` | Yes | `dev` | Application environment (`dev`, `test`, `prod`). |
| `LOG_LEVEL` | No | `INFO` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `DATABASE_URL` | Yes | - | MySQL connection string (`mysql+pymysql://user:pass@host:port/db`). |
| `DB_SSL_NO_VERIFY` | No | `false` | Disables SSL certificate verification for cloud MySQL. Avoid in production; prefer the provider's CA certificate. |
| `CORS_ORIGINS` | Yes | - | Comma-separated list of allowed web client origins. |
| `FRONTEND_URL` | Yes | - | Canonical URL of the frontend web application. |
| `FIREBASE_PROJECT_ID` | Yes | - | Firebase project identifier. |
| `FIREBASE_CREDENTIALS_BASE64` | No | - | Base64-encoded Firebase service-account JSON (production). |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | - | Path to the Firebase service-account JSON (local development). |
| `STORAGE_PROVIDER` | Yes | `cloudinary` | Storage backend (`cloudinary`, or `fake` in tests only). |
| `CLOUDINARY_CLOUD_NAME` | Yes | - | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Yes | - | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Yes | - | Cloudinary API secret (server only). |
| `CLOUDINARY_UPLOAD_PRESET_PUBLIC` | Yes | `rent4fraction_public` | Signed upload preset for equipment and public avatar images. |
| `CLOUDINARY_UPLOAD_PRESET_PRIVATE` | Yes | `rent4fraction_private` | Signed upload preset for private assets. |
| `COD_ENABLED` | Yes | `true` | Enables Cash on Delivery checkout. |
| `PAYMENTS_ONLINE_ENABLED` | Yes | `false` | Must stay `false` for the zero-commission COD marketplace. |
| `ENABLE_SCHEDULER` | No | `true` | Enables background jobs that expire unanswered booking requests. |

### Frontend (`client/.env.local`)

| Variable | Required | Description |
|:---|:---:|:---|
| `VITE_API_BASE_URL` | Yes | Base URL of the backend API (`http://127.0.0.1:8000` locally, the Render URL in production). |
| `VITE_CLOUDINARY_CLOUD_NAME` | Yes | Public Cloudinary cloud name for media rendering. |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase web API key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase authentication domain. |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project identifier. |
| `VITE_FIREBASE_STORAGE_BUCKET` | No | Firebase storage bucket (not used for media; Cloudinary handles uploads). |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID. |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase web application ID. |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CORE FEATURES -->
## Core Features and Pages

### Public catalog
* Home, category browsing and a searchable catalog with filters, sorting and URL-synced state.
* Equipment detail pages with real-time availability for the chosen rental dates.
* Vendor pages and reviews.

### Customer
* Email/password and Google sign-in, with Email verification.
* Cart and wishlist (cart and "save for later" never reserve stock).
* Multi-vendor COD checkout: request a booking, track each vendor's response, cancel, review after return.
* Addresses, notifications and messaging with vendors.

### Vendor console
* Vendor application, admin verification (GSTIN, government ID, business address) and approved-vendor gating.
* Equipment management with image uploads, availability and maintenance blocks.
* Order inbox: accept or decline, mark out for delivery, returned, and file damage claims.
* Inbox, notifications, reviews and profile.

### Admin console
* Vendor verification and listing moderation.
* Dispute and damage-claim resolution.
* User promotion and audit logs.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROLES -->
## Roles and Permissions

| Capability / Resource | Visitor | Customer | Pending Vendor | Approved Vendor | Admin Moderator |
|:---|:---:|:---:|:---:|:---:|:---:|
| Browse and search catalog | Yes | Yes | Yes | Yes | Yes |
| Check equipment availability | Yes | Yes | Yes | Yes | Yes |
| Add to cart and wishlist | Yes (local) | Yes (DB) | Yes | Yes | Yes |
| Request booking (COD checkout) | No | Yes | No | No | No |
| View customer account and orders | No | Yes | No | No | No |
| Apply for vendor partnership | Yes | Yes | In review | Approved | Yes |
| List and manage equipment | No | No | No | Yes | Yes (moderate) |
| Accept or decline booking orders | No | No | No | Yes | Yes |
| Mark out for delivery / returned | No | No | No | Yes | Yes |
| File equipment damage claim | No | No | No | Yes | Yes |
| Moderate listings and vendors | No | No | No | No | Yes |
| Resolve disputes and claims | No | No | No | No | Yes |
| Promote users and view audit logs | No | No | No | No | Yes |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- KEY WORKFLOWS -->
## Key Workflows

### 1. Role-intent authentication
When a user chooses "Become a Vendor" or "Sign in as Vendor", the intent is stored in `sessionStorage` under `r4f-role-intent-v1`. It survives Google popups and redirects, and the auth provider reads it on first-time registration to create the vendor record in `pending` status. After registration the server database record is the single source of truth, and client-side tokens can never elevate permissions.

### 2. Real-time date availability
For equipment over a range `[start_date, end_date]`:

$$\text{Available} = \text{Total Quantity} - \max_{d \in [\text{start}, \text{end}]} \left( \sum \text{Booked Quantity}(d) + \sum \text{Maintenance Quantity}(d) \right)$$

A request is accepted only if the available quantity covers the requested quantity on every day of the rental window.

### 3. Multi-vendor Cash on Delivery checkout
A cart may contain equipment from several independent vendors. At checkout the server creates:
1. One parent `Booking` master record.
2. One child `VendorOrder` per vendor involved.
3. `BookingItem` snapshots that preserve the price, deposit and equipment state at checkout time.

Each vendor is notified immediately and has 24 hours to accept or decline their part of the booking. Payment is settled physically on delivery.

### 4. Client-side image optimization
Before any file reaches Cloudinary, `image-processing.ts`:
1. Converts `.heic`/`.heif` to `.jpg`/`.webp` with a dynamically imported `heic2any`.
2. Reads EXIF data and normalizes orientation.
3. Resizes to at most 2000 x 2000 px, keeping the aspect ratio.
4. Compresses to WebP, targeting under 5 MB.

FastAPI issues signed upload credentials (`/api/v1/uploads/signature`), so browsers upload directly and securely to Cloudinary without loading the API server.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DATABASE -->
## Database

MySQL 8.0 with 20 idempotent migrations (`database/migrations/001` to `020`), foreign keys, triggers, stored procedures, availability views and audit logging. Core entities:

| Entity | Purpose |
|---|---|
| **Users / Vendors** | Accounts linked to Firebase identities, role and approval status, business verification details. |
| **Categories / Equipment** | Catalog structure, listings, pricing, deposits and quantities. |
| **Availability blocks** | Vendor maintenance blocks that reduce available stock. |
| **Booking** | Parent record for one customer checkout. |
| **VendorOrder** | Per-vendor child order with its own accept/decline lifecycle. |
| **BookingItem** | Snapshot of price, deposit and equipment state at checkout. |
| **Reviews, Messages, Notifications** | Community and communication records. |
| **Disputes / Damage claims** | Moderated resolution records. |
| **Audit log** | Administrative and security-relevant actions. |

Migrations are applied with `python database\scripts\migrate.py up` and the schema is verified with `python database\scripts\run_checks.py`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- PROJECT STRUCTURE -->
## Project Structure

```
Rent4Fraction/
├── client/                           # React 19 + TypeScript frontend
│   ├── public/                       # Static assets (favicons, manifest)
│   ├── scripts/                      # Build, bundle-leak, mobile and quality scripts
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                 # Auth dialogs, route guards (RequireRole)
│   │   │   ├── catalog/              # Equipment cards, filter bars, date range pickers
│   │   │   ├── checkout/             # COD booking flow, address selectors, cart items
│   │   │   ├── layout/               # Navbar, footer, public / vendor / admin shells
│   │   │   ├── shared/               # Image uploaders, badges, responsive tables
│   │   │   ├── ui/                   # Design-system primitives (Radix UI wrappers)
│   │   │   └── vendor/               # Equipment editor, inventory tables, order management
│   │   ├── hooks/                    # Auth, cart and notification hooks
│   │   ├── lib/                      # API client, Cloudinary helpers, date/currency formatters
│   │   ├── pages/                    # Route pages (Home, Catalog, Checkout, Admin, ...)
│   │   ├── providers/                # AuthProvider, ToastProvider, CartProvider
│   │   ├── routes.tsx                # Route tree and lazy loading
│   │   ├── index.css                 # Global CSS and Tailwind directives
│   │   └── main.tsx                  # Application entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                           # FastAPI backend
│   ├── app/
│   │   ├── core/                     # Config, DB engine, errors, security, middleware
│   │   ├── integrations/             # Firebase and Cloudinary adapters
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   ├── repositories/             # Database access layer
│   │   ├── routers/                  # API endpoints (catalog, checkout, vendor, admin, auth, uploads)
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── services/                 # Domain logic (availability, disputes, orders)
│   │   └── main.py                   # App initialization and CORS setup
│   ├── scripts/                      # Admin promotion, seeding and database utilities
│   ├── tests/                        # pytest suite (unit and integration)
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── render.yaml                   # Render deployment config
│
├── database/
│   ├── migrations/                   # 001 to 020 SQL schema and trigger migrations
│   ├── scripts/                      # migrate.py and run_checks.py
│   ├── seeds/                        # Category seed data (development seeds are never run in production)
│   └── README.md
│
├── render.yaml                       # Root Render deployment blueprint
└── README.md
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- TESTING -->
## Testing

**Frontend** (from `client/`)
```powershell
npm run typecheck        # TypeScript
npm run lint             # ESLint
npm run test             # Vitest unit tests
npm run check:release    # Production build and bundle-leak checks
npm run test:mobile      # Mobile viewport regression tests
npm run autobug:fast     # Automated role, navigation and dead-control audit
```

**Backend** (from `server/`)
```powershell
python -m pytest tests/unit/ -v
python -m ruff check .
python -m mypy --explicit-package-bases app tests scripts
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DEPLOYMENT -->
## Deployment

1. **Database (Aiven).** Apply pending migrations *before* deploying new backend code:
```powershell
   python database\scripts\migrate.py up
```
2. **API (Render).** `render.yaml` pins Python 3.12.10. Set `DATABASE_URL`, `FIREBASE_CREDENTIALS_BASE64`, `CLOUDINARY_*`, `CORS_ORIGINS` and `FRONTEND_URL`, then confirm readiness:
```powershell
   curl.exe -s "https://rent4fraction.onrender.com/health/ready"
```
3. **Web (Vercel).** Set `VITE_API_BASE_URL`, `VITE_FIREBASE_*` and `VITE_CLOUDINARY_CLOUD_NAME`, and run `npm run check:release` before pushing.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DESIGN LANGUAGE -->
## Design Language

Rent4Fraction uses a restrained, editorial look: a warm cream canvas, ceremonial wine as the single brand color, and a serif and sans pairing that feels curated rather than corporate. The same tokens drive a light and a dark mode, and the theme choice is stored in `localStorage` as `r4f_theme`.

### Core Color Palette

#### Brand

| Token | Light Mode | Dark Mode | Description |
| :--- | :--- | :--- | :--- |
| **Primary** | `#762B36` | `#B65362` | Deep Ceremonial Wine in light mode, Dusky Rose in dark mode. |
| **Primary hover** | `#60212B` | `#C86B79` | Inkwell in light mode, Blush in dark mode. |

#### Neutrals

| Role | Light Mode | Dark Mode |
| :--- | :--- | :--- |
| **Page background** | `#F7F6F3` (warm cream) | `#191A1D` (near-black) |
| **Surface / cards** | `#FFFFFF` | `#232428` (charcoal) |
| **Ink / headings** | `#252629` | `#F2F0EE` |
| **Helper text** | `#68686D` (stone) | `#B8B7BC` (silver) |
| **Muted fills** | `#EFECE6` | `#2A2B30` |
| **Borders** | `#E5E2DE` (hairline) | `#393A40` |

#### Semantic

| Role | Light Mode | Dark Mode |
| :--- | :--- | :--- |
| **Success** | `#16804A` (forest green) | `#4CC58A` (mint) |
| **Warning** | `#B7791F` (amber) | `#E6B65C` (gold) |
| **Info** | `#356AC3` (dispatch blue) | `#79A9FF` (sky) |
| **Danger** | `#C43D43` (crimson) | `#FF777B` (coral) |

**Gradients** are strictly monochromatic: wine tints or warm neutral fades only. Rainbow combinations are not allowed, and ESLint rules enforce this.

### Typography

A two-typeface system:

* **Fraunces Variable** (optical-size serif): display headings and editorial section titles only.
* **Nunito Sans Variable** (geometric humanist sans): everything else, including body text, labels, UI, tables and prices.

The scale has 10 named tokens, from `.text-display` (`clamp(32px to 40px)`, Fraunces 400) down to `.text-label-sm` (12px, Nunito 400).

**Rule:** every `₹` price, rating, count and duration uses `tabular-nums` so digits stay aligned.

### Motion

One easing curve is used everywhere: `cubic-bezier(0.16, 1, 0.3, 1)`, a fast entry with a springy settle.

| Animation | Duration | Where |
| :--- | :--- | :--- |
| Button tap compress | 100ms | Every button and link |
| Calendar month slide | 180ms | Date picker |
| Checkout step slide | 200ms | Checkout rail (16px translate) |
| Page route fade | 160 to 180ms | View Transitions API |
| Switch thumb stretch | 150 to 200ms | Toggle switches |
| Navbar border fade-in | 200ms | On scroll past 10px |

**Reduced motion:** `prefers-reduced-motion: reduce` acts as a full kill switch, dropping all durations to `0.01ms`.

### Layout Tokens

* **Z-index stack (8 layers):** content (0), sticky header (30), sticky bar (40), navbar (50), sheet (60), dialog (70), toast (80).
* **Shape:** controls `4px`, cards `8px`, pills `9999px` (fully round), search bars as full pills.
* **Elevation:** flat at rest (border only), `shadow-sm` on hover, `shadow-md` for popovers, `shadow-xl` for modals.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] COD checkout with multi-vendor orders
- [x] Real-time date availability
- [x] Firebase email and Google authentication with role intent
- [x] Cloudinary signed uploads with client-side optimization
- [x] Admin moderation: vendor verification, disputes, audit logs
- [x] Production deployment on Vercel, Render and Aiven

### Future Goals

- [ ] Phone OTP login
- [ ] Shared rate-limit store (Redis) for multi-instance deployments
- [ ] Admin multi-factor authentication
- [ ] Uptime monitoring and error tracking
- [ ] Custom domain

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- TEAM -->
## Team

<a href="https://github.com/divitsambodhi"><img src="https://images.weserv.nl/?url=github.com/divitsambodhi.png&h=60&w=60&fit=cover&mask=circle" width="60px" alt="divitsambodhi"/></a>
<a href="https://github.com/harshalprasad"><img src="https://images.weserv.nl/?url=github.com/harshalprasad.png&h=60&w=60&fit=cover&mask=circle" width="60px" alt="harshalprasad"/></a>
<a href="https://github.com/Chintan-Makvana"><img src="https://images.weserv.nl/?url=github.com/Chintan-Makvana.png&h=60&w=60&fit=cover&mask=circle" width="60px" alt="Chintan-Makvana"/></a>
<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

This project is proprietary software developed for the Rent4Fraction equipment rental platform. All rights reserved.

<p align="right">(<a href="#readme-top">back to top</a>)</p>