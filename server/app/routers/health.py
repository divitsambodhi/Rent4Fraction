from __future__ import annotations

import os
import subprocess

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db

router = APIRouter(tags=["Health"])


class HealthStatusResponse(BaseModel):
    status: str
    environment: str


class DatabaseHealthResponse(BaseModel):
    status: str
    database: str
    mysql_version: str
    version_valid: bool
    latest_migration: str | None
    migrations_count: int


class VersionResponse(BaseModel):
    app: str
    version: str
    environment: str
    git_commit: str | None


def get_git_commit() -> str | None:
    try:
        commit = (
            subprocess.check_output(
                ["git", "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL
            )
            .decode("ascii")
            .strip()
        )
        return commit
    except Exception:
        return os.environ.get("GIT_COMMIT", None)


@router.get(
    "/health",
    response_model=HealthStatusResponse,
    summary="Application Liveness Check",
    operation_id="health_check",
)
def health_check(settings: Settings = Depends(get_settings)) -> HealthStatusResponse:
    """Liveness probe: verifies the web process is running without database dependency."""
    return HealthStatusResponse(
        status="ok",
        environment=settings.ENV,
    )


@router.get(
    "/health/ready",
    response_model=DatabaseHealthResponse,
    summary="Application & Database Readiness Probe",
    operation_id="readiness_check",
)
@router.get(
    "/health/db",
    response_model=DatabaseHealthResponse,
    summary="Database Readiness Check",
    operation_id="database_health_check",
)
def database_health_check(
    db: Session = Depends(get_db),
) -> DatabaseHealthResponse:
    """
    Readiness probe:
    - Tests live MySQL connectivity
    - Checks MySQL version is at least 8.0.16 (supports CHECK constraints)
    - Verifies migrations exist in schema_migrations
    """
    try:
        # 1. Check version
        version_row = db.execute(text("SELECT VERSION()")).scalar()
        version_str = str(version_row) if version_row else "unknown"

        # Check for MySQL 8.0.16+
        # Extract major, minor, patch
        is_valid_version = True
        parts = version_str.split("-")[0].split(".")
        if len(parts) >= 2:
            try:
                major = int(parts[0])
                minor = int(parts[1])
                patch = int(parts[2]) if len(parts) > 2 else 0
                if (major, minor, patch) < (8, 0, 16):
                    is_valid_version = False
            except ValueError:
                pass

        # 2. Check migrations in schema_migrations
        mig_result: list[str] = list(
            db.execute(text("SELECT migration FROM schema_migrations ORDER BY applied_at DESC"))
            .scalars()
            .all()
        )

        latest_mig = mig_result[0] if mig_result else None
        mig_count = len(mig_result)

        return DatabaseHealthResponse(
            status="healthy" if is_valid_version else "degraded",
            database="connected",
            mysql_version=version_str,
            version_valid=is_valid_version,
            latest_migration=latest_mig,
            migrations_count=mig_count,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database readiness check failed: {exc}",
        ) from exc


@router.get(
    "/version",
    response_model=VersionResponse,
    summary="Application Version & Revision",
    operation_id="get_version",
)
def get_version(settings: Settings = Depends(get_settings)) -> VersionResponse:
    return VersionResponse(
        app="Rent4Fraction Server",
        version="0.1.0",
        environment=settings.ENV,
        git_commit=get_git_commit(),
    )
