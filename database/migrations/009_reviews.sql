-- =============================================================================
-- Migration 009 — reviews
-- NOTE: avg_rating and review_count on equipment are kept in sync by triggers
--       defined in migration 013.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
    review_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    booking_item_id BIGINT UNSIGNED NOT NULL,
    equipment_id    BIGINT UNSIGNED NOT NULL,
    vendor_id       BIGINT UNSIGNED NOT NULL,
    rating          TINYINT         NOT NULL,
    comment         TEXT,
    vendor_reply    TEXT,
    review_date     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id),
    CONSTRAINT chk_reviews_rating
        CHECK (rating >= 1 AND rating <= 5),
    UNIQUE KEY uq_reviews_booking_item_id (booking_item_id),
    INDEX idx_reviews_equipment_id  (equipment_id),
    INDEX idx_reviews_vendor_id     (vendor_id),
    INDEX idx_reviews_user_id       (user_id),
    CONSTRAINT fk_reviews_user_id
        FOREIGN KEY (user_id)         REFERENCES users         (user_id)         ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_booking_item_id
        FOREIGN KEY (booking_item_id) REFERENCES booking_items (booking_item_id) ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_equipment_id
        FOREIGN KEY (equipment_id)    REFERENCES equipment     (equipment_id)    ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_vendor_id
        FOREIGN KEY (vendor_id)       REFERENCES vendors       (vendor_id)       ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
