import pytest

from app.core.pagination import Page, PaginationParams


@pytest.mark.unit
def test_pagination_params_bounds() -> None:
    # Negative page is clamped to 1
    p = PaginationParams(page=-5, pageSize=50)
    assert p.page == 1
    assert p.offset == 0
    assert p.limit == 50

    # Max page size is capped at 100
    p2 = PaginationParams(page=2, pageSize=500)
    assert p2.page == 2
    assert p2.pageSize == 100
    assert p2.offset == 100


@pytest.mark.unit
def test_page_envelope() -> None:
    envelope = Page[str](items=["item1", "item2"], total=25, page=1, pageSize=10)
    assert envelope.total_pages == 3
    assert envelope.items == ["item1", "item2"]
