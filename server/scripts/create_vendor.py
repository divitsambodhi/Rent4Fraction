#!/usr/bin/env python3
"""
CLI utility to safely generate Firebase custom tokens or register/promote users to vendor role in Rent4Fraction.

Usage examples:
  # 1. Promote an existing user to vendor and generate a custom auth token for Swagger:
  python scripts/create_vendor.py --email vendor@rent4fraction.com --business-name "Pro Audio Rentals"

  # 2. Skip interactive prompts:
  python scripts/create_vendor.py --email vendor@rent4fraction.com --business-name "Pro Audio Rentals" --yes
"""

from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

# Add server root to sys.path
server_root = Path(__file__).resolve().parent.parent
if str(server_root) not in sys.path:
    sys.path.insert(0, str(server_root))

from firebase_admin import auth  # noqa: E402
from firebase_admin._auth_utils import UserNotFoundError  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.db import get_engine, transaction  # noqa: E402
from app.core.firebase import init_firebase  # noqa: E402
from app.models.accounts import User, UserRole, Vendor, VendorApprovalStatus  # noqa: E402
from app.models.platform import AuditLog  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Provision or promote a user to an approved vendor in Rent4Fraction."
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Email address of the Firebase Auth user to promote/make vendor.",
    )
    parser.add_argument(
        "--business-name",
        required=False,
        default=None,
        help="Store / business name for the vendor (default: '<Name> Rentals').",
    )
    parser.add_argument(
        "--commission-rate",
        type=float,
        default=10.0,
        help="Platform commission rate percent (default: 10.0).",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip confirmation prompt.",
    )

    args = parser.parse_args()
    email = args.email.strip().lower()

    # 1. Init Firebase Admin
    firebase_app = init_firebase()
    if firebase_app is None:
        print(
            "ERROR: Firebase Admin SDK is not configured. Set GOOGLE_APPLICATION_CREDENTIALS.",
            file=sys.stderr,
        )
        sys.exit(1)

    # 2. Fetch Firebase user
    try:
        fb_user = auth.get_user_by_email(email)
    except UserNotFoundError:
        print(
            f"ERROR: No user found in Firebase Auth with email '{email}'.\n"
            f"Please register/create this user first in Firebase.",
            file=sys.stderr,
        )
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Firebase query failed: {e}", file=sys.stderr)
        sys.exit(1)

    display_name = fb_user.display_name or email.split("@")[0].title()
    business_name = args.business_name or f"{display_name} Rentals"

    print("\n---------------------------------------------------------")
    print("Rent4Fraction Vendor Setup")
    print("---------------------------------------------------------")
    print(f"Email:         {email}")
    print(f"Firebase UID:  {fb_user.uid}")
    print(f"Name:          {display_name}")
    print(f"Business Name: {business_name}")
    print(f"Commission:    {args.commission_rate}%")
    print("---------------------------------------------------------")

    if not args.yes:
        confirm = input("Proceed with making this user an approved vendor? [y/N]: ").strip().lower()
        if confirm not in ("y", "yes"):
            print("Aborted.")
            sys.exit(0)

    # 3. Database operation
    engine = get_engine()
    with Session(engine) as session, transaction(session):
        user = session.query(User).filter(User.firebase_uid == fb_user.uid).first()
        if not user:
            user = User(
                firebase_uid=fb_user.uid,
                email=email,
                name=display_name,
                role=UserRole.vendor,
                is_active=1,
                email_verified=1 if fb_user.email_verified else 0,
            )
            session.add(user)
            session.flush()
            print(f"Created user record (ID: {user.user_id}).")
        else:
            user.role = UserRole.vendor
            user.is_active = 1
            print(f"Updated user record (ID: {user.user_id}) to role 'vendor'.")

        vendor = session.query(Vendor).filter(Vendor.user_id == user.user_id).first()
        if not vendor:
            vendor = Vendor(
                user_id=user.user_id,
                business_name=business_name,
                approval_status=VendorApprovalStatus.approved,
                approved_at=datetime.now(UTC),
                commission_rate=Decimal(str(args.commission_rate)),
                delivery_fee=Decimal("300.00"),
                address="Mumbai, Maharashtra",
            )
            session.add(vendor)
            session.flush()
            print(f"Created approved vendor profile (Vendor ID: {vendor.vendor_id}).")
        else:
            vendor.business_name = business_name
            vendor.approval_status = VendorApprovalStatus.approved
            vendor.commission_rate = Decimal(str(args.commission_rate))
            print(f"Updated vendor profile (Vendor ID: {vendor.vendor_id}) to approved.")

        audit = AuditLog(
            actor_user_id=user.user_id,
            actor_role="admin",
            action="vendor.provision",
            entity_type="vendor",
            entity_id=vendor.vendor_id,
            after_json={
                "email": email,
                "business_name": business_name,
                "firebase_uid": fb_user.uid,
            },
        )
        session.add(audit)

    # 4. Generate custom Firebase token
    try:
        custom_token = auth.create_custom_token(fb_user.uid)
        token_str = custom_token.decode("utf-8") if isinstance(custom_token, bytes) else str(custom_token)
        print("\nSUCCESS: User is now an approved vendor!")
        print("\n---------------------------------------------------------")
        print("Firebase Custom Token (Exchange for ID Token or use in client):")
        print("---------------------------------------------------------")
        print(token_str)
        print("---------------------------------------------------------")
    except Exception as e:
        print(f"\nVendor provisioned in DB, but failed generating custom token: {e}")


if __name__ == "__main__":
    main()

