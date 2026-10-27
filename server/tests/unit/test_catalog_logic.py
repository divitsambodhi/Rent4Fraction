from __future__ import annotations

from decimal import Decimal

import pytest

from app.models.accounts import User, UserRole, Vendor, VendorApprovalStatus
from app.models.catalog import Category, Equipment, EquipmentStatus
from app.repositories.catalog import CatalogRepository, sanitize_search_query


@pytest.mark.unit
def test_search_query_sanitizer() -> None:
    # Short query (< 3 chars or tokens) uses LIKE mode
    val, is_ft = sanitize_search_query("dj")
    assert is_ft is False
    assert val == "dj"

    # Standard query with tokens >= 3 chars uses boolean fulltext mode
    val, is_ft = sanitize_search_query("sony camera 4k")
    assert is_ft is True
    assert "+sony* +camera* +4k*" in (val or "")

    # Boolean operators stripped / sanitized
    val, is_ft = sanitize_search_query('+"canon" -nikon* (dslr)')
    assert is_ft is True
    assert "+canon* +nikon* +dslr*" in (val or "")


@pytest.mark.unit
def test_equipment_visibility_predicate(db_session) -> None:
    repo = CatalogRepository(db_session)

    # 1. Approved vendor with active user
    u_active = User(
        firebase_uid="uid-v1",
        email="v1@test.com",
        role=UserRole.vendor,
        name="Active User",
        is_active=True,
    )
    db_session.add(u_active)
    db_session.flush()

    v_approved = Vendor(
        user_id=u_active.user_id,
        business_name="Pro Audio",
        approval_status=VendorApprovalStatus.approved,
        address="Bengaluru",
    )
    db_session.add(v_approved)
    db_session.flush()

    # 2. Unapproved vendor
    u_pending = User(
        firebase_uid="uid-v2",
        email="v2@test.com",
        role=UserRole.vendor,
        name="Pending User",
        is_active=True,
    )
    db_session.add(u_pending)
    db_session.flush()

    v_pending = Vendor(
        user_id=u_pending.user_id,
        business_name="Pending Audio",
        approval_status=VendorApprovalStatus.pending,
        address="Bengaluru",
    )
    db_session.add(v_pending)
    db_session.flush()

    # Category
    cat = Category(
        name="Speakers",
        is_active=1,
    )
    db_session.add(cat)
    db_session.flush()

    # Active equipment under approved vendor (SHOULD be visible)
    eq_active = Equipment(
        vendor_id=v_approved.vendor_id,
        category_id=cat.category_id,
        name="JBL PartyBox 310",
        description="Great speaker",
        status=EquipmentStatus.active,
        price_per_day=Decimal("1500.00"),
        security_deposit=Decimal("5000.00"),
        quantity=2,
    )
    # Inactive equipment under approved vendor (SHOULD NOT be listed)
    eq_inactive = Equipment(
        vendor_id=v_approved.vendor_id,
        category_id=cat.category_id,
        name="Old Mic",
        description="Inactive mic",
        status=EquipmentStatus.inactive,
        price_per_day=Decimal("300.00"),
        security_deposit=Decimal("1000.00"),
        quantity=1,
    )
    # Equipment under pending vendor (SHOULD NOT be listed)
    eq_unapproved_vendor = Equipment(
        vendor_id=v_pending.vendor_id,
        category_id=cat.category_id,
        name="Hidden Guitar",
        description="Unapproved",
        status=EquipmentStatus.active,
        price_per_day=Decimal("800.00"),
        security_deposit=Decimal("2000.00"),
        quantity=1,
    )
    db_session.add_all([eq_active, eq_inactive, eq_unapproved_vendor])
    db_session.commit()

    # Search listing must only return eq_active
    res = repo.search_equipment(page=1, page_size=10)
    items = res["items"]
    assert res["total"] == 1
    assert items[0]["name"] == "JBL PartyBox 310"

    # Detail query:
    # 1. Active item returns successfully
    det = repo.get_equipment_detail(eq_active.equipment_id)
    assert det is not None
    assert det["name"] == "JBL PartyBox 310"

    # 2. Inactive item from approved vendor returns detail (UI displays "currently unavailable")
    det_inactive = repo.get_equipment_detail(eq_inactive.equipment_id)
    assert det_inactive is not None
    assert det_inactive["status"] == "inactive"

    # 3. Item from unapproved vendor returns inactive status (reported as unavailable without revealing reason)
    det_pending = repo.get_equipment_detail(eq_unapproved_vendor.equipment_id)
    assert det_pending is not None
    assert det_pending["status"] == "inactive"


@pytest.mark.unit
def test_categories_tree_and_item_counts(db_session) -> None:
    repo = CatalogRepository(db_session)

    # Active vendor
    u = User(firebase_uid="uid-cat", email="cat@test.com", role=UserRole.vendor, name="Cat User", is_active=True)
    db_session.add(u)
    db_session.flush()
    v = Vendor(user_id=u.user_id, business_name="Cat Vendor", approval_status=VendorApprovalStatus.approved, address="Mumbai")
    db_session.add(v)
    db_session.flush()

    # Parent category
    parent = Category(name="Sound & Audio", is_active=1)
    db_session.add(parent)
    db_session.flush()

    # Child category
    child = Category(name="Microphones", parent_id=parent.category_id, is_active=1)
    db_session.add(child)
    db_session.flush()

    # Add active item in child
    eq = Equipment(
        vendor_id=v.vendor_id,
        category_id=child.category_id,
        name="Shure SM58",
        description="Vocal mic",
        status=EquipmentStatus.active,
        price_per_day=Decimal("500.00"),
        security_deposit=Decimal("1000.00"),
        quantity=5,
    )
    db_session.add(eq)
    db_session.commit()

    tree = repo.get_categories()
    assert len(tree) >= 1
    parent_node = next(c for c in tree if c["id"] == str(parent.category_id))
    assert parent_node["name"] == "Sound & Audio"
    assert len(parent_node["children"]) == 1
    child_node = parent_node["children"][0]
    assert child_node["name"] == "Microphones"
    assert child_node["equipment_count"] == 1


