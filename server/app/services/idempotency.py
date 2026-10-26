from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.core.time import utc_now
from app.models.platform import IdempotencyKey


def compute_request_hash(data: Any) -> str:
    """Computes a SHA256 hex digest of a canonical JSON serialized representation."""
    if isinstance(data, (dict, list)):
        canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"))
    else:
        canonical_json = str(data)
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


class IdempotencyRecord:
    def __init__(
        self,
        key: str,
        request_hash: str,
        response_code: int,
        response_body: str,
        expires_at: datetime,
    ) -> None:
        self.key = key
        self.request_hash = request_hash
        self.response_code = response_code
        self.response_body = response_body
        self.expires_at = expires_at


class IdempotencyStore(Protocol):
    def get(self, key: str) -> IdempotencyRecord | None: ...

    def save(self, record: IdempotencyRecord) -> None: ...

    def prune_expired(self) -> int: ...


class InMemoryIdempotencyStore:
    """In-memory store suitable for unit tests and local dev."""

    def __init__(self) -> None:
        self._store: dict[str, IdempotencyRecord] = {}

    def get(self, key: str) -> IdempotencyRecord | None:
        record = self._store.get(key)
        if record is None:
            return None
        if record.expires_at < utc_now():
            del self._store[key]
            return None
        return record

    def save(self, record: IdempotencyRecord) -> None:
        self._store[record.key] = record

    def prune_expired(self) -> int:
        now = utc_now()
        expired = [k for k, v in self._store.items() if v.expires_at < now]
        for k in expired:
            del self._store[k]
        return len(expired)


class DatabaseIdempotencyStore:
    """Production store backed by the idempotency_keys database table."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, key: str) -> IdempotencyRecord | None:
        stmt = select(IdempotencyKey).where(IdempotencyKey.idempotency_key == key)
        row = self.session.execute(stmt).scalar_one_or_none()
        if not row:
            return None
        # Check expiry
        now = utc_now()
        exp = row.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=UTC)
        if exp < now:
            self.session.delete(row)
            self.session.commit()
            return None
        return IdempotencyRecord(
            key=row.idempotency_key,
            request_hash=row.request_hash,
            response_code=row.response_code,
            response_body=row.response_body,
            expires_at=exp,
        )

    def save(self, record: IdempotencyRecord) -> None:
        key_obj = IdempotencyKey(
            idempotency_key=record.key,
            request_hash=record.request_hash,
            response_code=record.response_code,
            response_body=record.response_body,
            expires_at=record.expires_at,
        )
        self.session.add(key_obj)
        self.session.commit()

    def prune_expired(self) -> int:
        now = utc_now()
        stmt = delete(IdempotencyKey).where(IdempotencyKey.expires_at < now)
        res = self.session.execute(stmt)
        self.session.commit()
        return int(res.rowcount)  # type: ignore[attr-defined]


class IdempotencyService:
    def __init__(self, store: IdempotencyStore, default_ttl_hours: int = 24) -> None:
        self.store = store
        self.default_ttl = timedelta(hours=default_ttl_hours)

    def check_and_replay(self, key: str, request_data: Any) -> IdempotencyRecord | None:
        """
        Checks if an operation with this idempotency key was previously executed.
        - If not seen, returns None (continue execution).
        - If seen with identical request hash, returns the cached response record for replay.
        - If seen with a DIFFERENT request hash, raises ConflictError (HTTP 409).
        """
        current_hash = compute_request_hash(request_data)
        record = self.store.get(key)
        if record is None:
            return None

        if record.request_hash != current_hash:
            raise ConflictError(
                message="Idempotency key has already been used with a different request payload.",
                details={"key": key},
            )

        return record

    def record_response(
        self,
        key: str,
        request_data: Any,
        response_code: int,
        response_body: str,
        ttl: timedelta | None = None,
    ) -> None:
        """Stores the response to be replayed for subsequent duplicate requests."""
        current_hash = compute_request_hash(request_data)
        expires_at = utc_now() + (ttl or self.default_ttl)
        rec = IdempotencyRecord(
            key=key,
            request_hash=current_hash,
            response_code=response_code,
            response_body=response_body,
            expires_at=expires_at,
        )
        self.store.save(rec)
