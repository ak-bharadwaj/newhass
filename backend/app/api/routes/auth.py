"""Authentication API routes"""
from fastapi import APIRouter, Depends, Response, status, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import date

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_active_user, get_auth_service
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
    TwoFactorSetupResponse,
    OtpCodeRequest,
    TwoFactorStatusResponse,
)
from app.services.auth_service import AuthService
from app.models.user import User
from app.models.patient import Patient
from app.models.role import Role
from app.core.security import hash_password
from uuid import UUID

router = APIRouter()


class PatientRegistrationRequest(BaseModel):
    """Patient self-registration request"""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    phone: str
    hospital_id: str
    blood_group: str = None
    address: str = None
    allergies: str = None
    emergency_contact_name: str = None
    emergency_contact_phone: str = None


@router.post("/register/patient", status_code=status.HTTP_201_CREATED)
def register_patient(
    registration_data: PatientRegistrationRequest,
    db: Session = Depends(get_db)
):
    """
    Patient self-registration endpoint
    Allows patients to create their own accounts
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == registration_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Get patient role
    patient_role = db.query(Role).filter(Role.name == "patient").first()
    if not patient_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Patient role not found"
        )
    
    # Get hospital to determine region
    from app.models.hospital import Hospital
    hospital = db.query(Hospital).filter(Hospital.id == UUID(registration_data.hospital_id)).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found"
        )
    
    try:
        # Create user account
        new_user = User(
            email=registration_data.email,
            password_hash=hash_password(registration_data.password),
            first_name=registration_data.first_name,
            last_name=registration_data.last_name,
            phone=registration_data.phone,
            role_id=patient_role.id,
            region_id=hospital.region_id,
            hospital_id=hospital.id,
            is_active=True
        )
        db.add(new_user)
        db.flush()  # Get user ID
        
        # Generate MRN
        hospital_code = hospital.code
        patient_count = db.query(Patient).filter(Patient.hospital_id == hospital.id).count()
        mrn = f"{hospital_code}-{str(patient_count + 1).zfill(6)}"
        
        # Create patient record
        new_patient = Patient(
            user_id=new_user.id,
            hospital_id=hospital.id,
            mrn=mrn,
            first_name=registration_data.first_name,
            last_name=registration_data.last_name,
            date_of_birth=registration_data.date_of_birth,
            gender=registration_data.gender,
            blood_group=registration_data.blood_group,
            phone=registration_data.phone,
            email=registration_data.email,
            address=registration_data.address,
            emergency_contact_name=registration_data.emergency_contact_name,
            emergency_contact_phone=registration_data.emergency_contact_phone,
            allergies=registration_data.allergies,
            is_active=True
        )
        db.add(new_patient)
        
        # Create audit log
        from app.models.audit_log import AuditLog
        audit_log = AuditLog(
            user_id=None,  # Self-registration
            action="CREATE",
            resource_type="patient",
            resource_id=new_patient.id,
            notes=f"Patient self-registration: {registration_data.email}"
        )
        db.add(audit_log)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Registration successful. You can now log in.",
            "user_id": str(new_user.id),
            "patient_id": str(new_patient.id),
            "mrn": mrn
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(
    login_data: LoginRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Login with email and password.

    Returns access and refresh tokens.
    Tokens are also set as httpOnly cookies for web clients.
    """
    tokens = auth_service.login(login_data.email, login_data.password, login_data.otp_code)

    # Set tokens as httpOnly cookies
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=1800,  # 30 minutes
    )

    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=604800,  # 7 days
    )

    return tokens


@router.post("/2fa/setup/initiate", response_model=TwoFactorSetupResponse, status_code=status.HTTP_200_OK)
def initiate_two_factor_setup(
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Initiate two-factor authentication setup for the current user.

    Returns a secret and an otpauth URL for QR code generation.
    """
    secret, otpauth_url = auth_service.generate_two_factor_secret(current_user)
    return TwoFactorSetupResponse(secret=secret, otpauth_url=otpauth_url)


@router.post("/2fa/setup/confirm", response_model=TwoFactorStatusResponse, status_code=status.HTTP_200_OK)
def confirm_two_factor_setup(
    payload: OtpCodeRequest,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Confirm two-factor authentication setup by verifying an OTP code.
    """
    auth_service.confirm_two_factor(current_user, payload.otp_code)
    return TwoFactorStatusResponse(message="Two-factor authentication enabled", two_factor_enabled=True)


@router.post("/2fa/disable", response_model=TwoFactorStatusResponse, status_code=status.HTTP_200_OK)
def disable_two_factor(
    payload: OtpCodeRequest,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Disable two-factor authentication for the current user after verifying an OTP code.
    """
    auth_service.disable_two_factor(current_user, payload.otp_code)
    return TwoFactorStatusResponse(message="Two-factor authentication disabled", two_factor_enabled=False)


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def refresh_token(
    refresh_data: RefreshTokenRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Refresh access token using refresh token.

    Returns new access and refresh tokens.
    """
    tokens = auth_service.refresh_access_token(refresh_data.refresh_token)

    # Update cookies
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=1800,
    )

    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=604800,
    )

    return tokens


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    """
    Logout the current user.

    Clears authentication cookies.
    """
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Get current authenticated user information.

    Requires valid access token.
    """
    return auth_service.get_user_response(current_user)
