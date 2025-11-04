"""Pydantic schemas for Admin resources"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class GlobalMetrics(BaseModel):
    """Global KPI metrics for Super Admin dashboard"""
    total_patients: int
    active_visits: int
    open_emergencies: int
    avg_bed_utilization: float
    total_regions: int
    total_hospitals: int
    total_staff: int


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: bool = True


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str = Field(..., min_length=8)
    role_id: UUID
    region_id: Optional[UUID] = None
    hospital_id: Optional[UUID] = None


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    role_id: Optional[UUID] = None
    region_id: Optional[UUID] = None
    hospital_id: Optional[UUID] = None


class UserResponse(UserBase):
    """Schema for user response"""
    id: UUID
    role_id: UUID
    role_name: str
    region_id: Optional[UUID] = None
    region_name: Optional[str] = None
    hospital_id: Optional[UUID] = None
    hospital_name: Optional[str] = None
    is_deleted: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListFilters(BaseModel):
    """Filters for user list query"""
    role_name: Optional[str] = None
    region_id: Optional[UUID] = None
    hospital_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    search: Optional[str] = None  # Search by email or name


class PaginatedUsers(BaseModel):
    """Paginated user list response"""
    users: List[UserResponse]
    total: int
    page: int
    page_size: int
