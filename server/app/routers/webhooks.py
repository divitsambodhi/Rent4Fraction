from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import InvalidWebhookSignatureError
from app.core.time import utc_now
from app.integrations.razorpay import get_payment_gateway
from app.models.orders import Booking
from app.models.payments import Payment, PaymentStatus, WebhookEvent, WebhookEventStatus
from app.models.platform import OrderEvent
from app.models.social import Notification
from app.schemas.checkout import WebhookAckResponse
from app.services.payments import finalize_payment_success

logger = logging.getLogger("rent4fraction.webhooks")

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])


@router.post(
    "/razorpay",
    response_model=WebhookAckResponse,
    operation_id="handle_razorpay_webhook",
    summary="Handle incoming Razorpay webhooks with cryptographic HMAC signature verification and deduplication",
)
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(None, alias="X-Razorpay-Signature"),
    x_razorpay_event_id: str | None = Header(None, alias="X-Razorpay-Event-Id"),
    db: Session = Depends(get_db),
) -> Any:
    """
    Public Razorpay webhook endpoint:
    - Reads raw request body bytes before parsing.
    - Verifies X-Razorpay-Signature with webhook secret (constant-time HMAC-SHA256).
    - Deduplicates via webhook_events unique (provider, provider_event_id).
    - Handles payment.captured, order.paid, payment.failed, payment.authorized,
      refund.created, refund.processed, and refund.failed.
    - Fast 200 OK acknowledgment; 5xx on transient server errors so Razorpay retries.
    """
    raw_body = await request.body()
    gateway = get_payment_gateway()

    # 1. Cryptographic HMAC-SHA256 Signature Verification
    if not x_razorpay_signature or not gateway.verify_webhook_signature(
        raw_body, x_razorpay_signature
    ):
        masked_sig = (x_razorpay_signature[:8] + "...") if x_razorpay_signature else "None"
        logger.warning(
            "Rejected webhook: invalid or missing Razorpay signature header (%s)", masked_sig
        )
        raise InvalidWebhookSignatureError("Invalid Razorpay webhook signature header.")

    # 2. Parse JSON Payload
    try:
        payload_data = json.loads(raw_body.decode("utf-8"))
    except Exception as exc:
        logger.error("Failed to parse webhook JSON body: %s", exc)
        raise InvalidWebhookSignatureError("Malformed webhook JSON payload.") from exc

    event_type = payload_data.get("event", "unknown")
    event_id = (
        x_razorpay_event_id or payload_data.get("id") or f"evt_fallback_{utc_now().timestamp()}"
    )

    # 3. Deduplication via webhook_events table
    existing_event = (
        db.query(WebhookEvent)
        .filter(
            WebhookEvent.provider == "razorpay",
            WebhookEvent.provider_event_id == event_id,
        )
        .with_for_update()
        .first()
    )

    if existing_event:
        if existing_event.status == WebhookEventStatus.processed:
            logger.info(
                "Duplicate webhook event '%s' already processed. Fast-returning 200 OK.", event_id
            )
            return WebhookAckResponse(status="ok", event_id=event_id, processed=True)
        # Re-process received or failed event
        existing_event.attempts += 1
        event_record = existing_event
    else:
        event_record = WebhookEvent(
            provider="razorpay",
            provider_event_id=event_id,
            event_type=event_type,
            signature_valid=1,
            payload=payload_data,
            status=WebhookEventStatus.received,
            attempts=1,
        )
        db.add(event_record)
        db.flush()

    # 4. Dispatch Event Processing
    now = utc_now()
    try:
        if event_type in ("payment.captured", "order.paid"):
            pay_entity = payload_data.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = pay_entity.get("order_id")
            pay_id = pay_entity.get("id")

            # Locate payment row
            payment = (
                db.query(Payment)
                .filter(Payment.gateway_order_id == order_id)
                .with_for_update()
                .first()
            )
            if not payment and pay_id:
                payment = (
                    db.query(Payment)
                    .filter(Payment.transaction_id == pay_id)
                    .with_for_update()
                    .first()
                )

            if payment:
                # Security invariant: check amount & currency match stored payment
                expected_paise = int((payment.amount * 100).to_integral_value())
                actual_paise = pay_entity.get("amount", 0)
                actual_curr = pay_entity.get("currency", "").upper()

                if actual_paise == expected_paise and actual_curr == payment.currency.upper():
                    finalize_payment_success(db, payment, pay_entity, gateway=gateway)
                    event_record.status = WebhookEventStatus.processed
                    event_record.processed_at = now
                else:
                    logger.error(
                        "Webhook payment amount/currency mismatch: expected %d %s, got %d %s",
                        expected_paise,
                        payment.currency,
                        actual_paise,
                        actual_curr,
                    )
                    event_record.status = WebhookEventStatus.failed
                    event_record.error_message = (
                        "Payment amount or currency mismatch with stored record"
                    )
            else:
                logger.warning(
                    "No payment record matched order_id '%s' / payment_id '%s'", order_id, pay_id
                )
                event_record.status = WebhookEventStatus.ignored

        elif event_type == "payment.failed":
            pay_entity = payload_data.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = pay_entity.get("order_id")

            payment = (
                db.query(Payment)
                .filter(Payment.gateway_order_id == order_id)
                .with_for_update()
                .first()
            )
            # Out-of-order check: if payment was already successfully finalized, failed event must NEVER undo success!
            if payment and payment.status != PaymentStatus.success:
                payment.status = PaymentStatus.failed
                payment.failure_code = pay_entity.get("error_code") or "gateway_declined"
                payment.failure_reason = pay_entity.get("error_description") or "Payment failed"

                booking = db.query(Booking).filter(Booking.booking_id == payment.booking_id).first()
                if booking:
                    db.add(
                        Notification(
                            user_id=booking.user_id,
                            title="Payment Attempt Failed",
                            message=(
                                f"Payment attempt failed for booking BK-{booking.booking_id:04d} "
                                f"({payment.failure_reason}). You may retry before your hold expires."
                            ),
                            type="new_order",
                        )
                    )
                    db.add(
                        OrderEvent(
                            booking_id=booking.booking_id,
                            actor_role="system",
                            event_type="payment_failed",
                            note=f"Payment attempt failed: {payment.failure_reason}",
                        )
                    )

            event_record.status = WebhookEventStatus.processed
            event_record.processed_at = now

        elif event_type == "payment.authorized":
            logger.info(
                "Payment authorized event received (auto-capture configured); no state change."
            )
            event_record.status = WebhookEventStatus.processed
            event_record.processed_at = now

        elif event_type in ("refund.created", "refund.processed", "refund.failed"):
            rfnd_entity = payload_data.get("payload", {}).get("refund", {}).get("entity", {})
            rfnd_id = rfnd_entity.get("id")

            refund_payment = (
                db.query(Payment)
                .filter(Payment.gateway_refund_id == rfnd_id)
                .with_for_update()
                .first()
            )

            if refund_payment:
                if event_type == "refund.processed":
                    refund_payment.status = PaymentStatus.success
                    refund_payment.payment_date = now

                    booking = (
                        db.query(Booking)
                        .filter(Booking.booking_id == refund_payment.booking_id)
                        .first()
                    )
                    if booking:
                        db.add(
                            Notification(
                                user_id=booking.user_id,
                                title="Refund Processed",
                                message=f"Refund of ₹{refund_payment.amount} has been successfully processed to your account.",
                                type="refund_processed",
                            )
                        )
                elif event_type == "refund.failed":
                    refund_payment.status = PaymentStatus.failed
                    refund_payment.failure_code = "refund_gateway_error"
                    refund_payment.failure_reason = rfnd_entity.get(
                        "error_description", "Refund failed"
                    )

                event_record.status = WebhookEventStatus.processed
                event_record.processed_at = now
            else:
                logger.warning(
                    "Refund event %s received for unknown refund_id '%s'", event_type, rfnd_id
                )
                event_record.status = WebhookEventStatus.ignored

        else:
            # Unhandled or informational events
            logger.info("Ignoring unhandled webhook event type: %s", event_type)
            event_record.status = WebhookEventStatus.ignored
            event_record.processed_at = now

        db.commit()

    except Exception as exc:
        db.rollback()
        logger.error("Error processing webhook %s (%s): %s", event_id, event_type, exc)
        event_record.status = WebhookEventStatus.failed
        event_record.error_message = str(exc)[:450]
        db.commit()
        # Return 500 so Razorpay retries transient failures
        raise

    return WebhookAckResponse(status="ok", event_id=event_id, processed=True)
