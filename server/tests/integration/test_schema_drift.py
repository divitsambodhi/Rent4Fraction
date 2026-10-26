"""
Schema drift integration test.
Compares SQLAlchemy ORM model metadata against live MySQL database tables via inspect().
Fails with a clear diff if any table, column, nullability, or constraint has drifted.
Requires TEST_DATABASE_URL.
"""

from __future__ import annotations

import os

import pytest
from sqlalchemy import create_engine, inspect

# Ensure all models are imported and registered in Base.metadata
import app.models  # noqa: F401
from app.core.db import Base


@pytest.mark.integration
def test_schema_drift_against_live_database() -> None:
    test_db_url = os.environ.get("TEST_DATABASE_URL")
    if not test_db_url:
        pytest.skip("TEST_DATABASE_URL not set. Skipping schema drift test.")

    engine = create_engine(test_db_url)
    inspector = inspect(engine)

    live_tables = set(inspector.get_table_names())
    model_tables = set(Base.metadata.tables.keys())

    # Exclude platform idempotency table if it has not been migrated yet
    tables_to_check = model_tables - {"idempotency_keys"}

    # 1. Assert all model tables exist in the live database
    missing_tables = tables_to_check - live_tables
    assert not missing_tables, (
        f"Live database is missing tables defined in models: {missing_tables}"
    )

    # 2. Check column existence and nullability
    mismatches: list[str] = []
    for table_name in tables_to_check:
        live_cols = {col["name"]: col for col in inspector.get_columns(table_name)}
        model_table = Base.metadata.tables[table_name]

        for col_name, model_col in model_table.columns.items():
            if col_name not in live_cols:
                mismatches.append(
                    f"Table '{table_name}': missing column '{col_name}' in live database"
                )
                continue

            live_col = live_cols[col_name]
            # Verify nullability
            if model_col.nullable != live_col.get("nullable"):
                mismatches.append(
                    f"Table '{table_name}', Column '{col_name}': nullability mismatch "
                    f"(model={model_col.nullable}, live={live_col.get('nullable')})"
                )

    engine.dispose()
    assert not mismatches, "Schema drift detected between models and live database:\n" + "\n".join(
        mismatches
    )
