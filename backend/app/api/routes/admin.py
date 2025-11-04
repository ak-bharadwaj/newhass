"""Admin API routes"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.admin_service import AdminService
from app.schemas.admin import (
    GlobalMetrics,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListFilters,
    PaginatedUsers,
)
from app.models.user import User

router = APIRouter()


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """Get admin service instance"""
    return AdminService(db)


@router.get("/metrics/global", response_model=GlobalMetrics)
def get_global_metrics(
    current_user: User = Depends(require_role("super_admin")),
    admin_service: AdminService = Depends(get_admin_service),
):
    """Get global KPI metrics for Super Admin dashboard"""
    return admin_service.get_global_metrics()


@router.get("/users", response_model=PaginatedUsers)
def get_users(
    role_name: Optional[str] = Query(None),
    region_id: Optional[UUID] = Query(None),
    hospital_id: Optional[UUID] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    admin_service: AdminService = Depends(get_admin_service),
):
    """Get paginated list of users with filters"""
    filters = UserListFilters(
        role_name=role_name,
        region_id=region_id,
        hospital_id=hospital_id,
        is_active=is_active,
        search=search,
    )
    return admin_service.get_users(filters=filters, page=page, page_size=page_size)


@router.post("/users", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    admin_service: AdminService = Depends(get_admin_service),
):
    """
    Create a new user
    - super_admin: Can create any role including regional_admin
    - regional_admin: Can create all roles except patient and regional_admin in their region
    - patient: Self-register via /auth/register/patient
    """
    from fastapi import HTTPException, status
    from app.models.role import Role
    
    # Get the role being created
    db = admin_service.db
    target_role = db.query(Role).filter(Role.id == user_data.role_id).first()
    
    if not target_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Enforce permission rules
    if target_role.name == "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patients must self-register via /auth/register/patient"
        )
    
    # Only super_admin can create regional_admin
    if target_role.name == "regional_admin" and current_user.role.name != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super_admin can create regional_admin users"
        )
    
    # Regional admin can only create users in their region
    if current_user.role.name == "regional_admin":
        if not user_data.region_id or str(user_data.region_id) != str(current_user.region_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Regional admin can only create users in their own region"
            )
    
    return admin_service.create_user(user_data)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    admin_service: AdminService = Depends(get_admin_service),
):
    """Update a user"""
    return admin_service.update_user(user_id, user_data)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_role("super_admin")),
    admin_service: AdminService = Depends(get_admin_service),
):
    """Soft delete a user"""
    return admin_service.delete_user(user_id)
