from __future__ import annotations

import hashlib
import hmac

import pytest

from app.integrations.razorpay import FakePaymentGateway, RazorpayClient


@pytest.mark.unit
def test_razorpay_payment_signature_verification() -> None:
    gateway = RazorpayClient(
        key_id="rzp_test_sig123",
        key_secret="secret_abc_456",
        webhook_secret="wh_sec_789",
    )

    order_id = "order_998877"
    payment_id = "pay_112233"
    msg = f"{order_id}|{payment_id}".encode()
    valid_sig = hmac.new(b"secret_abc_456", msg, hashlib.sha256).hexdigest()

    # Valid signature
    assert gateway.verify_payment_signature(order_id, payment_id, valid_sig) is True

    # Tampered signature
    assert gateway.verify_payment_signature(order_id, payment_id, valid_sig[:-2] + "ff") is False

    # Tampered order_id
    assert gateway.verify_payment_signature("order_wrong", payment_id, valid_sig) is False

    # Empty inputs
    assert gateway.verify_payment_signature("", payment_id, valid_sig) is False
    assert gateway.verify_payment_signature(order_id, "", valid_sig) is False
    assert gateway.verify_payment_signature(order_id, payment_id, "") is False


@pytest.mark.unit
def test_razorpay_webhook_signature_verification() -> None:
    gateway = RazorpayClient(
        key_id="rzp_test_sig123",
        key_secret="secret_abc_456",
        webhook_secret="wh_sec_789",
    )

    raw_body = b'{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123"}}}}'
    valid_sig = hmac.new(b"wh_sec_789", raw_body, hashlib.sha256).hexdigest()

    # Valid webhook signature
    assert gateway.verify_webhook_signature(raw_body, valid_sig) is True

    # Tampered body
    tampered_body = (
        b'{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_999"}}}}'
    )
    assert gateway.verify_webhook_signature(tampered_body, valid_sig) is False

    # Tampered signature
    assert gateway.verify_webhook_signature(raw_body, "invalid_sig_hex") is False

    # Empty
    assert gateway.verify_webhook_signature(b"", valid_sig) is False
    assert gateway.verify_webhook_signature(raw_body, "") is False


@pytest.mark.unit
def test_fake_payment_gateway_signatures() -> None:
    fake = FakePaymentGateway(
        key_id="rzp_test_mock", key_secret="mock_sec", webhook_secret="mock_wh"
    )

    order_id = "order_m1"
    pay_id = "pay_m1"
    sig = fake._generate_signature(order_id, pay_id)
    assert fake.verify_payment_signature(order_id, pay_id, sig) is True
    assert fake.verify_payment_signature(order_id, pay_id, "wrong_sig") is False

    wh_body = b'{"event":"payment.captured"}'
    wh_sig = fake._generate_webhook_signature(wh_body)
    assert fake.verify_webhook_signature(wh_body, wh_sig) is True
    assert fake.verify_webhook_signature(wh_body, "wrong_wh_sig") is False
