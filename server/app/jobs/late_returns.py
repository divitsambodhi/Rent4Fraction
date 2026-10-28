from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.fulfilment import Return, ReturnStatus
from app.models.platform import OrderEvent
from app.models.social import Notification

logger = logging.getLogger("rent4fraction.jobs.late_returns")


def mark_late_returns(db: Session) -> int:
    """
    Finds returns in 'scheduled' status whose scheduled_end has elapsed,
    transitions them to 'late', logs an order event, and notifies the vendor.
    Reversible when the return is recorded.
    """
    now = utc_now()
    late_returns = (
        db.query(Return)
        .filter(
            Return.status == ReturnStatus.scheduled,
            Return.scheduled_end.is_not(None),
            Return.scheduled_end < now,
        )
        .all()
    )

    if not late_returns:
        return 0

    marked_count = 0
    for ret in late_returns:
        ret.status = ReturnStatus.late
        marked_count += 1

        vo = ret.vendor_order
        if vo:
            db.add(
                OrderEvent(
                    booking_id=vo.booking_id,
                    vendor_order_id=vo.vendor_order_id,
                    event_type="return_late",
                    actor_role="system",
                    from_status=ReturnStatus.scheduled.value,
                    to_status=ReturnStatus.late.value,
                    note=f"Scheduled return window expired at {ret.scheduled_end.isoformat() if ret.scheduled_end else ''}.",
                )
            )

            if vo.vendor and vo.vendor.user_id:
                db.add(
                    Notification(
                        user_id=vo.vendor.user_id,
                        type="return_late",
                        title="Return Window Expired",
                        message=f"Scheduled return window for order VO-{vo.vendor_order_id:04d} expired without return confirmation.",
                        is_read=0,
                    )
                )

    db.commit()
    logger.info("Marked %d returns as late.", marked_count)
    return marked_count
