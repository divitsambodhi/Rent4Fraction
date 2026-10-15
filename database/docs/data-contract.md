# Data Contract — Event Equipment Rental Platform

Single source of truth for the **FastAPI Backend** and **React Frontend (TypeScript)** code generation.

---

## 1. Canonical ENUM Definitions

Use these exact definitions to generate Pydantic ENUMs in Python and TypeScript Union types in React.

```typescript
// ============================================================================
// Canonical Types (TypeScript) / Pydantic StrEnum (Python)
// ============================================================================

export type UserRole = 'customer' | 'vendor' | 'admin';

export type VendorApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type EquipmentStatus = 'active' | 'inactive' | 'out_of_stock' | 'archived';

export type AvailabilityReason = 'maintenance' | 'vendor_blocked' | 'booked';

export type AvailabilityStatus = 'active' | 'inactive';

export type CouponType = 'percent' | 'flat';

export type BookingPaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type VendorOrderStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'dispatched'
  | 'delivered'
  | 'returned'
  | 'completed'
  | 'cancelled';

export type BookingItemStatus = 'pending' | 'confirmed' | 'delivered' | 'returned' | 'cancelled';

export type PaymentType = 'advance' | 'full' | 'deposit' | 'refund' | 'deposit_refund';

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cod' | 'wallet';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export type DeliveryType = 'delivery' | 'pickup';

export type DeliveryStatus = 'scheduled' | 'out_for_delivery' | 'delivered' | 'failed';

export type ReturnStatus = 'scheduled' | 'returned' | 'late' | 'incomplete';

export type ItemCondition = 'good' | 'minor_damage' | 'major_damage' | 'lost';

export type DamageReportStatus = 'reported' | 'disputed' | 'resolved';

export type PayoutStatus = 'pending' | 'processing' | 'paid';
```

---

## 2. Entity State Machines

### 2.1 Booking (`bookings.status`)

| Current State | Next State | Triggered By | Conditions & Side Effects |
|:---|:---|:---|:---|
| `pending` | `confirmed` | System / Customer | Successful payment recorded; moves `booking_items` to `confirmed`. |
| `pending` | `cancelled` | Customer / Admin | Booking aborted before payment; releases any held items. |
| `confirmed` | `in_progress` | System / Vendor | Start date reached; delivery dispatched. |
| `confirmed` | `cancelled` | Customer / Admin | Customer cancels according to cancellation policy. Initiates refund flow. |
| `in_progress`| `completed` | System / Vendor | All vendor orders returned, returns inspected, and deposits settled. |
| `in_progress`| `cancelled` | Admin | Emergency dispute/interruption by Admin. |

### 2.2 Vendor Order (`vendor_orders.status`)

| Current State | Next State | Triggered By | Description |
|:---|:---|:---|:---|
| `pending` | `accepted` | Vendor | Vendor accepts equipment fulfillment request. |
| `pending` | `rejected` | Vendor | Vendor declines order. System triggers item replacement or partial refund. |
| `accepted` | `dispatched` | Vendor | Equipment dispatched for delivery to venue. |
| `dispatched`| `delivered` | Vendor / Driver | Delivered and received at venue; proof URL uploaded. |
| `delivered` | `returned` | Vendor / Driver | Post-event equipment collected from venue. |
| `returned` | `completed` | Vendor / Admin | Inspection complete, damages settled; creates pending payout. |
| Any (pre-delivered) | `cancelled` | Customer / Admin | Booking cancellation propagates to vendor order. |

### 2.3 Booking Items (`booking_items.item_status`)

| Current State | Next State | Triggered By | Description |
|:---|:---|:---|:---|
| `pending` | `confirmed` | System | Booking payment confirmed. Stock committed. |
| `confirmed` | `delivered` | Vendor / Delivery | Item physically delivered to venue. |
| `delivered` | `returned` | Vendor / Return | Item picked up/returned. Unlocks customer review creation. |
| `pending` / `confirmed` | `cancelled` | System | Item cancelled; immediately frees available stock capacity. |

### 2.4 Deliveries (`deliveries.status`)

`scheduled` → `out_for_delivery` → `delivered` (or `failed` if venue unreachable / recipient unavailable).

### 2.5 Returns (`returns.status`)

`scheduled` → `returned` (on time) OR `late` (overdue) OR `incomplete` (missing items).

### 2.6 Payments (`payments.status`)

`pending` → `success` (payment received via gateway) OR `failed` (gateway decline).  
`success` → `refunded` (full or partial refund transaction recorded).

### 2.7 Vendor Approval (`vendors.approval_status`)

`pending` → `approved` (Admin verifies GST/documents) OR `rejected` (rejection reason provided).  
`approved` → `suspended` (Policy violation or severe customer disputes).

### 2.8 Damage Reports (`damage_reports.status`)

`reported` (Vendor logs damage on return item) → `disputed` (Customer disputes damage charge) → `resolved` (Admin arbitrates and deducts from security deposit).

---

## 3. Page-to-Data Map

### Customer Portal

| Page / Route | Primary Views / Tables Read | Tables Written | Key Operations |
|:---|:---|:---|:---|
| **Catalog / Search** (`/equipment`) | `v_equipment_listing`, `categories` | None | Filter by category, price, date availability; fulltext keyword search. |
| **Equipment Detail** (`/equipment/:id`) | `equipment`, `equipment_images`, `reviews`, `vendors` | `cart_items`, `wishlist` | View specifications, image carousel, review breakdown, add to cart. |
| **Cart** (`/cart`) | `cart_items`, `equipment`, `coupons` | `cart_items` | Adjust quantities, set rental date range, calculate estimated pricing. |
| **Checkout** (`/checkout`) | `cart_items`, `addresses`, `coupons` | `bookings`, `vendor_orders`, `booking_items`, `payments` | Select address, validate coupon, create booking transaction. |
| **My Bookings** (`/bookings`) | `v_customer_bookings` | None | List active and past event bookings with latest delivery status. |
| **Booking Detail** (`/bookings/:id`) | `bookings`, `vendor_orders`, `booking_items`, `payments`, `deliveries`, `returns` | `payments` (cancel refund) | View itemized breakdown, tracking status, dispute/cancel. |
| **Write Review** (`/reviews/new`) | `booking_items`, `equipment` | `reviews` | Submit star rating (1..5) and review comment for returned items. |
| **Customer Profile** (`/profile`) | `users`, `addresses` | `users`, `addresses` | Update profile, manage saved delivery addresses (single default). |
| **Messages** (`/messages`) | `messages`, `users`, `equipment` | `messages` | Direct chat with vendor regarding equipment/event logistics. |
| **Notifications** (`/notifications`) | `notifications` | `notifications` | View updates, mark notifications as read. |

### Vendor Portal

| Page / Route | Primary Views / Tables Read | Tables Written | Key Operations |
|:---|:---|:---|:---|
| **Dashboard** (`/vendor/dashboard`) | `v_vendor_dashboard`, `v_vendor_incoming_orders` | None | Real-time KPIs (equipment count, earnings, ratings, pending orders). |
| **Incoming Orders** (`/vendor/orders`) | `v_vendor_incoming_orders` | `vendor_orders` | Accept or reject orders with reason. |
| **Order Management** (`/vendor/orders/:id`) | `vendor_orders`, `booking_items`, `deliveries`, `returns` | `deliveries`, `returns`, `return_items` | Dispatch equipment, log delivery proof, schedule return pickups. |
| **Inventory / Equipment** (`/vendor/inventory`) | `equipment`, `categories`, `equipment_images` | `equipment`, `equipment_images`, `availability` | Add/edit equipment, upload images, manage maintenance blocks. |
| **Returns & Damage** (`/vendor/returns`) | `returns`, `return_items`, `damage_reports` | `damage_reports` | Inspect returned gear, log condition (`item_condition`), claim damages. |
| **Payouts** (`/vendor/payouts`) | `payouts`, `vendor_orders` | None | Track gross earnings, platform commission (10%), net payouts. |
| **Vendor Settings** (`/vendor/settings`) | `vendors`, `users` | `vendors` | Update business info, GST, logo, phone. |

### Admin Panel

| Page / Route | Primary Views / Tables Read | Tables Written | Key Operations |
|:---|:---|:---|:---|
| **Admin Overview** (`/admin/dashboard`) | All tables | None | Platform-wide volume, user counts, commission revenue. |
| **Vendor Approvals** (`/admin/vendors`) | `vendors`, `users` | `vendors` | Approve or reject onboarding vendors with reason. |
| **Dispute Resolution** (`/admin/disputes`) | `damage_reports`, `returns`, `bookings` | `damage_reports`, `payments` | Arbitrate damage disputes, authorize deposit deductions/refunds. |
| **Category Management** (`/admin/categories`) | `categories` | `categories` | Manage taxonomy tree and active statuses. |
| **Coupon Management** (`/admin/coupons`) | `coupons` | `coupons` | Create promotional coupons, set validity and limits. |

---

## 4. Responsibility Matrix: DB Enforcement vs Backend Enforcement

| Rule / Business Logic | Database Enforcement | Backend (FastAPI) Enforcement |
|:---|:---:|:---:|
| **Stock Overbooking Protection** | Safety Net Trigger (`trg_booking_items_before_insert/update` via `get_available_quantity`) | **Primary Concurrency Control**: Must execute `SELECT equipment_id, quantity FROM equipment WHERE equipment_id = :id FOR UPDATE` before check. |
| **Equipment Status & Vendor Approval** | Enforced by Trigger (`equipment.status = 'active'`, `vendors.approval_status = 'approved'`) | Filter out non-active items from search/catalog APIs. |
| **Minimum Rental Days** | Enforced by Trigger (`DATEDIFF + 1 >= min_rental_days`) | Front-end date picker validation & API request validation. |
| **Booking Total Formula** | Enforced by CHECK constraint (`total = subtotal - discount + tax + delivery + deposit`) | Compute item price sums, applicable taxes (GST), and delivery fees. |
| **Coupon Rules** | Enforced by CHECK constraints on `value`, `min_order_amount`, `valid_to >= valid_from` | Verify `valid_from <= NOW() <= valid_to`, `used_count < usage_limit`, compute flat/percent discount. |
| **Address Ownership** | Enforced by Trigger (`addresses.user_id == bookings.user_id`) | Scope address queries to authenticated user token. |
| **Single Default Address** | Enforced by Trigger (blocks inserting second `is_default=1`) | If user selects new default, unset previous default before setting new. |
| **Single Primary Image** | Enforced by Trigger (blocks inserting second `is_primary=1`) | Update existing primary image to `is_primary=0` when assigning new primary. |
| **Reviews Eligibility** | Enforced by Trigger (`item_status = 'returned'`, owner matches, equipment/vendor match) | Display "Review" button only on returned items in customer UI. |
| **Rating Aggregations** | Enforced by Triggers (`trg_reviews_after_insert/update/delete` auto-syncs `avg_rating` and `review_count`) | Read precomputed fields on `equipment` table (O(1) read). |
| **Refund Limit Ceiling** | Enforced by Trigger (refunds cannot exceed successful payments) | Compute cancellation refund policy deductions before initiating gateway refund. |
| **Commission & Payout Formula** | Enforced by CHECK constraint (`net = gross - commission`) | Compute vendor commission (e.g. 10%) on order completion. |

---

## 5. Equipment Listing Search & Pagination

### Search Query Recommendations
- **Keyword Search:** Use MySQL FULLTEXT search:
  ```sql
  SELECT * FROM v_equipment_listing
  WHERE MATCH(name, description) AGAINST(:search_query IN BOOLEAN MODE);
  ```
- **Category Filter:** Filter by category or parent category:
  ```sql
  WHERE (category_id = :cat_id OR parent_category_id = :cat_id)
  ```
- **Date Availability Search:**
  ```sql
  SELECT e.*
  FROM v_equipment_listing e
  WHERE get_available_quantity(e.equipment_id, :start_date, :end_date) >= :requested_qty;
  ```
- **Pagination Strategy:**
  Use keyset pagination for high performance:
  ```sql
  WHERE equipment_id > :last_seen_id ORDER BY equipment_id ASC LIMIT :page_size;
  ```
  Or standard offset pagination for UI page numbers:
  ```sql
  ORDER BY avg_rating DESC, equipment_id DESC LIMIT :limit OFFSET :offset;
  ```

---

## 6. Authentication Architecture (Firebase + FastAPI)

1. **Client Sign-In:** React app authenticates via Firebase Auth SDK (Google, Phone, or Email/Password).
2. **Bearer Token:** React transmits the ID token in HTTP headers: `Authorization: Bearer <id_token>`.
3. **Token Verification:** FastAPI dependency verifies signature and claims using Firebase Admin SDK:
   ```python
   decoded_token = auth.verify_id_token(token)
   firebase_uid = decoded_token["uid"]
   ```
4. **Database Lookup:**
   ```sql
   SELECT user_id, role, is_active FROM users WHERE firebase_uid = :uid;
   ```
   If user does not exist (first login), insert a new row with `role = 'customer'`, `email_verified = True`.
5. **Authorization:** Check `users.role` to authorize endpoint access. For `/vendor/*` endpoints, also verify `vendors.approval_status = 'approved'`.

---

## 7. Recommended SQLAlchemy Engine Configuration

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_pre_ping=True,
    connect_args={
        "charset": "utf8mb4",
        "init_command": "SET time_zone = '+00:00'",
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```
