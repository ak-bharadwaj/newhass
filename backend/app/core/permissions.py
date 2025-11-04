"""RBAC permission definitions and checking"""
from typing import Dict, List
from app.models.role import Role
from app.models.user import User


class Permission:
    """Permission constants"""

    # Global permissions
    VIEW_GLOBAL_METRICS = "can_view_global_metrics"
    CREATE_REGIONS = "can_create_regions"
    MANAGE_USERS = "can_manage_users"

    # Regional permissions
    VIEW_REGIONAL_METRICS = "can_view_regional_metrics"
    CREATE_HOSPITALS = "can_create_hospitals"
    MANAGE_REGIONAL_USERS = "can_manage_regional_users"

    # Patient management
    ADMIT_PATIENTS = "can_admit_patients"
    ASSIGN_BEDS = "can_assign_beds"

    # Clinical permissions
    VIEW_EMR = "can_view_emr"
    EDIT_EMR = "can_edit_emr"
    PRESCRIBE = "can_prescribe"
    ORDER_LABS = "can_order_labs"
    DISCHARGE = "can_discharge"
    APPROVE_AI_DRAFTS = "can_approve_ai_drafts"

    # Nursing permissions
    RECORD_VITALS = "can_record_vitals"
    ADMINISTER_MEDS = "can_administer_meds"
    CREATE_NURSE_LOGS = "can_create_nurse_logs"

    # Lab permissions
    VIEW_LAB_REQUESTS = "can_view_lab_requests"
    UPLOAD_LAB_RESULTS = "can_upload_lab_results"
    MANAGE_LAB_INVENTORY = "can_manage_lab_inventory"

    # Pharmacy permissions
    VIEW_PRESCRIPTIONS = "can_view_prescriptions"
    DISPENSE_MEDICATIONS = "can_dispense_medications"
    MANAGE_PHARMACY_INVENTORY = "can_manage_pharmacy_inventory"

    # Reception permissions
    BOOK_APPOINTMENTS = "can_book_appointments"
    CHECKIN_PATIENTS = "can_checkin_patients"
    SEARCH_PATIENTS = "can_search_patients"
    MANAGE_APPOINTMENTS = "can_manage_appointments"

    # Patient permissions
    VIEW_OWN_EMR = "can_view_own_emr"
    VIEW_OWN_LAB_RESULTS = "can_view_own_lab_results"
    REQUEST_APPOINTMENTS = "can_request_appointments"


def has_permission(user: User, permission: str) -> bool:
    """Check if a user has a specific permission"""
    if not user.role or not user.role.permissions:
        return False

    return user.role.permissions.get(permission, False)


def has_any_permission(user: User, permissions: List[str]) -> bool:
    """Check if a user has any of the specified permissions"""
    return any(has_permission(user, perm) for perm in permissions)


def has_all_permissions(user: User, permissions: List[str]) -> bool:
    """Check if a user has all of the specified permissions"""
    return all(has_permission(user, perm) for perm in permissions)


def require_permission(permission: str):
    """Decorator to require a specific permission"""
    def decorator(func):
        # This will be used with dependency injection in FastAPI routes
        func._required_permission = permission
        return func
    return decorator


def get_user_permissions(user: User) -> Dict[str, bool]:
    """Get all permissions for a user"""
    if not user.role or not user.role.permissions:
        return {}

    return user.role.permissions
