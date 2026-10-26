# Services Package (`app/services`)

This directory houses all business domain logic, validation policies, and transaction coordination.

## Layering Rules
- **No FastAPI Imports**: Services must be completely decoupled from HTTP frameworks (no `Request`, `Response`, `Depends`, or `HTTPException`).
- **Transaction Boundaries**: Services manage the lifecycle of database transactions via `with transaction(db):`.
- **Domain Errors**: When a business rule is violated, services raise subclasses of `DomainError` from `app.core.errors`.
