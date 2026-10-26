# Pydantic Schemas Package (`app/schemas`)

This directory houses all request, query, and response models used by the REST API routers.

## Conventions
- **Request Models**: Suffix with `Request` (e.g. `BookingCreateRequest`, `CouponValidateRequest`).
- **Response Models**: Suffix with `Response` (e.g. `EquipmentListingResponse`, `BookingDetailResponse`).
- **Case Style**: JSON fields use `snake_case` matching the database schema and frontend TypeScript contracts.
- **Pydantic Version**: Pydantic v2 with `BaseModel`.
