# Repositories Package (`app/repositories`)

This directory houses all SQL data-access queries, filtering, and row-level locking mechanisms.

## Layering Rules
- **Encapsulation**: Only repositories execute SQL queries via SQLAlchemy.
- **No Direct Calls from Routers**: Routers MUST NEVER invoke repositories directly; they must always go through a domain service in `app/services`.
- **Row Locking**: For concurrent reservations, always lock equipment rows using `with_for_update()`.
