# Rent4Fraction — App Shell & Home Frontend

A pure **React 19 + Vite + TypeScript** single-page application for the Rent4Fraction event equipment rental marketplace in India.

This project was converted from a monolithic Next.js v0 prototype into a modular, production-ready, highly polished Vite architecture following an editorial catalogue aesthetic.

---

## 1. Quick Start

### Prerequisites
- **Node.js**: `v20+` (tested and verified on Node `v24.14.1`)
- **Package Manager**: `npm` (`v10+` / `v11+`)

### Installation & Execution
```bash
# Install dependencies
npm install

# Start Vite local development server
npm run dev

# Run static type checking
npm run typecheck

# Run ESLint validation
npm run lint

# Create production build
npm run build

# Preview production build locally
npm run preview
```

The dev server runs by default on `http://localhost:5173/`.

---

## 2. Project Architecture & Directory Structure

```
FRTEND/home/
├── .gitignore                    # Standard Vite + environment ignores
├── components.json               # Shadcn/ui configuration for Vite (@/ alias)
├── eslint.config.js              # Strict TypeScript + React Hooks ESLint config
├── index.html                    # HTML entry point with pre-paint theme script
├── package.json                  # Clean dependencies (Zero Next.js)
├── tsconfig.json                 # Strict TypeScript bundler configuration
├── tsconfig.node.json            # Vite config TypeScript declaration
├── vite.config.ts                # Vite with React & Tailwind CSS v4 plugins
├── public/
│   ├── favicon.svg               # Brand Package logo mark SVG favicon
│   ├── noise.svg                 # SVG fractal noise texture for paper grain
│   └── images/
│       └── equipment/            # Bespoke vector illustrations for 8 equipment items
├── docs/
│   ├── COMPONENTS.md             # Inventory of reusable shared components & props
│   ├── DESIGN_SYSTEM.md          # Color tokens, typography, radii, motion rules
│   ├── MOVE_TO_CLIENT.md         # Step-by-step guide to move into /client
│   ├── PLAN_HOME.md              # Migration plan, audit log, and size scale table
│   └── screenshots/              # Verified visual captures across viewports/roles
└── src/
    ├── App.tsx                   # Root component with providers & Toaster
    ├── main.tsx                  # StrictMode React 19 entry point
    ├── index.css                 # Tailwind v4 theme, hex tokens & font imports
    ├── routes.tsx                # Single route configuration with ScrollManager
    ├── types/                    # Domain models (EquipmentListingView, Vendor, etc.)
    ├── lib/
    │   ├── utils.ts              # cn() clsx + twMerge utility
    │   ├── format.ts             # formatINR() and date range helpers
    │   └── api/                  # Async data layer with simulated error handling
    ├── hooks/
    │   └── use-async.ts          # Generic async data hook with loading, error, retry
    ├── providers/
    │   ├── theme-provider.tsx    # ThemeProvider (light/dark data-theme, r4f-theme key)
    │   ├── auth-provider.tsx     # MockAuthProvider for 4 roles (visitor, customer, vendor, admin)
    │   └── wishlist-provider.tsx # Persistent localStorage wishlist & cart context
    ├── components/
    │   ├── ui/                   # Button, Badge, Input, Select, Popover, Calendar, Sheet, Accordion
    │   ├── shared/               # AppLink, PriceText, StatusBadge, SectionHeader, EquipmentCard, etc.
    │   ├── layout/               # Navbar (64px, role-aware, mega-menu), Footer, PublicLayout, DashboardLayout
    │   └── home/                 # 9 modular sections of the home page
    └── pages/
        ├── home-page.tsx         # Assembled Home Page
        ├── coming-soon-page.tsx  # Dynamic ComingSoon fallback echoing search queries
        ├── not-found-page.tsx    # 404 handler
        └── preview/              # Dev preview routes for vendor & admin dashboards
```

---

## 3. Removing Dev Utilities for Production

When integrating real Firebase Authentication and FastAPI backends, remove the preview utilities with these 2 simple steps:

1. **Disable Dev Role Switcher**:
   Open `src/components/shared/dev-role-switcher.tsx` and change:
   ```ts
   export const ENABLE_DEV_ROLE_SWITCHER = false
   ```
2. **Remove Preview Routes**:
   In `src/routes.tsx`, delete the `_preview` route definition block and associated imports (`VendorDashboardPreview`, `AdminDashboardPreview`).

---

## 4. Key Design Invariants
- **No Hardcoded Colors**: All UI elements reference CSS custom variables mapped to Tailwind v4 via `@theme inline`.
- **Pure Hex Values**: Strictly hex values without OKLCH for cross-browser stability.
- **Dark Mode**: Applied via `data-theme="dark"` attribute on `<html>`, with pre-paint local script preventing theme flash.
- **Typography**: Fraunces (600/700 with 1 italic accent word per headline) and Inter for body, UI, and tabular figures. Prices never use serif fonts.
- **No Stock Imagery**: Only bespoke vector illustrations and CSS styling.

---

## 5. Routes & Catalog Query Parameters

### Application Routes
- `/`: Home page (hero carousel, canonical category strip, featured equipment, vendors, FAQ).
- `/equipment`: Equipment Catalog page (replaces ComingSoonPage). Supports 3 URL modes.
- `/equipment/:id`: Equipment listing detail view.
- `/checkout`, `/auth`, `/account`, `/help`, `/vendor`, `/admin`: Modular coming soon pages.

### Catalog Modes (`/equipment`)
1. **All Equipment** (`/equipment`): Default view displaying full inventory with 36 items paginated over 3 pages (12 items/page).
2. **Category View** (`/equipment?category=ID`): Displays `CategoryBanner` with category icon tile, headline, description, and sibling category chips with live counts. Supports individual categories (`1`..`8`) or category groups (`101`..`103`).
3. **Vendor Storefront** (`/equipment?vendor=ID`): Displays `VendorHeader` with initials tile, verified checkmark, star rating, city, review count, and disabled "Message vendor" action with login tooltip.

### Query Parameters
| Parameter | Type | Validation / Description |
|---|---|---|
| `q` | `string` | Search keyword (matches name, description, vendor, and category; debounced 300ms). |
| `category` | `string` | Canonical category (`1`..`8`) or group ID (`101`..`103`). Sibling chips filter within group. |
| `vendor` | `string` | Canonical vendor ID (`1`..`4`). |
| `from`, `to` | `YYYY-MM-DD` | Event rental date range. Computes duration `(to - from) + 1` inclusive and calculates deterministic availability. Clamped to ensure `to >= from`. |
| `price_min`, `price_max` | `number` | Daily price bounds clamped between `0` and `10,000` (step `100`). Synced with dual slider and numeric inputs. |
| `rating` | `number` | Minimum rating (`3.5`, `4.0`, or `4.5`). |
| `delivery` | `'1'` | Only show equipment where vendor provides venue delivery. |
| `available` | `'1'` | "Only show available for my dates" (enabled when dates are selected; filters out booked items). |
| `sort` | `string` | `relevance` \| `price_asc` \| `price_desc` \| `rating` \| `reviews` \| `newest`. |
| `page` | `number` | 1-based page number (12 items per page). Filter/sort changes reset page to 1 automatically. |
### Equipment Detail Page (`/equipment/:id`)
- Replaces ComingSoonPage at `/equipment/:id`.
- Desktop (>=1024px): 8-column layout with 4:3 Gallery, Fraunces Title block, sticky scroll-spy Section Nav (`#overview`, `#specifications`, `#availability`, `#reviews`, `#vendor`), 2-month Availability Calendar, verified Reviews with 5-row clickable rating distribution, Vendor info card, and Similar Equipment recommendations; 4-column right sticky 380px Booking Card (top offset 88px, internal scroll).
- Mobile (<1024px): Single column with sticky bottom `MobileBookingBar` opening `BookingSheet` bottom drawer.

### Detail Query Parameters
| Parameter | Type | Validation / Description |
|---|---|---|
| `from`, `to` | `YYYY-MM-DD` | Event rental date range. Computes duration `(to - from) + 1` inclusive and calculates deterministic remaining units. Clamped to ensure `to >= from`. |
| `qty` | `number` | Rental unit quantity. Clamped between 1 and available units for the range (or total stock if no dates). |
| `simulate` | `'error'` \| `'unavailable'` | Dev simulation parameter to verify ErrorState with retry or out-of-stock warning banner with disabled card. |

### Authentication Route (`/auth`) & Route Guards
- `/auth`: Dedicated split-screen authentication page replacing ComingSoonPage. Left 5/12 brand panel with mode crossfade and right 7/12 form card.
- **Route Guards**:
  - `RequireAuth` & `RequireRole`: Protects private sections of the marketplace.
  - `/checkout` & `/account`: Protected for `customer` role.
  - `/vendor`: Protected for `vendor` role (displays vendor dashboard or pending review state).
  - `/vendor/inventory`, `/vendor/orders`: Protected for approved `vendor` role (`requireApprovedVendor: true`).
  - `/admin`: Protected for `admin` role.
  - Unauthorized visitors are redirected to `/auth?mode=login&redirect=<current-path>`.
  - Authenticated users with the wrong role see a polished `Forbidden` (403) EmptyState page.

### Auth Query Parameters
| Parameter | Type | Description |
|---|---|---|
| `mode` | `'login'` \| `'signup'` \| `'vendor'` | Selects the active auth view (default: `'login'`). Kept in sync with browser URL. |
| `redirect` | `string` | Target path to navigate back to upon successful login (sanitized with `sanitizeRedirect` to prevent open-redirect vulnerabilities). |
| `simulate` | `'network'` | DEV ONLY: Simulates network latency failure throwing `auth/network-request-failed`. |

### Customer Hub Route (`/account`)
- `/account`: Complete Customer Hub replacing ComingSoonPage, wrapped in `RequireRole roles={['customer']}`.
- Desktop (>=1024px): Responsive layout with Breadcrumbs, Fraunces H1 "My account", sticky 260px sidebar (top offset 88px) containing `UserSummaryCard`, 44px navigation rows with dynamic badges, 3px active bar, hairline divider, and logout button.
- Mobile (<1024px): Sticky horizontal snap pill tab bar with live badge counts.
- Dynamic page title via `usePageTitle` updated per active tab.

### Account Query Parameters & URL State
| Parameter | Context | Valid Values / Description |
|---|---|---|
| `tab` | Global | `bookings` \| `inbox` \| `wishlist` \| `addresses` \| `profile` \| `payments` \| `reviews` (default: `'bookings'`). |
| `status` | Bookings | `all` \| `upcoming` \| `ongoing` \| `completed` \| `cancelled` (default: `'all'`). |
| `q` | Bookings / Inbox | 300ms debounced search query by booking ID, event title, or conversation keyword. |
| `page` | Bookings / Payments | 1-based page number (6 bookings / 10 payments per page). |
| `booking` | Bookings | Booking ID (e.g. `BK-1042`). Opens the 600px desktop Sheet / 95vh mobile bottom drawer with focus trapping. |
| `view` | Inbox / Reviews | In Inbox: `'messages'` \| `'notifications'`. In Reviews: `'to-review'` \| `'mine'`. |
| `thread` | Inbox | Conversation thread ID (e.g. `TH-101`). Opens master-detail pane on desktop, full-screen thread with back button on mobile. |
| `nf` | Inbox Notifications | `'all'` \| `'unread'`. |
| `sort` | Wishlist | `'added'` \| `'price_asc'` \| `'price_desc'` \| `'rating'`. |
| `from`, `to` | Wishlist | DateRangePicker filters computing live availability and rental costs. |
| `address` | Addresses | `'new'` \| `<address_id>`. Opens the `AddressFormSheet`. |
| `type` | Payments | `'all'` \| `advance` \| `full` \| `deposit` \| `refund` \| `deposit_refund`. |
| `simulate` | Dev testing | `'empty'` \| `'error'` \| `'sendfail'` \| `'reauth'`. |

### DEV ONLY Mock Accounts
> [!IMPORTANT]
> **DEV ONLY**: The following mock accounts are stored in `src/lib/auth/mock-accounts.ts` and exist for local development, pairing, and manual testing. New registrations persist in the browser's `localStorage` (`r4f-auth-user-v1`). Account data persists in `r4f-account-store-v1`.

| Role | Name | Email | Password | Status |
|---|---|---|---|---|
| **Customer** | Aarav Mehta | `aarav@example.com` | `Customer@123` | Active & Verified |
| **Vendor (Approved)** | Sargam Sound Systems | `sargam@example.com` | `Vendor@123` | Approved |
| **Vendor (Pending)** | New Era Sound & Lights | `newvendor@example.com` | `Vendor@123` | Pending Admin Review |
| **Admin** | Super Administrator | `admin@example.com` | `Admin@123` | Full Access |

> [!NOTE]
> **Build & Lint Scope**: The legacy Next.js reference prototypes in `_v0/catalog/`, `_v0/equipment-detail/`, `_v0/auth/`, and `_v0/account/` are completely excluded from the project's build, TypeScript typecheck (`tsconfig.json`), and ESLint (`eslint.config.js`) configurations. All customer hub and marketplace functionality runs purely in Vite + React.


