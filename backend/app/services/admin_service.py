"""Admin service for Super Admin operations"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from fastapi import HTTPException, status

from app.models.user import User
from app.models.role import Role
from app.models.region import Region
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.visit import Visit
from app.models.bed import Bed
from app.schemas.admin import (
    GlobalMetrics,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListFilters,
    PaginatedUsers,
)
from app.core.security import hash_password


class AdminService:
    """Service for admin operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_global_metrics(self) -> GlobalMetrics:
        """Get global KPI metrics"""
        # Total patients
        total_patients = self.db.query(func.count(Patient.id)).filter(Patient.is_active == True).scalar() or 0

        # Active visits
        active_visits = (
            self.db.query(func.count(Visit.id)).filter(Visit.status == "active").scalar() or 0
        )

        # Open emergencies
        open_emergencies = (
            self.db.query(func.count(Visit.id))
            .filter(and_(Visit.status == "active", Visit.visit_type == "emergency"))
            .scalar()
            or 0
        )

        # Average bed utilization
        total_beds = self.db.query(func.count(Bed.id)).filter(Bed.is_active == True).scalar() or 1
        occupied_beds = (
            self.db.query(func.count(Bed.id))
            .filter(and_(Bed.is_active == True, Bed.status == "occupied"))
            .scalar()
            or 0
        )
        avg_bed_utilization = (occupied_beds / total_beds * 100) if total_beds > 0 else 0

        # Total regions
        total_regions = self.db.query(func.count(Region.id)).filter(Region.is_active == True).scalar() or 0

        # Total hospitals
        total_hospitals = (
            self.db.query(func.count(Hospital.id)).filter(Hospital.is_active == True).scalar() or 0
        )

        # Total staff (exclude patient role)
        total_staff = (
            self.db.query(func.count(User.id))
            .join(Role)
            .filter(and_(User.is_active == True, User.is_deleted == False, Role.name != "patient"))
            .scalar()
            or 0
        )

        return GlobalMetrics(
            total_patients=total_patients,
            active_visits=active_visits,
            open_emergencies=open_emergencies,
            avg_bed_utilization=round(avg_bed_utilization, 2),
            total_regions=total_regions,
            total_hospitals=total_hospitals,
            total_staff=total_staff,
        )

    def get_users(
        self, filters: Optional[UserListFilters] = None, page: int = 1, page_size: int = 50
    ) -> PaginatedUsers:
        """Get paginated list of users with filters"""
        query = self.db.query(User).filter(User.is_deleted == False)

        # Apply filters
        if filters:
            if filters.role_name:
                query = query.join(Role).filter(Role.name == filters.role_name)
            if filters.region_id:
                query = query.filter(User.region_id == filters.region_id)
            if filters.hospital_id:
                query = query.filter(User.hospital_id == filters.hospital_id)
            if filters.is_active is not None:
                query = query.filter(User.is_active == filters.is_active)
            if filters.search:
                search_term = f"%{filters.search}%"
                query = query.filter(
                    (User.email.ilike(search_term))
                    | (User.first_name.ilike(search_term))
                    | (User.last_name.ilike(search_term))
                )

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * page_size
        users = query.offset(offset).limit(page_size).all()

        # Convert to response schema
        user_responses = []
        for user in users:
            user_responses.append(
                UserResponse(
                    id=user.id,
                    email=user.email,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    phone=user.phone,
                    is_active=user.is_active,
                    role_id=user.role_id,
                    role_name=user.role.name,
                    region_id=user.region_id,
                    region_name=user.region.name if user.region else None,
                    hospital_id=user.hospital_id,
                    hospital_name=user.hospital.name if user.hospital else None,
                    is_deleted=user.is_deleted,
                    last_login=user.last_login,
                    created_at=user.created_at,
                    updated_at=user.updated_at,
                )
            )

        return PaginatedUsers(users=user_responses, total=total, page=page, page_size=page_size)

    def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user"""
        # Check if email already exists
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
            )

        # Verify role exists
        role = self.db.query(Role).filter(Role.id == user_data.role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

        # Verify region if provided
        if user_data.region_id:
            region = self.db.query(Region).filter(Region.id == user_data.region_id).first()
            if not region:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Region not found"
                )

        # Verify hospital if provided
        if user_data.hospital_id:
            hospital = self.db.query(Hospital).filter(Hospital.id == user_data.hospital_id).first()
            if not hospital:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found"
                )

        # Create user
        new_user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            role_id=user_data.role_id,
            region_id=user_data.region_id,
            hospital_id=user_data.hospital_id,
            is_active=user_data.is_active,
        )

        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)

        return UserResponse(
            id=new_user.id,
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            phone=new_user.phone,
            is_active=new_user.is_active,
            role_id=new_user.role_id,
            role_name=new_user.role.name,
            region_id=new_user.region_id,
            region_name=new_user.region.name if new_user.region else None,
            hospital_id=new_user.hospital_id,
            hospital_name=new_user.hospital.name if new_user.hospital else None,
            is_deleted=new_user.is_deleted,
            last_login=new_user.last_login,
            created_at=new_user.created_at,
            updated_at=new_user.updated_at,
        )

    def update_user(self, user_id: UUID, user_data: UserUpdate) -> UserResponse:
        """Update a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Check email uniqueness if changing
        if user_data.email and user_data.email != user.email:
            existing_user = self.db.query(User).filter(User.email == user_data.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
                )

        # Update fields
        if user_data.email is not None:
            user.email = user_data.email
        if user_data.first_name is not None:
            user.first_name = user_data.first_name
        if user_data.last_name is not None:
            user.last_name = user_data.last_name
        if user_data.phone is not None:
            user.phone = user_data.phone
        if user_data.is_active is not None:
            user.is_active = user_data.is_active
        if user_data.role_id is not None:
            user.role_id = user_data.role_id
        if user_data.region_id is not None:
            user.region_id = user_data.region_id
        if user_data.hospital_id is not None:
            user.hospital_id = user_data.hospital_id

        self.db.commit()
        self.db.refresh(user)

        return UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            phone=user.phone,
            is_active=user.is_active,
            role_id=user.role_id,
            role_name=user.role.name,
            region_id=user.region_id,
            region_name=user.region.name if user.region else None,
            hospital_id=user.hospital_id,
            hospital_name=user.hospital.name if user.hospital else None,
            is_deleted=user.is_deleted,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    def delete_user(self, user_id: UUID) -> Dict[str, Any]:
        """Soft delete a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        user.is_deleted = True
        user.is_active = False

        self.db.commit()

        return {"message": "User deleted successfully", "user_id": str(user_id)}
