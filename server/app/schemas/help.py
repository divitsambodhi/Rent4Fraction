from __future__ import annotations

from pydantic import ConfigDict, BaseModel, EmailStr, Field


class FAQItemResponse(BaseModel):
    id: str
    question: str
    answer: str
    category: str | None = None


class FAQResponse(BaseModel):
    version: str
    updated_at: str
    faqs: list[FAQItemResponse]


class ContactFormRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=10, max_length=2000)
    booking_number: str | None = None
    consent: bool = True


ContactRequest = ContactFormRequest
