"""Doctor-related schemas"""
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class DoctorBrief(BaseModel):
    id: UUID
    full_name: str
    profile_picture_url: Optional[str] = None
    qualification: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    hospital_name: Optional[str] = None

    class Config:
        from_attributes = True
