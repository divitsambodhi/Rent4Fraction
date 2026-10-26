#!/usr/bin/env python3
"""
CLI script to safely provision or promote an administrator account.

Usage:
  python server/scripts/create_admin.py --email admin@rent4fraction.com [--name "Admin Name"] [--yes]

Security Rules:
- Requires that the Firebase Auth user already exists (in Firebase console or via emulator).
- Looks up user by email using Firebase Admin SDK.
- Creates or updates the MySQL `users` record with role 'admin'.
- Requires interactive confirmation unless --yes is passed.
- Writes an append-only audit log row.
- Never accepts, handles, or prints passwords or credentials.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure the server root is in sys.path when invoked directly as python scripts/create_admin.py
server_root = Path(__file__).resolve().parent.parent
if str(server_root) not in sys.path:
    sys.path.insert(0, str(server_root))

from firebase_admin import auth  # noqa: E402
from firebase_admin._auth_utils import UserNotFoundError  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.db import get_engine, transaction  # noqa: E402
from app.core.firebase import init_firebase  # noqa: E402
from app.models.accounts import User, UserRole  # noqa: E402
from app.models.platform import AuditLog  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Provision or promote a user to administrator role in Rent4Fraction."
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Email address of the Firebase Auth user to promote or create as admin.",
    )
    parser.add_argument(
        "--name",
        required=False,
        default=None,
        help="Display name for the administrator (defaults to Firebase display name or 'Administrator').",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip interactive confirmation prompt.",
    )

    args = parser.parse_args()
    email = args.email.strip().lower()

    # 1. Initialise Firebase Admin SDK
    firebase_app = init_firebase()
    if firebase_app is None:
        print(
            "ERROR: Firebase Admin SDK is not configured. Set GOOGLE_APPLICATION_CREDENTIALS "
            "or FIREBASE_AUTH_EMULATOR_HOST before running this script.",
            file=sys.stderr,
        )
        sys.exit(1)

    # 2. Look up user by email in Firebase Auth
    try:
        fb_user = auth.get_user_by_email(email)
    except UserNotFoundError:
        print(
            f"ERROR: No user found in Firebase Auth with email '{email}'.\n"
            f"Please create the account first in the Firebase Console or via the local Auth Emulator.",
            file=sys.stderr,
        )
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Firebase Admin lookup failed: {e}", file=sys.stderr)
        sys.exit(1)

    firebase_uid = fb_user.uid
    display_name = (
        args.name
        or fb_user.display_name
        or (email.split("@")[0].title() if "@" in email else "Admin")
    )

    # 3. Connect to Database
    engine = get_engine()
    with Session(engine) as session:
        # Check if user already exists in `users`
        existing_user = (
            session.query(User)
            .filter((User.firebase_uid == firebase_uid) | (User.email == email))
            .first()
        )

        if existing_user:
            if existing_user.role == UserRole.admin:
                print(
                    f"Notice: User '{email}' is already an administrator (User ID: {existing_user.user_id}).\n"
                    f"No modifications needed."
                )
                sys.exit(0)

            # Prompt before promoting existing user
            old_role = existing_user.role.value
            print(
                f"\nExisting user found:\n"
                f"  User ID:      {existing_user.user_id}\n"
                f"  Email:        {existing_user.email}\n"
                f"  Current Role: {old_role}\n"
                f"  Target Role:  admin\n"
            )

            if not args.yes:
                confirm = input("Confirm promotion to 'admin'? [y/N]: ").strip().lower()
                if confirm not in ("y", "yes"):
                    print("Operation cancelled by user.")
                    sys.exit(0)

            with transaction(session):
                existing_user.role = UserRole.admin
                existing_user.firebase_uid = firebase_uid
                if args.name:
                    existing_user.name = display_name
                existing_user.email_verified = 1

                audit = AuditLog(
                    actor_user_id=existing_user.user_id,
                    actor_role="admin",
                    action="admin_promoted",
                    entity_type="user",
                    entity_id=existing_user.user_id,
                    before_json={"role": old_role},
                    after_json={"role": "admin", "promoted_via": "create_admin.py"},
                    user_agent="server/scripts/create_admin.py",
                )
                session.add(audit)

            print(
                f"\nSUCCESS: User '{email}' (User ID: {existing_user.user_id}) promoted to 'admin'."
            )
            sys.exit(0)

        # User does not exist in DB yet: create new admin user
        print(
            f"\nNew administrator profile to create:\n"
            f"  Firebase UID: {firebase_uid}\n"
            f"  Email:        {email}\n"
            f"  Name:         {display_name}\n"
            f"  Role:         admin\n"
        )

        if not args.yes:
            confirm = input("Create new administrator account in database? [y/N]: ").strip().lower()
            if confirm not in ("y", "yes"):
                print("Operation cancelled by user.")
                sys.exit(0)

        with transaction(session):
            new_user = User(
                firebase_uid=firebase_uid,
                name=display_name,
                email=email,
                role=UserRole.admin,
                is_active=1,
                email_verified=1,
            )
            session.add(new_user)
            session.flush()

            audit = AuditLog(
                actor_user_id=new_user.user_id,
                actor_role="admin",
                action="admin_created",
                entity_type="user",
                entity_id=new_user.user_id,
                before_json=None,
                after_json={
                    "user_id": new_user.user_id,
                    "email": email,
                    "role": "admin",
                    "created_via": "create_admin.py",
                },
                user_agent="server/scripts/create_admin.py",
            )
            session.add(audit)

        print(
            f"\nSUCCESS: Created administrator account for '{email}' "
            f"(User ID: {new_user.user_id}, Firebase UID: {firebase_uid})."
        )


if __name__ == "__main__":
    main()
