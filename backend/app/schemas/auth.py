"""Authentication schemas"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict
from datetime import datetime
import uuid


class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str = Field(..., min_length=6)
    otp_code: Optional[str] = None


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema"""
    refresh_token: str


class UserResponse(BaseModel):
    """User response schema"""
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role_id: uuid.UUID
    role_name: str
    role_display_name: str
    permissions: Dict[str, bool]
    region_id: Optional[uuid.UUID] = None
    hospital_id: Optional[uuid.UUID] = None
    is_active: bool
    two_factor_enabled: bool = False
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CurrentUser(BaseModel):
    """Current authenticated user schema"""
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role_name: str
    permissions: Dict[str, bool]
    region_id: Optional[uuid.UUID] = None
    hospital_id: Optional[uuid.UUID] = None


class TwoFactorSetupResponse(BaseModel):
    """Response containing 2FA setup details"""
    secret: str
    otpauth_url: str


class OtpCodeRequest(BaseModel):
    """Payload for submitting an OTP code"""
    otp_code: str = Field(..., min_length=3, max_length=12)


class TwoFactorStatusResponse(BaseModel):
    """2FA status response"""
    message: str
    two_factor_enabled: bool
