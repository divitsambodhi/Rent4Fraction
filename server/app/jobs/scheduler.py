from __future__ import annotations

import logging
import threading

from app.core.config import get_settings
from app.core.db import get_session_factory
from app.jobs.expire_bookings import expire_unpaid_bookings
from app.jobs.late_returns import mark_late_returns
from app.jobs.reconcile_payments import reconcile_payments

logger = logging.getLogger("rent4fraction.jobs.scheduler")

_scheduler_thread: threading.Thread | None = None
_stop_event = threading.Event()


def _scheduler_loop(interval_seconds: int = 60) -> None:
    logger.info("Background job scheduler started (interval: %ds).", interval_seconds)
    session_factory = get_session_factory()

    while not _stop_event.is_set():
        try:
            with session_factory() as db:
                expire_unpaid_bookings(db)
                reconcile_payments(db)
                mark_late_returns(db)
        except Exception as exc:
            logger.error("Error in background job scheduler cycle: %s", exc)

        _stop_event.wait(interval_seconds)

    logger.info("Background job scheduler stopped.")


def start_scheduler() -> None:
    """Starts the in-process background scheduler if ENABLE_SCHEDULER is True."""
    global _scheduler_thread
    settings = get_settings()
    if not settings.ENABLE_SCHEDULER:
        logger.info("Background job scheduler disabled by configuration (ENABLE_SCHEDULER=False).")
        return

    if _scheduler_thread is not None and _scheduler_thread.is_alive():
        logger.warning("Scheduler thread is already running.")
        return

    _stop_event.clear()
    _scheduler_thread = threading.Thread(
        target=_scheduler_loop, name="rent4fraction-scheduler", daemon=True
    )
    _scheduler_thread.start()


def stop_scheduler() -> None:
    """Signals the scheduler to terminate and waits briefly for clean exit."""
    global _scheduler_thread
    _stop_event.set()
    if _scheduler_thread is not None:
        _scheduler_thread.join(timeout=5.0)
        _scheduler_thread = None
