from __future__ import annotations

from collections.abc import Sequence
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """
    Standard pagination envelope matching the frontend expected shape:
    { items: [...], total: number, page: number, pageSize: number }
    """

    items: Sequence[T]
    total: int = Field(..., ge=0, description="Total matching items across all pages")
    page: int = Field(..., ge=1, description="Current 1-based page number")
    pageSize: int = Field(..., ge=1, le=100, description="Page size limit")

    @property
    def total_pages(self) -> int:
        if self.pageSize <= 0:
            return 0
        return (self.total + self.pageSize - 1) // self.pageSize


class PaginationParams:
    """Dependency for extracting and validating query parameters for pagination."""

    def __init__(
        self,
        page: int = 1,
        pageSize: int = 20,
    ) -> None:
        self.page = max(1, page)
        self.pageSize = max(1, min(100, pageSize))

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.pageSize

    @property
    def limit(self) -> int:
        return self.pageSize
