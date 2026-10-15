-- =============================================================================
-- Migration 006 — bookings, vendor_orders, booking_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookings (
    booking_id       BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    user_id          BIGINT UNSIGNED  NOT NULL,
    address_id       BIGINT UNSIGNED  NOT NULL,
    booking_date     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    start_date       DATE             NOT NULL,
    end_date         DATE             NOT NULL,
    event_name       VARCHAR(255),
    event_type       VARCHAR(100),
    event_date       DATE,
    venue_address    TEXT,
    subtotal         DECIMAL(12,2)    NOT NULL,
    discount         DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
    coupon_id        BIGINT UNSIGNED,
    tax              DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
    delivery_fee     DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
    security_deposit DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
    total_amount     DECIMAL(12,2)    NOT NULL,
    payment_status   ENUM('unpaid','partial','paid','refunded') NOT NULL DEFAULT 'unpaid',
    status           ENUM('pending','confirmed','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
    notes            TEXT,
    created_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (booking_id),
    CONSTRAINT chk_bookings_dates
        CHECK (end_date >= start_date),
    CONSTRAINT chk_bookings_total_amount
        CHECK (total_amount = subtotal - discount + tax + delivery_fee + security_deposit),
    CONSTRAINT chk_bookings_amounts
        CHECK (subtotal >= 0.00 AND discount >= 0.00 AND tax >= 0.00 AND delivery_fee >= 0.00 AND security_deposit >= 0.00 AND total_amount >= 0.00),
    INDEX idx_bookings_user_id        (user_id),
    INDEX idx_bookings_status         (status),
    INDEX idx_bookings_payment_status (payment_status),
    INDEX idx_bookings_start_date     (start_date),
    INDEX idx_bookings_coupon_id      (coupon_id),
    INDEX idx_bookings_user_status    (user_id, status),
    CONSTRAINT fk_bookings_user_id
        FOREIGN KEY (user_id)    REFERENCES users     (user_id)    ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_address_id
        FOREIGN KEY (address_id) REFERENCES addresses (address_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_coupon_id
        FOREIGN KEY (coupon_id)  REFERENCES coupons   (coupon_id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vendor_orders (
    vendor_order_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id       BIGINT UNSIGNED NOT NULL,
    vendor_id        BIGINT UNSIGNED NOT NULL,
    subtotal         DECIMAL(12,2)   NOT NULL,
    status           ENUM('pending','accepted','rejected','dispatched','delivered','returned','completed','cancelled') NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (vendor_order_id),
    CONSTRAINT chk_vendor_orders_subtotal
        CHECK (subtotal >= 0.00),
    UNIQUE KEY uq_vendor_orders_booking_vendor (booking_id, vendor_id),
    INDEX idx_vendor_orders_vendor_id (vendor_id),
    INDEX idx_vendor_orders_status    (status),
    INDEX idx_vendor_orders_booking_status (booking_id, status),
    CONSTRAINT fk_vendor_orders_booking_id
        FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE RESTRICT,
    CONSTRAINT fk_vendor_orders_vendor_id
        FOREIGN KEY (vendor_id)  REFERENCES vendors  (vendor_id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS booking_items (
    booking_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vendor_order_id BIGINT UNSIGNED NOT NULL,
    booking_id      BIGINT UNSIGNED NOT NULL,
    vendor_id       BIGINT UNSIGNED NOT NULL,
    equipment_id    BIGINT UNSIGNED NOT NULL,
    quantity        INT             NOT NULL,
    price_per_day   DECIMAL(12,2)   NOT NULL,
    days            INT             NOT NULL,
    total_price     DECIMAL(12,2)   NOT NULL,
    item_status     ENUM('pending','confirmed','delivered','returned','cancelled') NOT NULL DEFAULT 'pending',
    PRIMARY KEY (booking_item_id),
    CONSTRAINT chk_booking_items_quantity
        CHECK (quantity > 0),
    CONSTRAINT chk_booking_items_price_per_day
        CHECK (price_per_day >= 0.00),
    CONSTRAINT chk_booking_items_days
        CHECK (days >= 1),
    CONSTRAINT chk_booking_items_total_price
        CHECK (total_price >= 0.00),
    INDEX idx_booking_items_vendor_order_id (vendor_order_id),
    INDEX idx_booking_items_booking_id      (booking_id),
    INDEX idx_booking_items_equipment_id    (equipment_id),
    INDEX idx_booking_items_item_status     (item_status),
    INDEX idx_booking_items_booking_equipment (booking_id, equipment_id),
    INDEX idx_booking_items_eq_status       (equipment_id, item_status),
    CONSTRAINT fk_booking_items_vendor_order_id
        FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders (vendor_order_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_items_booking_id
        FOREIGN KEY (booking_id)      REFERENCES bookings       (booking_id)      ON DELETE RESTRICT,
    CONSTRAINT fk_booking_items_vendor_id
        FOREIGN KEY (vendor_id)       REFERENCES vendors        (vendor_id)       ON DELETE RESTRICT,
    CONSTRAINT fk_booking_items_equipment_id
        FOREIGN KEY (equipment_id)    REFERENCES equipment      (equipment_id)    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
