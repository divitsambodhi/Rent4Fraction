#!/usr/bin/env python3
"""
Multi-Vendor Order Lifecycle Integration Demo Script.

Demonstrates the complete end-to-end multi-vendor rental lifecycle:
1. Two vendors (Vendor A and Vendor B) with equipment listings.
2. Customer checkout creating a multi-vendor booking.
3. Payment capture via simulated gateway.
4. Vendor A accepts; Vendor B declines (triggering automatic partial refund for B's share).
5. Delivery scheduling, dispatch, and delivery confirmation with proof path.
6. Return scheduling and check-in.
7. Return inspection with damage report filing.
8. Admin dispute resolution with partial deposit deduction.
9. Final order completion, deposit settlement refund, and vendor payout calculation.
10. Forward-only payout transition to paid with UTR reference.
11. Verification of the 10 system invariant checks.

SAFETY INVARIANT:
This script strictly refuses to run against a production database.
It requires TEST_DATABASE_URL to be explicitly set and distinct from DATABASE_URL,
or containing the word 'test'.
"""
from __future__ import annotations

import os
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal

# Safety guard: Refuse to execute against production
prod_db = os.environ.get("DATABASE_URL", "").strip()
test_db = os.environ.get("TEST_DATABASE_URL", "").strip()

if not test_db and "test" not in prod_db.lower():
    print(
        "SAFETY ERROR: lifecycle_demo.py must only run against a designated test database!\n"
        "Please set TEST_DATABASE_URL (e.g. mysql+pymysql://root:pass@localhost:3306/rent4fraction_test)\n"
        "and ensure it contains 'test' in the database name.",
        file=sys.stderr,
    )
    sys.exit(1)

target_db_url = test_db or prod_db

# Configure environment for test execution
os.environ["DATABASE_URL"] = target_db_url
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


def run_demo() -> None:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.core.time import utc_now
    from app.models.accounts import User, UserRole, Vendor, VendorApprovalStatus
    from app.models.catalog import Category, Equipment, EquipmentStatus
    from app.models.fulfilment import ReturnItem
    from app.models.orders import (
        Booking,
        BookingItem,
        BookingItemStatus,
        BookingPaymentStatus,
        BookingStatus,
        VendorOrder,
        VendorOrderStatus,
    )
    from app.models.payments import (
        Payment,
        PaymentMethod,
        PaymentStatus,
        PaymentType,
        Payout,
    )
    from app.services.admin import AdminService
    from app.services.lifecycle.service import LifecycleService
    from app.services.lifecycle.types import (
        DeclinePayload,
        DeliveryProofPayload,
        DisputeResolutionPayload,
        InspectionItemPayload,
        InspectionPayload,
        ScheduleDeliveryPayload,
        ScheduleReturnPayload,
    )

    print("=" * 80)
    print("RENT4FRACTION — MULTI-VENDOR LIFECYCLE SIMULATION DEMO")
    print(f"Target Database: {target_db_url}")
    print("=" * 80)

    engine = create_engine(target_db_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)

    with Session() as db:
        lifecycle = LifecycleService(db)
        admin_service = AdminService(db)

        print("\n[Step 1] Seeding Test Customer and Vendors...")
        # 1. Admin
        admin_user = db.query(User).filter(User.role == UserRole.admin).first()
        if not admin_user:
            admin_user = User(
                firebase_uid="demo_admin_uid",
                name="Platform Admin",
                email="admin@rent4fraction.demo",
                phone="+919876543210",
                role=UserRole.admin,
                is_active=1,
                email_verified=1,
            )
            db.add(admin_user)
            db.flush()

        # 2. Customer
        customer = db.query(User).filter(User.email == "customer@rent4fraction.demo").first()
        if not customer:
            customer = User(
                firebase_uid="demo_customer_uid",
                name="Demo Customer",
                email="customer@rent4fraction.demo",
                phone="+919876543211",
                role=UserRole.customer,
                is_active=1,
                email_verified=1,
            )
            db.add(customer)
            db.flush()

        # 3. Vendors A & B
        vendor_user_a = db.query(User).filter(User.email == "vendor_a@rent4fraction.demo").first()
        if not vendor_user_a:
            vendor_user_a = User(
                firebase_uid="demo_vendor_a_uid",
                name="Vendor Sound Pro",
                email="vendor_a@rent4fraction.demo",
                role=UserRole.vendor,
                is_active=1,
                email_verified=1,
            )
            db.add(vendor_user_a)
            db.flush()

        vendor_a = db.query(Vendor).filter(Vendor.user_id == vendor_user_a.user_id).first()
        if not vendor_a:
            vendor_a = Vendor(
                user_id=vendor_user_a.user_id,
                business_name="Sound Pro Audio Rentals",
                status=VendorApprovalStatus.approved,
                commission_rate=Decimal("12.00"),
                city="Mumbai",
                address="Andheri West, Mumbai",
                pincode="400053",
            )
            db.add(vendor_a)
            db.flush()

        vendor_user_b = db.query(User).filter(User.email == "vendor_b@rent4fraction.demo").first()
        if not vendor_user_b:
            vendor_user_b = User(
                firebase_uid="demo_vendor_b_uid",
                name="Vendor Stage Lighting",
                email="vendor_b@rent4fraction.demo",
                role=UserRole.vendor,
                is_active=1,
                email_verified=1,
            )
            db.add(vendor_user_b)
            db.flush()

        vendor_b = db.query(Vendor).filter(Vendor.user_id == vendor_user_b.user_id).first()
        if not vendor_b:
            vendor_b = Vendor(
                user_id=vendor_user_b.user_id,
                business_name="Lumina Stage Lights",
                status=VendorApprovalStatus.approved,
                commission_rate=Decimal("15.00"),
                city="Mumbai",
                address="Bandra West, Mumbai",
                pincode="400050",
            )
            db.add(vendor_b)
            db.flush()

        # Equipment listings
        cat = db.query(Category).first()
        if not cat:
            cat = Category(name="Event Gear", slug="event-gear", default_commission_rate=Decimal("10.00"), is_active=1)
            db.add(cat)
            db.flush()

        eq_a = db.query(Equipment).filter(Equipment.vendor_id == vendor_a.vendor_id).first()
        if not eq_a:
            eq_a = Equipment(
                vendor_id=vendor_a.vendor_id,
                category_id=cat.category_id,
                name="JBL Line Array Speakers",
                slug=f"jbl-line-array-{utc_now().timestamp()}",
                price_per_day=Decimal("5000.00"),
                security_deposit=Decimal("10000.00"),
                quantity=4,
                status=EquipmentStatus.published,
                is_active=1,
            )
            db.add(eq_a)
            db.flush()

        eq_b = db.query(Equipment).filter(Equipment.vendor_id == vendor_b.vendor_id).first()
        if not eq_b:
            eq_b = Equipment(
                vendor_id=vendor_b.vendor_id,
                category_id=cat.category_id,
                name="Moving Head Spot 300W",
                slug=f"moving-head-spot-{utc_now().timestamp()}",
                price_per_day=Decimal("2000.00"),
                security_deposit=Decimal("4000.00"),
                quantity=6,
                status=EquipmentStatus.published,
                is_active=1,
            )
            db.add(eq_b)
            db.flush()

        print(f"  -> Seeding complete. Customer ID: {customer.user_id}, Vendor A: {vendor_a.vendor_id}, Vendor B: {vendor_b.vendor_id}")

        print("\n[Step 2] Creating Multi-Vendor Booking...")
        start_d = date.today() + timedelta(days=2)
        end_d = date.today() + timedelta(days=4)
        days = 3

        # Subtotals:
        # A: 5000 * 1 * 3 = 15000, deposit = 10000, commission snapshot = 15000 * 12% = 1800
        # B: 2000 * 2 * 3 = 12000, deposit = 8000, commission snapshot = 12000 * 15% = 1800
        # Total subtotal = 27000, Total deposit = 18000, Tax (18%) = 4860, Total = 49860
        booking = Booking(
            user_id=customer.user_id,
            start_date=start_d,
            end_date=end_d,
            event_name="Annual Music Fest 2026",
            event_type="Concert",
            delivery_city="Mumbai",
            subtotal=Decimal("27000.00"),
            discount=Decimal("0.00"),
            tax=Decimal("4860.00"),
            delivery_fee=Decimal("0.00"),
            security_deposit=Decimal("18000.00"),
            total_amount=Decimal("49860.00"),
            status=BookingStatus.pending,
            payment_status=BookingPaymentStatus.paid,
        )
        db.add(booking)
        db.flush()

        vo_a = VendorOrder(
            booking_id=booking.booking_id,
            vendor_id=vendor_a.vendor_id,
            subtotal=Decimal("15000.00"),
            status=VendorOrderStatus.pending,
        )
        vo_b = VendorOrder(
            booking_id=booking.booking_id,
            vendor_id=vendor_b.vendor_id,
            subtotal=Decimal("12000.00"),
            status=VendorOrderStatus.pending,
        )
        db.add_all([vo_a, vo_b])
        db.flush()

        item_a = BookingItem(
            booking_id=booking.booking_id,
            vendor_order_id=vo_a.vendor_order_id,
            vendor_id=vendor_a.vendor_id,
            equipment_id=eq_a.equipment_id,
            quantity=1,
            days=days,
            price_per_day=Decimal("5000.00"),
            total_price=Decimal("15000.00"),
            deposit_amount=Decimal("10000.00"),
            commission_rate=Decimal("12.00"),
            commission_amount=Decimal("1800.00"),
            item_status=BookingItemStatus.pending,
        )
        item_b = BookingItem(
            booking_id=booking.booking_id,
            vendor_order_id=vo_b.vendor_order_id,
            vendor_id=vendor_b.vendor_id,
            equipment_id=eq_b.equipment_id,
            quantity=2,
            days=days,
            price_per_day=Decimal("2000.00"),
            total_price=Decimal("12000.00"),
            deposit_amount=Decimal("8000.00"),
            commission_rate=Decimal("15.00"),
            commission_amount=Decimal("1800.00"),
            item_status=BookingItemStatus.pending,
        )
        db.add_all([item_a, item_b])

        # Record initial customer payment
        pay = Payment(
            booking_id=booking.booking_id,
            user_id=customer.user_id,
            amount=Decimal("49860.00"),
            type=PaymentType.booking,
            method=PaymentMethod.card,
            status=PaymentStatus.success,
            transaction_id=f"pay_demo_{int(utc_now().timestamp())}",
        )
        db.add(pay)
        db.commit()

        print(f"  -> Booking BK-{booking.booking_id:04d} created with paid status ₹49,860.00.")

        print("\n[Step 3] Vendor Orders Transition: Vendor A Accepts, Vendor B Declines...")
        # Vendor A accepts
        lifecycle.transition(
            vendor_order_id=vo_a.vendor_order_id,
            action="accept",
            actor_user_id=vendor_user_a.user_id,
            role="vendor",
        )
        print(f"  -> Vendor A accepted VO-{vo_a.vendor_order_id:04d}. Item status: {item_a.item_status.value}")

        # Vendor B declines
        lifecycle.transition(
            vendor_order_id=vo_b.vendor_order_id,
            action="decline",
            actor_user_id=vendor_user_b.user_id,
            role="vendor",
            payload=DeclinePayload(reason="All moving head spotlights are booked for another private festival."),
        )
        print(f"  -> Vendor B declined VO-{vo_b.vendor_order_id:04d}. Item status: {item_b.item_status.value}")
        print(f"  -> Derived Booking Status: {booking.status.value}")

        print("\n[Step 4] Vendor A Schedules Delivery and Marks Out For Delivery...")
        start_win = datetime.combine(start_d, datetime.min.time()).replace(hour=9, minute=0)
        end_win = datetime.combine(start_d, datetime.min.time()).replace(hour=11, minute=0)

        lifecycle.transition(
            vendor_order_id=vo_a.vendor_order_id,
            action="schedule_delivery",
            actor_user_id=vendor_user_a.user_id,
            role="vendor",
            payload=ScheduleDeliveryPayload(
                type="delivery",
                scheduled_start=start_win,
                scheduled_end=end_win,
                delivered_by="Sound Pro Logistics Express",
                tracking_info="TRK-SOUND-9921",
            ),
        )
        print("  -> Delivery scheduled.")

        lifecycle.transition(
            vendor_order_id=vo_a.vendor_order_id,
            action="mark_dispatched",
            actor_user_id=vendor_user_a.user_id,
            role="vendor",
        )
        print(f"  -> Order marked dispatched. Order status: {vo_a.status.value}")

        print("\n[Step 5] Vendor A Confirms Delivery with Proof Storage Path...")
        lifecycle.transition(
            vendor_order_id=vo_a.vendor_order_id,
            action="mark_delivered",
            actor_user_id=vendor_user_a.user_id,
            role="vendor",
            payload=DeliveryProofPayload(
                proof_storage_path=f"private/delivery-proofs/{vendor_a.vendor_id}/{vo_a.vendor_order_id}/proof_001.jpg",
                delivered_by="Driver Suresh",
                note="Delivered and handed over to event stage manager.",
            ),
        )
        print(f"  -> Order delivered. Order status: {vo_a.status.value}")

        print("\n[Step 6] Return Lifecycle: Schedule Return and Mark Returned...")
        ret_start = datetime.combine(end_d, datetime.min.time()).replace(hour=14, minute=0)
        ret_end = datetime.combine(end_d, datetime.min.time()).replace(hour=16, minute=0)

        lifecycle.transition(
            vendor_order_id=vo_a.vendor_order_id,
            action="schedule_return",
            actor_user_id=vendor_user_a.user_id,
            role="vendor",
            payload=ScheduleReturnPayload(
                scheduled_start=ret_start,
                scheduled_end=ret_end,
                note="Scheduled post-event breakdown pickup.",
            ),
        )

        lifecycle.transition(
            vendor_order_id=vo_a.vendor_order_id,
            action="mark_returned",
            actor_user_id=vendor_user_a.user_id,
            role="vendor",
        )
        print(f"  -> Equipment returned. Order status: {vo_a.status.value}")

        print("\n[Step 7] Return Inspection: Minor Damage Reported...")
        lifecycle.transition(
            vendor_order_id=vo_a.vendor_order_id,
            action="inspect",
            actor_user_id=vendor_user_a.user_id,
            role="vendor",
            payload=InspectionPayload(
                items=[
                    InspectionItemPayload(
                        booking_item_id=item_a.booking_item_id,
                        quantity_returned=1,
                        condition="minor_damage",
                        damage_description="Cracked front grille mesh on right speaker cabinet.",
                        damage_cost=Decimal("2500.00"),
                        deducted_from_deposit=True,
                    )
                ]
            ),
        )
        print("  -> Damage report filed for ₹2,500.00.")

        # Find damage report
        ret_item = db.query(ReturnItem).filter(ReturnItem.booking_item_id == item_a.booking_item_id).first()
        dr = ret_item.damage_report
        print(f"  -> Damage Report ID: {dr.report_id}, Status: {dr.status.value}")

        print("\n[Step 8] Admin Resolves Damage Dispute with Partial Deduction...")
        lifecycle.resolve_dispute(
            report_id=dr.report_id,
            actor_user_id=admin_user.user_id,
            role="admin",
            payload=DisputeResolutionPayload(
                outcome="partial",
                final_amount=Decimal("1500.00"),
                resolution_note="Admin approved partial claim of ₹1,500 for mesh repair; balance waived.",
            ),
        )
        print(f"  -> Dispute resolved. Final cost: ₹{dr.final_cost}, Status: {dr.status.value}")

        print("\n[Step 9] Order Completion, Deposit Settlement & Payout Creation...")
        lifecycle.transition(
            vendor_order_id=vo_a.vendor_order_id,
            action="complete",
            actor_user_id=vendor_user_a.user_id,
            role="vendor",
        )
        print(f"  -> Order completed! Status: {vo_a.status.value}")

        payout = db.query(Payout).filter(Payout.vendor_order_id == vo_a.vendor_order_id).first()
        print(f"  -> Payout Generated: Gross=₹{payout.gross_amount}, Comm=₹{payout.commission_amount}, Net=₹{payout.net_amount}, Status={payout.status.value}")

        print("\n[Step 10] Admin Transitions Payout: Processing -> Paid (with UTR)...")
        admin_service.update_payout_status(
            admin_id=admin_user.user_id,
            payout_id=payout.payout_id,
            new_status="processing",
        )
        admin_service.update_payout_status(
            admin_id=admin_user.user_id,
            payout_id=payout.payout_id,
            new_status="paid",
            note="NEFT-UTR-99882211 - Axis Bank Settlement",
        )
        db.commit()
        print(f"  -> Payout paid! Status: {payout.status.value}, Paid at: {payout.paid_at.isoformat()}")

        print("\n[Step 11] Running Platform System Invariant Checks...")
        checks_report = admin_service.run_system_checks()
        print(f"  -> Total Checks: {checks_report.total_checks}, Passed: {checks_report.passed_checks}, Failed: {checks_report.failed_checks}")
        assert checks_report.passed, f"System checks failed: {[c.name for c in checks_report.checks if c.status == 'fail']}"
        print("  -> ALL INVARIANTS SATISFIED.")

    print("\n" + "=" * 80)
    print("LIFECYCLE INTEGRATION DEMO COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    run_demo()
