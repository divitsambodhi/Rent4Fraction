from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.core.errors import (
    AdminSelfDeactivationForbiddenError,
    ConflictError,
    LastAdminDeactivationForbiddenError,
    ValidationFailedError,
)
from app.core.time import utc_now
from app.models.accounts import User, UserRole
from app.models.orders import Coupon, CouponType
from app.models.payments import Payout, PayoutStatus
from app.services.admin import AdminService
from app.services.lifecycle.settlement import evaluate_dispute_resolution


class TestAdminServices:
    def test_coupon_status_derivation(self) -> None:
        db = MagicMock()
        admin_svc = AdminService(db)
        now = utc_now()

        # Inactive coupon
        c_inactive = Coupon(
            code="INACTIVE10",
            type=CouponType.percent,
            value=Decimal("10.00"),
            is_active=0,
            usage_limit=100,
            used_count=0,
            valid_from=now - timedelta(days=5),
            valid_to=now + timedelta(days=5),
        )
        assert admin_svc.derive_coupon_status(c_inactive, now) == "inactive"

        # Limit reached
        c_limit = Coupon(
            code="LIMIT10",
            type=CouponType.percent,
            value=Decimal("10.00"),
            is_active=1,
            usage_limit=10,
            used_count=10,
            valid_from=now - timedelta(days=5),
            valid_to=now + timedelta(days=5),
        )
        assert admin_svc.derive_coupon_status(c_limit, now) == "limit_reached"

        # Expired
        c_expired = Coupon(
            code="EXPIRED10",
            type=CouponType.percent,
            value=Decimal("10.00"),
            is_active=1,
            usage_limit=100,
            used_count=5,
            valid_from=now - timedelta(days=10),
            valid_to=now - timedelta(days=1),
        )
        assert admin_svc.derive_coupon_status(c_expired, now) == "expired"

        # Scheduled (upcoming)
        c_upcoming = Coupon(
            code="UPCOMING10",
            type=CouponType.percent,
            value=Decimal("10.00"),
            is_active=1,
            usage_limit=100,
            used_count=0,
            valid_from=now + timedelta(days=2),
            valid_to=now + timedelta(days=10),
        )
        assert admin_svc.derive_coupon_status(c_upcoming, now) == "scheduled"

        # Active
        c_active = Coupon(
            code="ACTIVE10",
            type=CouponType.percent,
            value=Decimal("10.00"),
            is_active=1,
            usage_limit=100,
            used_count=15,
            valid_from=now - timedelta(days=2),
            valid_to=now + timedelta(days=5),
        )
        assert admin_svc.derive_coupon_status(c_active, now) == "active"

    def test_admin_self_deactivation_forbidden(self) -> None:
        db = MagicMock()
        admin_svc = AdminService(db)

        with pytest.raises(AdminSelfDeactivationForbiddenError):
            admin_svc.deactivate_user(
                admin_id=1,
                target_user_id=1,
                reason="Attempting to deactivate myself with long reason",
            )

    def test_admin_deactivation_requires_reason_length(self) -> None:
        db = MagicMock()
        admin_svc = AdminService(db)

        with pytest.raises(ValidationFailedError) as exc:
            admin_svc.deactivate_user(
                admin_id=1,
                target_user_id=2,
                reason="short",
            )
        assert "at least 10 characters" in str(exc.value).lower()

    def test_last_admin_deactivation_forbidden(self) -> None:
        db = MagicMock()
        admin_svc = AdminService(db)

        target_admin = User(
            user_id=2,
            role=UserRole.admin,
            is_active=1,
        )

        # Mock query return
        mock_q = MagicMock()
        mock_q.with_for_update.return_value.first.return_value = target_admin
        mock_q.filter.return_value = mock_q
        mock_q.scalar.return_value = 1
        db.query.return_value = mock_q

        with pytest.raises(LastAdminDeactivationForbiddenError):
            admin_svc.deactivate_user(
                admin_id=1,
                target_user_id=2,
                reason="Attempting to deactivate last admin",
            )

    def test_dispute_resolution_evaluation(self) -> None:
        claim = Decimal("3000.00")
        deposit = Decimal("5000.00")

        # Full outcome
        res_full = evaluate_dispute_resolution(
            claim_amount=claim,
            deposit_share=deposit,
            outcome="full",
            proposed_amount=None,
        )
        assert res_full.final_amount == claim
        assert res_full.deducted_from_deposit == Decimal("3000.00")

        # Reject outcome
        res_reject = evaluate_dispute_resolution(
            claim_amount=claim,
            deposit_share=deposit,
            outcome="reject",
            proposed_amount=None,
        )
        assert res_reject.final_amount == Decimal("0.00")
        assert res_reject.deducted_from_deposit == Decimal("0.00")

        # Partial outcome within bounds
        res_partial = evaluate_dispute_resolution(
            claim_amount=claim,
            deposit_share=deposit,
            outcome="partial",
            proposed_amount=Decimal("1500.00"),
        )
        assert res_partial.final_amount == Decimal("1500.00")
        assert res_partial.deducted_from_deposit == Decimal("1500.00")

    def test_payout_forward_only_transitions(self) -> None:
        db = MagicMock()
        admin_svc = AdminService(db)

        # 1. Processing payout cannot transition to processing again
        payout_processing = Payout(
            payout_id=1,
            vendor_id=10,
            vendor_order_id=20,
            gross_amount=Decimal("1000.00"),
            commission_amount=Decimal("100.00"),
            net_amount=Decimal("900.00"),
            status=PayoutStatus.processing,
        )

        mock_q = MagicMock()
        mock_q.filter.return_value.with_for_update.return_value.first.return_value = payout_processing
        db.query.return_value = mock_q

        with pytest.raises(ConflictError) as exc:
            admin_svc.update_payout_status(
                admin_id=1,
                payout_id=1,
                new_status="processing",
            )
        assert "Cannot transition" in str(exc.value)

        # 2. Paid payout cannot transition to processing or paid again
        payout_paid = Payout(
            payout_id=2,
            vendor_id=10,
            vendor_order_id=21,
            gross_amount=Decimal("1000.00"),
            commission_amount=Decimal("100.00"),
            net_amount=Decimal("900.00"),
            status=PayoutStatus.paid,
        )
        mock_q.filter.return_value.with_for_update.return_value.first.return_value = payout_paid

        with pytest.raises(ConflictError) as exc:
            admin_svc.update_payout_status(
                admin_id=1,
                payout_id=2,
                new_status="paid",
            )
        assert "Cannot transition" in str(exc.value)

        # 3. Future paid_at is rejected
        payout_pending = Payout(
            payout_id=3,
            vendor_id=10,
            vendor_order_id=22,
            gross_amount=Decimal("1000.00"),
            commission_amount=Decimal("100.00"),
            net_amount=Decimal("900.00"),
            status=PayoutStatus.pending,
        )
        mock_q.filter.return_value.with_for_update.return_value.first.return_value = payout_pending

        with pytest.raises(ValidationFailedError) as exc:
            admin_svc.update_payout_status(
                admin_id=1,
                payout_id=3,
                new_status="paid",
                paid_at=utc_now() + timedelta(days=2),
            )
        assert "cannot be in the future" in str(exc.value).lower()
