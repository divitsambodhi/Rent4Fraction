-- =============================================================================
-- Migration 003 — categories, equipment, equipment_images
-- =============================================================================

CREATE TABLE IF NOT EXISTS categories (
    category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)    NOT NULL,
    description TEXT,
    parent_id   BIGINT UNSIGNED,
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (category_id),
    UNIQUE KEY uq_categories_parent_name (parent_id, name),
    INDEX idx_categories_parent_id (parent_id),
    CONSTRAINT fk_categories_parent_id
        FOREIGN KEY (parent_id) REFERENCES categories (category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS equipment (
    equipment_id       BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    vendor_id          BIGINT UNSIGNED  NOT NULL,
    category_id        BIGINT UNSIGNED  NOT NULL,
    name               VARCHAR(255)     NOT NULL,
    description        TEXT,
    price_per_day      DECIMAL(12,2)    NOT NULL,
    security_deposit   DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
    quantity           INT              NOT NULL DEFAULT 1,
    min_rental_days    INT              NOT NULL DEFAULT 1,
    delivery_available TINYINT(1)       NOT NULL DEFAULT 1,
    specifications     JSON,
    avg_rating         DECIMAL(3,2)     NOT NULL DEFAULT 0.00,
    review_count       INT UNSIGNED     NOT NULL DEFAULT 0,
    status             ENUM('active','inactive','out_of_stock','archived') NOT NULL DEFAULT 'active',
    created_at         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (equipment_id),
    CONSTRAINT chk_equipment_quantity
        CHECK (quantity >= 0),
    INDEX idx_equipment_vendor_id   (vendor_id),
    INDEX idx_equipment_category_id (category_id),
    INDEX idx_equipment_status      (status),
    INDEX idx_equipment_vendor_status (vendor_id, status),
    CONSTRAINT fk_equipment_vendor_id
        FOREIGN KEY (vendor_id)   REFERENCES vendors    (vendor_id)   ON DELETE RESTRICT,
    CONSTRAINT fk_equipment_category_id
        FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS equipment_images (
    image_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    equipment_id BIGINT UNSIGNED NOT NULL,
    url          VARCHAR(500)    NOT NULL,
    is_primary   TINYINT(1)      NOT NULL DEFAULT 0,
    sort_order   INT             NOT NULL DEFAULT 0,
    PRIMARY KEY (image_id),
    INDEX idx_equipment_images_equipment_id (equipment_id),
    CONSTRAINT fk_equipment_images_equipment_id
        FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
