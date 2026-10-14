-- =============================================================================
-- Migration 013 — Stored function + 7 triggers
-- Statements are separated by:  -- //
-- The migration runner splits on that marker; DELIMITER is NOT used.
-- SQLSTATE '45000' raises ER_SIGNAL_EXCEPTION (error 1644) in the client.
-- =============================================================================

-- ── Function: get_available_quantity ─────────────────────────────────────────
-- Returns equipment.quantity minus the sum of quantities already committed
-- for the requested date range (active booking_items + active availability
-- blocks).  Used by the overbooking trigger below.
-- FastAPI MUST also lock the equipment row with SELECT ... FOR UPDATE inside
-- the booking transaction to prevent race conditions between concurrent
-- requests; this trigger is the last line of defence.
CREATE FUNCTION get_available_quantity(
    p_equipment_id BIGINT UNSIGNED,
    p_start_date   DATE,
    p_end_date     DATE
)
RETURNS INT
READS SQL DATA
NOT DETERMINISTIC
BEGIN
    DECLARE v_total   INT DEFAULT 0;
    DECLARE v_booked  INT DEFAULT 0;
    DECLARE v_blocked INT DEFAULT 0;

    -- Total physical stock
    SELECT COALESCE(quantity, 0)
    INTO   v_total
    FROM   equipment
    WHERE  equipment_id = p_equipment_id;

    -- Already committed in active booking_items (date-overlapping ranges)
    SELECT COALESCE(SUM(bi.quantity), 0)
    INTO   v_booked
    FROM   booking_items bi
    JOIN   bookings      bk ON bk.booking_id = bi.booking_id
    WHERE  bi.equipment_id = p_equipment_id
      AND  bi.item_status NOT IN ('cancelled', 'returned')
      AND  bk.start_date <= p_end_date
      AND  bk.end_date   >= p_start_date;

    -- Vendor-defined blocks (maintenance / vendor_blocked / manual booked)
    SELECT COALESCE(SUM(a.quantity_blocked), 0)
    INTO   v_blocked
    FROM   availability a
    WHERE  a.equipment_id = p_equipment_id
      AND  a.status       = 'active'
      AND  a.start_date  <= p_end_date
      AND  a.end_date    >= p_start_date;

    RETURN GREATEST(v_total - v_booked - v_blocked, 0);
END

-- //

-- ── Trigger 1: vendors — enforce user role on INSERT ─────────────────────────
-- A vendors row may only be created for a user whose role = 'vendor'.
CREATE TRIGGER trg_vendors_before_insert
BEFORE INSERT ON vendors
FOR EACH ROW
BEGIN
    DECLARE v_role VARCHAR(20);

    SELECT role INTO v_role
    FROM   users
    WHERE  user_id = NEW.user_id;

    IF v_role <> 'vendor' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot create vendor profile: user.role must be ''vendor''';
    END IF;
END

-- //

-- ── Trigger 2: users — block role change away from 'vendor' ──────────────────
-- Prevents accidental demotion of a user who already has a vendors row.
-- The vendors row must be deleted first.
CREATE TRIGGER trg_users_before_update_role
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    DECLARE v_count INT DEFAULT 0;

    IF OLD.role = 'vendor' AND NEW.role <> 'vendor' THEN
        SELECT COUNT(*) INTO v_count
        FROM   vendors
        WHERE  user_id = NEW.user_id;

        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Cannot change role away from ''vendor'': delete the vendors row first';
        END IF;
    END IF;
END

-- //

-- ── Trigger 3: reviews — guard before INSERT ─────────────────────────────────
-- A review is only allowed when:
--   (a) the booking_item's item_status = 'returned', AND
--   (b) the booking that contains the item belongs to the reviewing user.
CREATE TRIGGER trg_reviews_before_insert
BEFORE INSERT ON reviews
FOR EACH ROW
BEGIN
    DECLARE v_item_status    VARCHAR(20);
    DECLARE v_booking_user   BIGINT UNSIGNED;

    SELECT bi.item_status, bk.user_id
    INTO   v_item_status, v_booking_user
    FROM   booking_items bi
    JOIN   bookings      bk ON bk.booking_id = bi.booking_id
    WHERE  bi.booking_item_id = NEW.booking_item_id;

    IF v_item_status <> 'returned' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Review requires booking_item.item_status = ''returned''';
    END IF;

    IF v_booking_user <> NEW.user_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Review user_id must match the booking owner';
    END IF;
END

-- //

-- ── Trigger 4: reviews — sync avg_rating after INSERT ────────────────────────
CREATE TRIGGER trg_reviews_after_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE equipment
    SET    avg_rating   = (SELECT ROUND(AVG(rating), 2)
                           FROM   reviews
                           WHERE  equipment_id = NEW.equipment_id),
           review_count = (SELECT COUNT(*)
                           FROM   reviews
                           WHERE  equipment_id = NEW.equipment_id)
    WHERE  equipment_id = NEW.equipment_id;
END

-- //

-- ── Trigger 5: reviews — sync avg_rating after UPDATE ────────────────────────
CREATE TRIGGER trg_reviews_after_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
    UPDATE equipment
    SET    avg_rating   = (SELECT ROUND(AVG(rating), 2)
                           FROM   reviews
                           WHERE  equipment_id = NEW.equipment_id),
           review_count = (SELECT COUNT(*)
                           FROM   reviews
                           WHERE  equipment_id = NEW.equipment_id)
    WHERE  equipment_id = NEW.equipment_id;
END

-- //

-- ── Trigger 6: reviews — sync avg_rating after DELETE ────────────────────────
CREATE TRIGGER trg_reviews_after_delete
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
    UPDATE equipment
    SET    avg_rating   = COALESCE(
                              (SELECT ROUND(AVG(rating), 2)
                               FROM   reviews
                               WHERE  equipment_id = OLD.equipment_id),
                              0.00),
           review_count = (SELECT COUNT(*)
                           FROM   reviews
                           WHERE  equipment_id = OLD.equipment_id)
    WHERE  equipment_id = OLD.equipment_id;
END

-- //

-- ── Trigger 7: booking_items — overbooking guard on INSERT ───────────────────
-- Rejects the row if the requested quantity exceeds get_available_quantity().
-- NOTE: FastAPI MUST execute  SELECT ... FOR UPDATE  on the equipment row
-- inside its booking transaction to prevent race conditions; this trigger
-- is the safety net, not the primary concurrency control.
CREATE TRIGGER trg_booking_items_before_insert
BEFORE INSERT ON booking_items
FOR EACH ROW
BEGIN
    DECLARE v_start     DATE;
    DECLARE v_end       DATE;
    DECLARE v_available INT DEFAULT 0;

    SELECT start_date, end_date
    INTO   v_start, v_end
    FROM   bookings
    WHERE  booking_id = NEW.booking_id;

    SET v_available = get_available_quantity(NEW.equipment_id, v_start, v_end);

    IF NEW.quantity > v_available THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Requested quantity exceeds available stock for the given dates';
    END IF;
END
