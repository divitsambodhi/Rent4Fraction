import pytest

from app.core.errors import ConflictError
from app.services.idempotency import (
    IdempotencyService,
    InMemoryIdempotencyStore,
    compute_request_hash,
)


@pytest.mark.unit
def test_idempotency_service_flow() -> None:
    store = InMemoryIdempotencyStore()
    service = IdempotencyService(store=store, default_ttl_hours=1)

    key = "idem_key_12345"
    payload = {"booking_id": 101, "amount": 2500}

    # 1. First execution: no previous record
    assert service.check_and_replay(key, payload) is None

    # 2. Record response
    service.record_response(
        key=key,
        request_data=payload,
        response_code=201,
        response_body='{"status":"success"}',
    )

    # 3. Duplicate request with identical body: returns cached record
    replay = service.check_and_replay(key, payload)
    assert replay is not None
    assert replay.response_code == 201
    assert replay.response_body == '{"status":"success"}'

    # 4. Duplicate request with DIFFERENT body: raises 409 Conflict
    different_payload = {"booking_id": 101, "amount": 9999}
    with pytest.raises(ConflictError) as exc_info:
        service.check_and_replay(key, different_payload)
    assert exc_info.value.status_code == 409


@pytest.mark.unit
def test_idempotency_hash_stability() -> None:
    # Keys in different order should yield identical SHA256 hashes
    dict1 = {"b": 2, "a": 1}
    dict2 = {"a": 1, "b": 2}
    assert compute_request_hash(dict1) == compute_request_hash(dict2)
