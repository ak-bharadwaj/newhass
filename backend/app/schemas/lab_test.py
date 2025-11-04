"""Pydantic schemas for Lab Test resources"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class LabTestBase(BaseModel):
    """Base lab test schema"""
    test_type: str = Field(..., min_length=1, max_length=100, description="e.g., CBC, Lipid Panel, X-Ray")
    urgency: str = Field(default="routine", description="routine, urgent, stat")
    notes: Optional[str] = None


class LabTestCreate(LabTestBase):
    """Schema for creating lab test request"""
    patient_id: UUID
    visit_id: UUID


class LabTestUpdate(BaseModel):
    """Schema for updating lab test"""
    status: Optional[str] = None
    result_summary: Optional[str] = None
    result_file_url: Optional[str] = None
    notes: Optional[str] = None


class LabTestResponse(LabTestBase):
    """Schema for lab test response"""
    id: UUID
    patient_id: UUID
    visit_id: UUID
    requested_by_id: UUID
    requested_by_name: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    assigned_to_name: Optional[str] = None
    status: str
    urgency: str
    requested_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result_file_url: Optional[str] = None
    result_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedLabTests(BaseModel):
    """Paginated lab tests response"""
    tests: List[LabTestResponse]
    total: int
    page: int
    page_size: int
