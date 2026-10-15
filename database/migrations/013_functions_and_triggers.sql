-- =============================================================================
-- Migration 013 — Stored function + triggers
-- Statements are separated by:  -- //
-- The migration runner splits on that marker; DELIMITER is NOT used.
-- SQLSTATE '45000' raises ER_SIGNAL_EXCEPTION (error 1644) in the client.
-- =============================================================================

-- ── Function: get_available_quantity ─────────────────────────────────────────
-- Returns equipment.quantity minus the sum of quantities already committed
-- for the requested date range (active booking_items + active availability
-- blocks). Used by the overbooking triggers.
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

    -- Return 0 immediately if input parameters or date range are invalid
    IF p_equipment_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL OR p_start_date > p_end_date THEN
        RETURN 0;
    END IF;

    -- Total physical stock
    SELECT COALESCE(quantity, 0)
    INTO   v_total
    FROM   equipment
    WHERE  equipment_id = p_equipment_id;

    -- Already committed in active booking_items (date-overlapping ranges)
    -- Excludes cancelled/returned items, cancelled bookings, and rejected/cancelled vendor orders
    SELECT COALESCE(SUM(bi.quantity), 0)
    INTO   v_booked
    FROM   booking_items bi
    JOIN   bookings      bk ON bk.booking_id = bi.booking_id
    LEFT JOIN vendor_orders vo ON vo.vendor_order_id = bi.vendor_order_id
    WHERE  bi.equipment_id = p_equipment_id
      AND  bi.item_status NOT IN ('cancelled', 'returned')
      AND  bk.status <> 'cancelled'
      AND  (vo.status IS NULL OR vo.status NOT IN ('rejected', 'cancelled'))
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

-- ── Trigger 2: vendors — enforce user role on UPDATE ─────────────────────────
CREATE TRIGGER trg_vendors_before_update
BEFORE UPDATE ON vendors
FOR EACH ROW
BEGIN
    DECLARE v_role VARCHAR(20);

    IF NEW.user_id <> OLD.user_id THEN
        SELECT role INTO v_role
        FROM   users
        WHERE  user_id = NEW.user_id;

        IF v_role <> 'vendor' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Cannot reassign vendor profile: user.role must be ''vendor''';
        END IF;
    END IF;
END

-- //

-- ── Trigger 3: users — block role change away from 'vendor' ──────────────────
-- Prevents accidental demotion of a user who already has a vendors row.
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

-- ── Trigger 4: addresses — single default address guard on INSERT ───────────
CREATE TRIGGER trg_addresses_before_insert
BEFORE INSERT ON addresses
FOR EACH ROW
BEGIN
    DECLARE v_count INT DEFAULT 0;

    IF NEW.is_default = 1 THEN
        SELECT COUNT(*) INTO v_count
        FROM   addresses
        WHERE  user_id = NEW.user_id
          AND  is_default = 1;

        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Only one default address allowed per user';
        END IF;
    END IF;
END

-- //

-- ── Trigger 5: addresses — single default address guard on UPDATE ───────────
CREATE TRIGGER trg_addresses_before_update
BEFORE UPDATE ON addresses
FOR EACH ROW
BEGIN
    DECLARE v_count INT DEFAULT 0;

    IF NEW.is_default = 1 THEN
        SELECT COUNT(*) INTO v_count
        FROM   addresses
        WHERE  user_id = NEW.user_id
          AND  is_default = 1
          AND  address_id <> NEW.address_id;

        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Only one default address allowed per user';
        END IF;
    END IF;
END

-- //

-- ── Trigger 6: equipment_images — single primary image guard on INSERT ───────
CREATE TRIGGER trg_equipment_images_before_insert
BEFORE INSERT ON equipment_images
FOR EACH ROW
BEGIN
    DECLARE v_count INT DEFAULT 0;

    IF NEW.is_primary = 1 THEN
        SELECT COUNT(*) INTO v_count
        FROM   equipment_images
        WHERE  equipment_id = NEW.equipment_id
          AND  is_primary = 1;

        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Only one primary image allowed per equipment';
        END IF;
    END IF;
END

-- //

-- ── Trigger 7: equipment_images — single primary image guard on UPDATE ───────
CREATE TRIGGER trg_equipment_images_before_update
BEFORE UPDATE ON equipment_images
FOR EACH ROW
BEGIN
    DECLARE v_count INT DEFAULT 0;

    IF NEW.is_primary = 1 THEN
        SELECT COUNT(*) INTO v_count
        FROM   equipment_images
        WHERE  equipment_id = NEW.equipment_id
          AND  is_primary = 1
          AND  image_id <> NEW.image_id;

        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Only one primary image allowed per equipment';
        END IF;
    END IF;
END

-- //

-- ── Trigger 8: bookings — address ownership guard on INSERT ──────────────────
CREATE TRIGGER trg_bookings_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_addr_user_id BIGINT UNSIGNED;

    SELECT user_id INTO v_addr_user_id
    FROM   addresses
    WHERE  address_id = NEW.address_id;

    IF v_addr_user_id IS NULL OR v_addr_user_id <> NEW.user_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking address must belong to the booking customer';
    END IF;
END

-- //

-- ── Trigger 9: bookings — address ownership guard on UPDATE ──────────────────
CREATE TRIGGER trg_bookings_before_update
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_addr_user_id BIGINT UNSIGNED;

    IF NEW.address_id <> OLD.address_id OR NEW.user_id <> OLD.user_id THEN
        SELECT user_id INTO v_addr_user_id
        FROM   addresses
        WHERE  address_id = NEW.address_id;

        IF v_addr_user_id IS NULL OR v_addr_user_id <> NEW.user_id THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Booking address must belong to the booking customer';
        END IF;
    END IF;
END

-- //

-- ── Trigger 10: booking_items — integrity & overbooking guard on INSERT ──────
CREATE TRIGGER trg_booking_items_before_insert
BEFORE INSERT ON booking_items
FOR EACH ROW
BEGIN
    DECLARE v_vo_booking_id BIGINT UNSIGNED;
    DECLARE v_vo_vendor_id  BIGINT UNSIGNED;
    DECLARE v_eq_vendor_id  BIGINT UNSIGNED;
    DECLARE v_eq_status     VARCHAR(20);
    DECLARE v_min_days      INT DEFAULT 1;
    DECLARE v_v_approval    VARCHAR(20);
    DECLARE v_start         DATE;
    DECLARE v_end           DATE;
    DECLARE v_rental_days   INT;
    DECLARE v_available     INT DEFAULT 0;

    -- 1. booking_items.booking_id must match vendor_order.booking_id
    SELECT booking_id, vendor_id
    INTO   v_vo_booking_id, v_vo_vendor_id
    FROM   vendor_orders
    WHERE  vendor_order_id = NEW.vendor_order_id;

    IF v_vo_booking_id IS NULL OR v_vo_booking_id <> NEW.booking_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'booking_items.booking_id must match its vendor_order booking_id';
    END IF;

    -- 2. booking_items.vendor_id must match vendor_order.vendor_id and equipment.vendor_id
    SELECT vendor_id, status, min_rental_days
    INTO   v_eq_vendor_id, v_eq_status, v_min_days
    FROM   equipment
    WHERE  equipment_id = NEW.equipment_id;

    IF NEW.vendor_id <> v_vo_vendor_id OR NEW.vendor_id <> v_eq_vendor_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'booking_items.vendor_id must match vendor_orders and equipment vendor_id';
    END IF;

    -- 3. Equipment must be 'active' and vendor must be 'approved'
    SELECT approval_status
    INTO   v_v_approval
    FROM   vendors
    WHERE  vendor_id = NEW.vendor_id;

    IF v_eq_status <> 'active' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot book equipment: equipment status is not active';
    END IF;

    IF v_v_approval <> 'approved' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot book equipment: vendor is not approved';
    END IF;

    -- 4. Rental length respects min_rental_days
    SELECT start_date, end_date
    INTO   v_start, v_end
    FROM   bookings
    WHERE  booking_id = NEW.booking_id;

    SET v_rental_days = DATEDIFF(v_end, v_start) + 1;
    IF v_rental_days < v_min_days OR NEW.days < v_min_days THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Rental duration is less than minimum rental days required for this equipment';
    END IF;

    -- 5. Overbooking guard
    IF NEW.item_status NOT IN ('cancelled', 'returned') THEN
        SET v_available = get_available_quantity(NEW.equipment_id, v_start, v_end);
        IF NEW.quantity > v_available THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Requested quantity exceeds available stock for the given dates';
        END IF;
    END IF;
END

-- //

-- ── Trigger 11: booking_items — integrity & overbooking guard on UPDATE ──────
CREATE TRIGGER trg_booking_items_before_update
BEFORE UPDATE ON booking_items
FOR EACH ROW
BEGIN
    DECLARE v_vo_booking_id BIGINT UNSIGNED;
    DECLARE v_vo_vendor_id  BIGINT UNSIGNED;
    DECLARE v_eq_vendor_id  BIGINT UNSIGNED;
    DECLARE v_eq_status     VARCHAR(20);
    DECLARE v_min_days      INT DEFAULT 1;
    DECLARE v_v_approval    VARCHAR(20);
    DECLARE v_start         DATE;
    DECLARE v_end           DATE;
    DECLARE v_rental_days   INT;
    DECLARE v_available     INT DEFAULT 0;

    -- 1. booking_items.booking_id must match vendor_order.booking_id
    SELECT booking_id, vendor_id
    INTO   v_vo_booking_id, v_vo_vendor_id
    FROM   vendor_orders
    WHERE  vendor_order_id = NEW.vendor_order_id;

    IF v_vo_booking_id IS NULL OR v_vo_booking_id <> NEW.booking_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'booking_items.booking_id must match its vendor_order booking_id';
    END IF;

    -- 2. booking_items.vendor_id must match vendor_order.vendor_id and equipment.vendor_id
    SELECT vendor_id, status, min_rental_days
    INTO   v_eq_vendor_id, v_eq_status, v_min_days
    FROM   equipment
    WHERE  equipment_id = NEW.equipment_id;

    IF NEW.vendor_id <> v_vo_vendor_id OR NEW.vendor_id <> v_eq_vendor_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'booking_items.vendor_id must match vendor_orders and equipment vendor_id';
    END IF;

    -- 3. Equipment must be 'active' and vendor must be 'approved'
    SELECT approval_status
    INTO   v_v_approval
    FROM   vendors
    WHERE  vendor_id = NEW.vendor_id;

    IF v_eq_status <> 'active' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot book equipment: equipment status is not active';
    END IF;

    IF v_v_approval <> 'approved' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot book equipment: vendor is not approved';
    END IF;

    -- 4. Rental length respects min_rental_days
    SELECT start_date, end_date
    INTO   v_start, v_end
    FROM   bookings
    WHERE  booking_id = NEW.booking_id;

    SET v_rental_days = DATEDIFF(v_end, v_start) + 1;
    IF v_rental_days < v_min_days OR NEW.days < v_min_days THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Rental duration is less than minimum rental days required for this equipment';
    END IF;

    -- 5. Overbooking guard
    IF NEW.item_status NOT IN ('cancelled', 'returned') THEN
        SET v_available = get_available_quantity(NEW.equipment_id, v_start, v_end);
        -- If same equipment and old row had committed stock, add old quantity back to available capacity
        IF OLD.equipment_id = NEW.equipment_id AND OLD.item_status NOT IN ('cancelled', 'returned') THEN
            SET v_available = v_available + OLD.quantity;
        END IF;
        IF NEW.quantity > v_available THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Requested quantity exceeds available stock for the given dates';
        END IF;
    END IF;
END

-- //

-- ── Trigger 12: return_items — vendor_order match guard on INSERT ────────────
CREATE TRIGGER trg_return_items_before_insert
BEFORE INSERT ON return_items
FOR EACH ROW
BEGIN
    DECLARE v_ret_vo_id BIGINT UNSIGNED;
    DECLARE v_bi_vo_id  BIGINT UNSIGNED;
    DECLARE v_bi_qty    INT;

    SELECT vendor_order_id INTO v_ret_vo_id
    FROM   returns
    WHERE  return_id = NEW.return_id;

    SELECT vendor_order_id, quantity
    INTO   v_bi_vo_id, v_bi_qty
    FROM   booking_items
    WHERE  booking_item_id = NEW.booking_item_id;

    IF v_ret_vo_id IS NULL OR v_bi_vo_id IS NULL OR v_ret_vo_id <> v_bi_vo_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'return_items.booking_item_id must belong to the return''s vendor order';
    END IF;

    IF NEW.quantity_returned > v_bi_qty THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'quantity_returned cannot exceed booked quantity';
    END IF;
END

-- //

-- ── Trigger 13: return_items — vendor_order match guard on UPDATE ────────────
CREATE TRIGGER trg_return_items_before_update
BEFORE UPDATE ON return_items
FOR EACH ROW
BEGIN
    DECLARE v_ret_vo_id BIGINT UNSIGNED;
    DECLARE v_bi_vo_id  BIGINT UNSIGNED;
    DECLARE v_bi_qty    INT;

    SELECT vendor_order_id INTO v_ret_vo_id
    FROM   returns
    WHERE  return_id = NEW.return_id;

    SELECT vendor_order_id, quantity
    INTO   v_bi_vo_id, v_bi_qty
    FROM   booking_items
    WHERE  booking_item_id = NEW.booking_item_id;

    IF v_ret_vo_id IS NULL OR v_bi_vo_id IS NULL OR v_ret_vo_id <> v_bi_vo_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'return_items.booking_item_id must belong to the return''s vendor order';
    END IF;

    IF NEW.quantity_returned > v_bi_qty THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'quantity_returned cannot exceed booked quantity';
    END IF;
END

-- //

-- ── Trigger 14: reviews — guard before INSERT ────────────────────────────────
-- A review is only allowed when:
--   (a) the booking_item's item_status = 'returned', AND
--   (b) the booking that contains the item belongs to the reviewing user, AND
--   (c) the equipment_id and vendor_id match the booking_item.
CREATE TRIGGER trg_reviews_before_insert
BEFORE INSERT ON reviews
FOR EACH ROW
BEGIN
    DECLARE v_item_status  VARCHAR(20);
    DECLARE v_booking_user BIGINT UNSIGNED;
    DECLARE v_bi_equip_id  BIGINT UNSIGNED;
    DECLARE v_bi_vendor_id BIGINT UNSIGNED;

    SELECT bi.item_status, bk.user_id, bi.equipment_id, bi.vendor_id
    INTO   v_item_status, v_booking_user, v_bi_equip_id, v_bi_vendor_id
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

    IF v_bi_equip_id <> NEW.equipment_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Review equipment_id must match the booking_item equipment_id';
    END IF;

    IF v_bi_vendor_id <> NEW.vendor_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Review vendor_id must match the booking_item vendor_id';
    END IF;
END

-- //

-- ── Trigger 15: reviews — guard before UPDATE ────────────────────────────────
CREATE TRIGGER trg_reviews_before_update
BEFORE UPDATE ON reviews
FOR EACH ROW
BEGIN
    DECLARE v_item_status  VARCHAR(20);
    DECLARE v_booking_user BIGINT UNSIGNED;
    DECLARE v_bi_equip_id  BIGINT UNSIGNED;
    DECLARE v_bi_vendor_id BIGINT UNSIGNED;

    SELECT bi.item_status, bk.user_id, bi.equipment_id, bi.vendor_id
    INTO   v_item_status, v_booking_user, v_bi_equip_id, v_bi_vendor_id
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

    IF v_bi_equip_id <> NEW.equipment_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Review equipment_id must match the booking_item equipment_id';
    END IF;

    IF v_bi_vendor_id <> NEW.vendor_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Review vendor_id must match the booking_item vendor_id';
    END IF;
END

-- //

-- ── Trigger 16: reviews — sync avg_rating after INSERT ───────────────────────
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

-- ── Trigger 17: reviews — sync avg_rating after UPDATE ───────────────────────
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

    IF OLD.equipment_id <> NEW.equipment_id THEN
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
    END IF;
END

-- //

-- ── Trigger 18: reviews — sync avg_rating after DELETE ───────────────────────
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

-- ── Trigger 19: payments — refund ceiling guard on INSERT ────────────────────
CREATE TRIGGER trg_payments_before_insert
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
    DECLARE v_paid     DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_refunded DECIMAL(12,2) DEFAULT 0.00;

    IF NEW.type IN ('refund', 'deposit_refund') THEN
        SELECT COALESCE(SUM(amount), 0.00) INTO v_paid
        FROM   payments
        WHERE  booking_id = NEW.booking_id
          AND  type NOT IN ('refund', 'deposit_refund')
          AND  status = 'success';

        SELECT COALESCE(SUM(amount), 0.00) INTO v_refunded
        FROM   payments
        WHERE  booking_id = NEW.booking_id
          AND  type IN ('refund', 'deposit_refund')
          AND  status IN ('success', 'refunded');

        IF (v_refunded + NEW.amount) > v_paid THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Refund amount exceeds total successful payments for this booking';
        END IF;
    END IF;
END

-- //

-- ── Trigger 20: payments — refund ceiling guard on UPDATE ────────────────────
CREATE TRIGGER trg_payments_before_update
BEFORE UPDATE ON payments
FOR EACH ROW
BEGIN
    DECLARE v_paid     DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_refunded DECIMAL(12,2) DEFAULT 0.00;

    IF NEW.type IN ('refund', 'deposit_refund') THEN
        SELECT COALESCE(SUM(amount), 0.00) INTO v_paid
        FROM   payments
        WHERE  booking_id = NEW.booking_id
          AND  type NOT IN ('refund', 'deposit_refund')
          AND  status = 'success'
          AND  payment_id <> NEW.payment_id;

        SELECT COALESCE(SUM(amount), 0.00) INTO v_refunded
        FROM   payments
        WHERE  booking_id = NEW.booking_id
          AND  type IN ('refund', 'deposit_refund')
          AND  status IN ('success', 'refunded')
          AND  payment_id <> NEW.payment_id;

        IF (v_refunded + NEW.amount) > v_paid THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Refund amount exceeds total successful payments for this booking';
        END IF;
    END IF;
END
