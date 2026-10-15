-- =============================================================================
-- Migration 004 — availability (blocked date ranges)
-- =============================================================================

CREATE TABLE IF NOT EXISTS availability (
    availability_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    equipment_id     BIGINT UNSIGNED NOT NULL,
    start_date       DATE            NOT NULL,
    end_date         DATE            NOT NULL,
    quantity_blocked INT             NOT NULL DEFAULT 1,
    reason           ENUM('maintenance','vendor_blocked','booked') NOT NULL,
    status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
    PRIMARY KEY (availability_id),
    CONSTRAINT chk_availability_dates
        CHECK (end_date >= start_date),
    CONSTRAINT chk_availability_quantity_blocked
        CHECK (quantity_blocked > 0),
    INDEX idx_availability_equipment_id (equipment_id),
    INDEX idx_availability_dates        (start_date, end_date),
    INDEX idx_availability_status       (status),
    INDEX idx_availability_lookup       (equipment_id, status, start_date, end_date),
    CONSTRAINT fk_availability_equipment_id
        FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
