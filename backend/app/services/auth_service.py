"""Authentication service"""
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime
import pyotp

from app.models.user import User
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
)
from app.schemas.auth import TokenResponse, UserResponse, CurrentUser


class AuthService:
    """Authentication service for login, logout, and token management"""

    def __init__(self, db: Session):
        self.db = db

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate a user by email and password"""
        user = self.db.query(User).filter(
            User.email == email,
            User.is_active == True,
            User.is_deleted == False
        ).first()

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        return user

    def login(self, email: str, password: str, otp_code: Optional[str] = None) -> TokenResponse:
        """Login a user and return tokens.

        If the user has two-factor authentication enabled, a valid one-time password (OTP)
        must be provided. Otherwise, an HTTP 401 will be raised indicating 2FA is required
        or the OTP is invalid.
        """
        user = self.authenticate_user(email, password)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # If two-factor is enabled, validate OTP
        if user.two_factor_enabled:
            if not user.two_factor_secret:
                # Misconfigured state: 2FA enabled but no secret stored
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Two-factor authentication misconfigured for this account",
                )
            if not otp_code:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Two-factor authentication required",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            totp = pyotp.TOTP(user.two_factor_secret)
            if not totp.verify(otp_code, valid_window=1):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid OTP code",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()

        # Create tokens
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role_id": str(user.role_id),
        }

        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=1800,  # 30 minutes in seconds
        )

    def generate_two_factor_secret(self, user: User) -> Tuple[str, str]:
        """Generate and store a new 2FA secret for the user and return (secret, otpauth_url)."""
        secret = pyotp.random_base32()
        user.two_factor_secret = secret
        # Do not enable 2FA yet; will be enabled upon confirmation
        self.db.commit()

        totp = pyotp.TOTP(secret)
        otpauth_url = totp.provisioning_uri(name=user.email, issuer_name="HASS")
        return secret, otpauth_url

    def confirm_two_factor(self, user: User, otp_code: str) -> bool:
        """Confirm 2FA setup by verifying a provided OTP code and enabling 2FA if valid."""
        if not user.two_factor_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor setup not initiated",
            )
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(otp_code, valid_window=1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code",
            )
        user.two_factor_enabled = True
        self.db.commit()
        return True

    def disable_two_factor(self, user: User, otp_code: str) -> bool:
        """Disable 2FA for the user after verifying the current OTP code."""
        if not user.two_factor_secret:
            # Already disabled
            user.two_factor_enabled = False
            self.db.commit()
            return True
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(otp_code, valid_window=1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code",
            )
        user.two_factor_enabled = False
        user.two_factor_secret = None
        self.db.commit()
        return True

    def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """Refresh an access token using a refresh token"""
        payload = decode_token(refresh_token)

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_token_type(payload, "refresh"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify user still exists and is active
        user_id = payload.get("sub")
        user = self.db.query(User).filter(
            User.id == user_id,
            User.is_active == True,
            User.is_deleted == False
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create new tokens
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role_id": str(user.role_id),
        }

        access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=1800,
        )

    def get_current_user(self, token: str) -> User:
        """Get the current user from an access token"""
        payload = decode_token(token)

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_token_type(payload, "access"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = self.db.query(User).filter(
            User.id == user_id,
            User.is_active == True,
            User.is_deleted == False
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    def get_user_response(self, user: User) -> UserResponse:
        """Convert a User model to UserResponse schema"""
        return UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role_id=user.role_id,
            role_name=user.role.name,
            role_display_name=user.role.display_name,
            permissions=user.role.permissions,
            region_id=user.region_id,
            hospital_id=user.hospital_id,
            is_active=user.is_active,
            two_factor_enabled=bool(user.two_factor_enabled),
            last_login=user.last_login,
            created_at=user.created_at,
        )

    def get_current_user_schema(self, user: User) -> CurrentUser:
        """Convert a User model to CurrentUser schema"""
        return CurrentUser(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role_name=user.role.name,
            permissions=user.role.permissions,
            region_id=user.region_id,
            hospital_id=user.hospital_id,
        )
