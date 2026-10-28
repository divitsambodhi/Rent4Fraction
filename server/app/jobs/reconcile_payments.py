from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.razorpay import PaymentGateway, get_payment_gateway
from app.models.payments import Payment, PaymentStatus
from app.services.payments import finalize_payment_success

logger = logging.getLogger("rent4fraction.jobs.reconcile_payments")


def reconcile_payments(
    db: Session,
    gateway: PaymentGateway | None = None,
) -> int:
    """
    Reconciles pending payments by polling the Razorpay Orders API.
    Dormant when PAYMENTS_ONLINE_ENABLED is False (COD mode).
    """
    settings = get_settings()
    if not settings.PAYMENTS_ONLINE_ENABLED:
        return 0
    if gateway is None:
        gateway = get_payment_gateway()

    pending_payments = (
        db.query(Payment)
        .filter(
            Payment.status == PaymentStatus.pending,
            Payment.gateway_order_id.isnot(None),
        )
        .all()
    )

    if not pending_payments:
        return 0

    reconciled_count = 0
    for payment in pending_payments:
        if not payment.gateway_order_id:
            continue

        try:
            order_payments = gateway.fetch_order_payments(payment.gateway_order_id)
            items = (
                order_payments
                if isinstance(order_payments, list)
                else order_payments.get("items", [])
            )
            if not items:
                continue

            captured = next((p for p in items if p.get("status") == "captured"), None)
            if captured:
                finalize_payment_success(db, payment, captured, gateway=gateway)
                reconciled_count += 1
            elif all(p.get("status") == "failed" for p in items):
                payment.status = PaymentStatus.failed
                payment.failure_reason = "All gateway attempts failed"
                reconciled_count += 1

        except Exception as exc:
            logger.error(
                "Error reconciling payment %s (order %s): %s",
                payment.payment_id,
                payment.gateway_order_id,
                exc,
            )

    db.commit()
    logger.info("Reconciled %d pending payments against gateway.", reconciled_count)
    return reconciled_count
