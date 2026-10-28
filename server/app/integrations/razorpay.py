from __future__ import annotations

import hashlib
import hmac
import logging
import time
import uuid
from typing import Any, Protocol, runtime_checkable

import httpx

from app.core.config import get_settings
from app.core.errors import (
    PaymentGatewayRejectedError,
    PaymentGatewayUnavailableError,
)

logger = logging.getLogger("rent4fraction.razorpay")


@runtime_checkable
class PaymentGateway(Protocol):
    """Abstract interface defining the payment gateway operations."""

    key_id: str
    key_secret: str
    webhook_secret: str

    def create_order(
        self,
        amount_paise: int,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]: ...

    def fetch_payment(self, payment_id: str) -> dict[str, Any]: ...

    def fetch_order_payments(self, order_id: str) -> list[dict[str, Any]]: ...

    def capture_payment(
        self,
        payment_id: str,
        amount_paise: int,
        currency: str = "INR",
    ) -> dict[str, Any]: ...

    def refund_payment(
        self,
        payment_id: str,
        amount_paise: int,
        notes: dict[str, Any] | None = None,
        receipt: str | None = None,
        speed: str = "normal",
    ) -> dict[str, Any]: ...

    def fetch_refund(self, refund_id: str) -> dict[str, Any]: ...

    def _generate_signature(self, order_id: str, payment_id: str) -> str:
        payload = f"{order_id}|{payment_id}".encode()
        return hmac.new(self.key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    def _generate_webhook_signature(self, raw_body_bytes: bytes) -> str:
        return hmac.new(
            self.webhook_secret.encode("utf-8"), raw_body_bytes, hashlib.sha256
        ).hexdigest()

    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> bool: ...

    def verify_webhook_signature(
        self,
        raw_body_bytes: bytes,
        signature_header: str,
    ) -> bool: ...


class RazorpayClient:
    """
    Production Razorpay client using httpx with Basic authentication,
    strict connect and read timeouts, safe idempotent retries on GET,
    and no blind retries on stateful POST operations.
    """

    BASE_URL = "https://api.razorpay.com/v1"
    _logged_mode_startup = False

    def __init__(
        self,
        key_id: str,
        key_secret: str,
        webhook_secret: str | None = None,
        timeout_seconds: float = 8.0,
    ) -> None:
        if not key_id or not key_secret:
            raise ValueError(
                "Razorpay client configuration invalid: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set."
            )

        self.key_id = key_id.strip()
        self.key_secret = key_secret.strip()
        self.webhook_secret = (webhook_secret or "").strip()
        self.timeout = httpx.Timeout(
            connect=3.0,
            read=timeout_seconds,
            write=5.0,
            pool=5.0,
        )

        # Detect live vs test mode safely from Key ID prefix
        self.is_test_mode = self.key_id.startswith("rzp_test_")
        if not RazorpayClient._logged_mode_startup:
            masked_key = (
                self.key_id[:8] + "..." + self.key_id[-4:] if len(self.key_id) > 12 else "rzp_***"
            )
            mode_str = "TEST" if self.is_test_mode else "LIVE"
            logger.info(
                "Razorpay Gateway initialized in %s mode (Key ID: %s)", mode_str, masked_key
            )
            RazorpayClient._logged_mode_startup = True

    def _client(self) -> httpx.Client:
        return httpx.Client(
            auth=(self.key_id, self.key_secret),
            timeout=self.timeout,
            headers={"User-Agent": "Rent4Fraction-Server/1.0"},
        )

    def _safe_get(self, endpoint: str, max_retries: int = 2) -> dict[str, Any]:
        """Safe retry logic applied strictly to idempotent GET queries."""
        url = f"{self.BASE_URL}{endpoint}"
        last_error: Exception | None = None
        for attempt in range(max_retries + 1):
            try:
                with self._client() as client:
                    resp = client.get(url)
                    resp.raise_for_status()
                    return resp.json()  # type: ignore[no-any-return]
            except httpx.HTTPStatusError as exc:
                if 400 <= exc.response.status_code < 500:
                    self._handle_client_error(exc)
                # 5xx error on GET: retry once after short backoff
                last_error = exc
                if attempt < max_retries:
                    time.sleep(0.5 * (attempt + 1))
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.NetworkError) as exc:
                last_error = exc
                if attempt < max_retries:
                    time.sleep(0.5 * (attempt + 1))

        logger.error(
            "Razorpay GET %s failed after %d retries: %s", endpoint, max_retries, last_error
        )
        raise PaymentGatewayUnavailableError(
            message="Payment gateway service unavailable during status check. Please retry."
        )

    def _safe_post(self, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Strict single execution for stateful POST calls. Never blind retry."""
        url = f"{self.BASE_URL}{endpoint}"
        try:
            with self._client() as client:
                resp = client.post(url, json=payload)
                resp.raise_for_status()
                return resp.json()  # type: ignore[no-any-return]
        except httpx.HTTPStatusError as exc:
            self._handle_client_error(exc)
        except (httpx.ConnectError, httpx.ReadTimeout, httpx.NetworkError) as exc:
            logger.error("Razorpay POST %s network/timeout error: %s", endpoint, exc)
            raise PaymentGatewayUnavailableError(
                message="Payment gateway temporarily unreachable. Please retry shortly."
            ) from exc
        raise PaymentGatewayUnavailableError(message="Payment gateway communication error.")

    def _handle_client_error(self, exc: httpx.HTTPStatusError) -> None:
        try:
            err_data = exc.response.json().get("error", {})
            desc = err_data.get("description", "Payment rejected by gateway.")
            code = err_data.get("code", "BAD_REQUEST_ERROR")
        except Exception:
            desc = "Payment rejected by gateway."
            code = "GATEWAY_ERROR"

        logger.warning(
            "Razorpay client error (%d): code=%s, desc=%s",
            exc.response.status_code,
            code,
            desc,
        )
        if exc.response.status_code >= 500:
            raise PaymentGatewayUnavailableError(
                message="Payment gateway experienced an internal error. Please retry."
            )
        raise PaymentGatewayRejectedError(
            message=desc,
            details={"gateway_code": code},
        )

    def create_order(
        self,
        amount_paise: int,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "amount": amount_paise,
            "currency": currency.upper(),
            "receipt": receipt,
            "notes": notes or {},
        }
        return self._safe_post("/orders", payload)

    def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        return self._safe_get(f"/payments/{payment_id}")

    def fetch_order_payments(self, order_id: str) -> list[dict[str, Any]]:
        res = self._safe_get(f"/orders/{order_id}/payments")
        items = res.get("items", [])
        return items  # type: ignore[no-any-return]

    def capture_payment(
        self,
        payment_id: str,
        amount_paise: int,
        currency: str = "INR",
    ) -> dict[str, Any]:
        payload = {"amount": amount_paise, "currency": currency.upper()}
        return self._safe_post(f"/payments/{payment_id}/capture", payload)

    def refund_payment(
        self,
        payment_id: str,
        amount_paise: int,
        notes: dict[str, Any] | None = None,
        receipt: str | None = None,
        speed: str = "normal",
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "amount": amount_paise,
            "speed": speed,
            "notes": notes or {},
        }
        if receipt:
            payload["receipt"] = receipt
        return self._safe_post(f"/payments/{payment_id}/refund", payload)

    def fetch_refund(self, refund_id: str) -> dict[str, Any]:
        return self._safe_get(f"/refunds/{refund_id}")

    def _generate_signature(self, order_id: str, payment_id: str) -> str:
        payload = f"{order_id}|{payment_id}".encode()
        return hmac.new(self.key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    def _generate_webhook_signature(self, raw_body_bytes: bytes) -> str:
        return hmac.new(
            self.webhook_secret.encode("utf-8"), raw_body_bytes, hashlib.sha256
        ).hexdigest()

    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> bool:
        if not order_id or not payment_id or not signature:
            return False
        payload = f"{order_id}|{payment_id}".encode()
        expected_sig = hmac.new(
            self.key_secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature.strip())

    def verify_webhook_signature(
        self,
        raw_body_bytes: bytes,
        signature_header: str,
    ) -> bool:
        if not self.webhook_secret:
            logger.error("RAZORPAY_WEBHOOK_SECRET is not configured on server.")
            return False
        if not raw_body_bytes or not signature_header:
            return False
        expected_sig = hmac.new(
            self.webhook_secret.encode("utf-8"),
            raw_body_bytes,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature_header.strip())


class FakePaymentGateway:
    """
    Deterministic in-memory gateway mock for automated tests.
    Never makes real network requests.
    Supports injecting failure conditions and verifying HMAC signatures.
    """

    def __init__(
        self,
        key_id: str = "rzp_test_fake",
        key_secret: str = "test_key_secret_12345",
        webhook_secret: str = "test_webhook_secret_67890",
    ) -> None:
        self.key_id = key_id
        self.key_secret = key_secret
        self.webhook_secret = webhook_secret

        self.orders: dict[str, dict[str, Any]] = {}
        self.payments: dict[str, dict[str, Any]] = {}
        self.refunds: dict[str, dict[str, Any]] = {}

        # Simulators
        self.simulate_unavailable: bool = False
        self.simulate_rejected: bool = False
        self.rejected_message: str = "Card declined by bank"

    def create_order(
        self,
        amount_paise: int,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if self.simulate_unavailable:
            raise PaymentGatewayUnavailableError("Simulated gateway unavailable")
        if self.simulate_rejected:
            raise PaymentGatewayRejectedError(self.rejected_message)

        order_id = f"order_fake_{uuid.uuid4().hex[:14]}"
        order = {
            "id": order_id,
            "entity": "order",
            "amount": amount_paise,
            "amount_paid": 0,
            "amount_due": amount_paise,
            "currency": currency.upper(),
            "receipt": receipt,
            "status": "created",
            "attempts": 0,
            "notes": notes or {},
            "created_at": int(time.time()),
        }
        self.orders[order_id] = order
        return order

    def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        if self.simulate_unavailable:
            raise PaymentGatewayUnavailableError("Simulated gateway unavailable")
        if payment_id in self.payments:
            return self.payments[payment_id]

        # Return default captured payment representation if not recorded
        return {
            "id": payment_id,
            "entity": "payment",
            "amount": 100000,
            "currency": "INR",
            "status": "captured",
            "order_id": "order_fake_sample",
            "method": "card",
            "captured": True,
            "error_code": None,
            "error_description": None,
        }

    def fetch_order_payments(self, order_id: str) -> list[dict[str, Any]]:
        if self.simulate_unavailable:
            raise PaymentGatewayUnavailableError("Simulated gateway unavailable")
        return [p for p in self.payments.values() if p.get("order_id") == order_id]

    def capture_payment(
        self,
        payment_id: str,
        _amount_paise: int,
        _currency: str = "INR",
    ) -> dict[str, Any]:
        if self.simulate_unavailable:
            raise PaymentGatewayUnavailableError("Simulated gateway unavailable")
        p = self.fetch_payment(payment_id)
        p["status"] = "captured"
        p["captured"] = True
        self.payments[payment_id] = p
        return p

    def refund_payment(
        self,
        payment_id: str,
        amount_paise: int,
        notes: dict[str, Any] | None = None,
        receipt: str | None = None,
        speed: str = "normal",
    ) -> dict[str, Any]:
        if self.simulate_unavailable:
            raise PaymentGatewayUnavailableError("Simulated gateway unavailable")
        if self.simulate_rejected:
            raise PaymentGatewayRejectedError("Refund rejected by gateway")

        refund_id = f"rfnd_fake_{uuid.uuid4().hex[:14]}"
        refund = {
            "id": refund_id,
            "entity": "refund",
            "amount": amount_paise,
            "currency": "INR",
            "payment_id": payment_id,
            "notes": notes or {},
            "receipt": receipt,
            "status": "processed",
            "speed": speed,
            "created_at": int(time.time()),
        }
        self.refunds[refund_id] = refund
        return refund

    def fetch_refund(self, refund_id: str) -> dict[str, Any]:
        if self.simulate_unavailable:
            raise PaymentGatewayUnavailableError("Simulated gateway unavailable")
        return self.refunds.get(
            refund_id,
            {
                "id": refund_id,
                "entity": "refund",
                "amount": 5000,
                "currency": "INR",
                "status": "processed",
            },
        )

    def _generate_signature(self, order_id: str, payment_id: str) -> str:
        payload = f"{order_id}|{payment_id}".encode()
        return hmac.new(self.key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    def _generate_webhook_signature(self, raw_body_bytes: bytes) -> str:
        return hmac.new(
            self.webhook_secret.encode("utf-8"), raw_body_bytes, hashlib.sha256
        ).hexdigest()

    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> bool:
        if not order_id or not payment_id or not signature:
            return False
        payload = f"{order_id}|{payment_id}".encode()
        expected_sig = hmac.new(
            self.key_secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature.strip())

    def verify_webhook_signature(
        self,
        raw_body_bytes: bytes,
        signature_header: str,
    ) -> bool:
        if not raw_body_bytes or not signature_header:
            return False
        expected_sig = hmac.new(
            self.webhook_secret.encode("utf-8"),
            raw_body_bytes,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature_header.strip())


_gateway_instance: PaymentGateway | None = None


def get_payment_gateway() -> PaymentGateway:
    """
    FastAPI dependency and factory for PaymentGateway.
    Returns RazorpayClient if credentials configured, otherwise FakePaymentGateway in test/dev.
    """
    global _gateway_instance
    if _gateway_instance is not None:
        return _gateway_instance

    settings = get_settings()

    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        _gateway_instance = RazorpayClient(
            key_id=settings.RAZORPAY_KEY_ID,
            key_secret=settings.RAZORPAY_KEY_SECRET,
            webhook_secret=settings.RAZORPAY_WEBHOOK_SECRET,
        )
    else:
        # Default to safe FakePaymentGateway when keys are not configured
        _gateway_instance = FakePaymentGateway()

    return _gateway_instance


def set_payment_gateway(gateway: PaymentGateway | None) -> None:
    """Helper for testing to inject custom mock gateways."""
    global _gateway_instance
    _gateway_instance = gateway
