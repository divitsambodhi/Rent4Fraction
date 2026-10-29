"""CLI commands for Rent4Fraction server administration.

Usage:
  python -m app.cli create-admin --email <email> [--name "Admin Name"] [--yes]
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Rent4Fraction Administration CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_admin_parser = subparsers.add_parser("create-admin", help="Create or promote an administrator")
    create_admin_parser.add_argument("--email", required=True, help="Firebase user email")
    create_admin_parser.add_argument("--name", required=False, default=None, help="Admin display name")
    create_admin_parser.add_argument("--yes", action="store_true", help="Skip confirmation prompt")

    args = parser.parse_args()
    if args.command == "create-admin":
        create_admin(args.email, args.name, args.yes)


if __name__ == "__main__":
    main()

