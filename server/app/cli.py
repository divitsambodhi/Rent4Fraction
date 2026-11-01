"""CLI commands for Rent4Fraction server administration.

Usage:
  python -m app.cli create-admin --email <email> [--name "Admin Name"] [--yes]
  python -m app.cli doctor
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure root directory is on path
server_root = Path(__file__).resolve().parent.parent
if str(server_root) not in sys.path:
    sys.path.insert(0, str(server_root))

from app.core.db import get_engine, transaction
from app.core.firebase import init_firebase
from app.models.accounts import User, UserRole, Vendor
from app.models.platform import AuditLog


def create_admin(email: str, name: str | None = None, yes: bool = False) -> None:
    from firebase_admin import auth
    from firebase_admin._auth_utils import UserNotFoundError

    email = email.strip().lower()
    firebase_app = init_firebase()
    if firebase_app is None:
        print("ERROR: Firebase Admin SDK is not configured.", file=sys.stderr)
        sys.exit(1)

    try:
        fb_user = auth.get_user_by_email(email)
    except UserNotFoundError:
        print(f"ERROR: No Firebase Auth user exists with email: {email}", file=sys.stderr)
        sys.exit(1)

    admin_name = name or fb_user.display_name or "Administrator"

    if not yes:
        confirm = input(f"Promote '{email}' (UID: {fb_user.uid}) to platform Administrator? [y/N]: ")
        if confirm.strip().lower() not in ("y", "yes"):
            print("Aborted.")
            sys.exit(0)

    engine = get_engine()
    with transaction(engine) as db:
        user = db.query(User).filter(User.email == email).first()
        if user:
            old_role = user.role.value
            user.role = UserRole.ADMIN
            user.is_active = True
            action_desc = f"Promoted user {email} from {old_role} to admin"
        else:
            user = User(
                firebase_uid=fb_user.uid,
                email=email,
                name=admin_name,
                role=UserRole.ADMIN,
                is_active=True,
                email_verified=fb_user.email_verified,
            )
            db.add(user)
            db.flush()
            action_desc = f"Provisioned new admin user {email}"

        # Clean up vendor status if they had one
        vendor = db.query(Vendor).filter(Vendor.user_id == user.user_id).first()
        if vendor:
            vendor.approval_status = "approved"

        audit_entry = AuditLog(
            user_id=user.user_id,
            action="admin_promoted_via_cli",
            entity_type="user",
            entity_id=user.user_id,
            details={"description": action_desc, "promoted_by": "cli"},
        )
        db.add(audit_entry)

    print(f"SUCCESS: User '{email}' is now an Administrator.")


def run_doctor() -> None:
    """Diagnostic tool to verify environment, DB, Firebase, Cloudinary, and CORS."""
    import requests
    from requests.auth import HTTPBasicAuth
    from sqlalchemy import text
    from app.core.config import get_settings

    print("======================================================================")
    print("  Rent4Fraction Environment Doctor Diagnostics")
    print("======================================================================")

    settings = get_settings()
    has_errors = False

    # 1. Environment & Base Config
    print(f"[1/5] Application Environment: {settings.ENV.upper()}")
    print(f"      Log Level: {settings.LOG_LEVEL} | Debug Mode: {getattr(settings, 'DEBUG', False)}")
    if settings.ENV == "prod" and getattr(settings, "DEBUG", False):
        print("      [FAIL] DEBUG is set to True in production!")
        has_errors = True
    else:
        print("      [OK] Base settings valid.")

    # 2. Database Connectivity & SSL
    print(f"[2/5] Database Verification...")
    try:
        engine = get_engine()
        with engine.connect() as conn:
            ver = conn.execute(text("SELECT VERSION()")).scalar()
            print(f"      Connected successfully. MySQL Version: {ver}")

            # Check SSL cipher
            ssl_res = conn.execute(text("SHOW STATUS LIKE 'Ssl_cipher'")).fetchone()
            ssl_cipher = ssl_res[1] if ssl_res and len(ssl_res) > 1 else ""
            if ssl_cipher:
                print(f"      SSL Cipher: {ssl_cipher} [ENCRYPTED]")
            else:
                if settings.is_production:
                    print("      [FAIL] Connection is NOT using SSL in production!")
                    has_errors = True
                else:
                    print("      SSL: Disabled (Permitted in development)")

            # Check migrations count
            try:
                mig_count = conn.execute(text("SELECT COUNT(*) FROM schema_migrations")).scalar()
                print(f"      Schema Migrations Applied: {mig_count}")
            except Exception as e:
                print(f"      [WARN] Could not read schema_migrations: {e}")
        print("      [OK] Database operational.")
    except Exception as exc:
        print(f"      [FAIL] Database connection failed: {exc}")
        has_errors = True

    # 3. Firebase Auth
    print(f"[3/5] Firebase Authentication...")
    print(f"      Project ID: {settings.FIREBASE_PROJECT_ID or 'Not Set'}")
    fb_app = init_firebase()
    if fb_app:
        print("      [OK] Firebase Admin SDK initialized successfully.")
    else:
        if settings.is_production:
            print("      [FAIL] Firebase Admin SDK failed to initialize in production!")
            has_errors = True
        else:
            print("      [WARN] Firebase uninitialized or using emulator.")

    # 4. Storage Provider (Cloudinary)
    print(f"[4/5] Storage Provider: {settings.STORAGE_PROVIDER}")
    if settings.STORAGE_PROVIDER == "cloudinary":
        print(f"      Cloud Name: {settings.CLOUDINARY_CLOUD_NAME}")
        print(f"      API Key: {settings.CLOUDINARY_API_KEY[:4]}...{settings.CLOUDINARY_API_KEY[-4:] if len(settings.CLOUDINARY_API_KEY) > 8 else ''}")
        try:
            ping_url = f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/ping"
            resp = requests.get(
                ping_url,
                auth=HTTPBasicAuth(settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET),
                timeout=5.0,
            )
            if resp.status_code == 200:
                print("      [OK] Cloudinary Ping response: HTTP 200 OK.")
            else:
                print(f"      [FAIL] Cloudinary Ping returned HTTP {resp.status_code}: {resp.text}")
                has_errors = True
        except Exception as exc:
            print(f"      [FAIL] Cloudinary ping error: {exc}")
            has_errors = True
    else:
        if settings.is_production:
            print("      [FAIL] STORAGE_PROVIDER cannot be 'fake' in production!")
            has_errors = True
        else:
            print("      [OK] Offline fake storage configured.")

    # 5. CORS Origins
    print(f"[5/5] CORS Configuration...")
    origins = settings.cors_origin_list
    print(f"      Allowed Origins ({len(origins)}): {', '.join(origins)}")
    if settings.is_production and "*" in origins:
        print("      [FAIL] Wildcard '*' CORS origin present in production!")
        has_errors = True
    else:
        print("      [OK] CORS configuration valid.")

    print("======================================================================")
    if has_errors:
        print("  [DOCTOR RESULT] System has configuration errors. See details above.")
        print("======================================================================")
        sys.exit(1)
    else:
        print("  [DOCTOR RESULT] All diagnostics PASSED! System is ready.")
        print("======================================================================")
        sys.exit(0)


def main() -> None:
    parser = argparse.ArgumentParser(description="Rent4Fraction Administration CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_admin_parser = subparsers.add_parser("create-admin", help="Create or promote an administrator")
    create_admin_parser.add_argument("--email", required=True, help="Firebase user email")
    create_admin_parser.add_argument("--name", required=False, default=None, help="Admin display name")
    create_admin_parser.add_argument("--yes", action="store_true", help="Skip confirmation prompt")

    subparsers.add_parser("doctor", help="Run deployment diagnostics and readiness checks")

    args = parser.parse_args()
    if args.command == "create-admin":
        create_admin(args.email, args.name, args.yes)
    elif args.command == "doctor":
        run_doctor()


if __name__ == "__main__":
    main()
