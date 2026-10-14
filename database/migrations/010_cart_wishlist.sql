-- =============================================================================
-- Migration 010 — cart_items, wishlist
-- =============================================================================

CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      BIGINT UNSIGNED NOT NULL,
    equipment_id BIGINT UNSIGNED NOT NULL,
    quantity     INT             NOT NULL DEFAULT 1,
    start_date   DATE            NOT NULL,
    end_date     DATE            NOT NULL,
    created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cart_item_id),
    UNIQUE KEY uq_cart_items_user_equip_dates (user_id, equipment_id, start_date, end_date),
    INDEX idx_cart_items_equipment_id (equipment_id),
    CONSTRAINT fk_cart_items_user_id
        FOREIGN KEY (user_id)      REFERENCES users      (user_id)      ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_equipment_id
        FOREIGN KEY (equipment_id) REFERENCES equipment  (equipment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS wishlist (
    user_id      BIGINT UNSIGNED NOT NULL,
    equipment_id BIGINT UNSIGNED NOT NULL,
    created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, equipment_id),
    CONSTRAINT fk_wishlist_user_id
        FOREIGN KEY (user_id)      REFERENCES users     (user_id)      ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_equipment_id
        FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
