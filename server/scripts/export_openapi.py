"""
Export OpenAPI JSON schema from the FastAPI application.
Run via: python scripts/export_openapi.py
"""

from __future__ import annotations

import json
import os
import sys

# Ensure server root is in python path
server_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if server_root not in sys.path:
    sys.path.insert(0, server_root)

# Set mock DATABASE_URL if missing so app factory succeeds
os.environ.setdefault("DATABASE_URL", "mysql+pymysql://user:pass@127.0.0.1:3306/event_rental")

from app.main import create_app  # noqa: E402


def export_openapi() -> None:
    app = create_app()
    openapi_schema = app.openapi()
    output_path = os.path.join(server_root, "openapi.json")
    docs_output_path = os.path.join(server_root, "docs", "openapi.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)

    with open(docs_output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)

    print(f"Successfully exported OpenAPI schema to {output_path} and {docs_output_path}")


if __name__ == "__main__":
    export_openapi()
