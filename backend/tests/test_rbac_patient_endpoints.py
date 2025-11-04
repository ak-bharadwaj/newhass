"""RBAC tests for patient endpoints to ensure patient-role users only access their own data"""
from fastapi import status

from app.main import app as _app  # FastAPI instance
from app.core.dependencies import get_current_active_user
from app.models.role import Role
from app.models.user import User
from app.models.patient import Patient


def test_patient_cannot_access_other_patient_detail(client, test_db):
    # Create patient role
    role = Role(name="patient", display_name="Patient", permissions={})
    test_db.add(role)
    test_db.commit()
    test_db.refresh(role)

    # Create two users with patient role
    u1 = User(email="p1@example.com", password_hash="x", first_name="P1", last_name="User", role_id=role.id)
    u2 = User(email="p2@example.com", password_hash="x", first_name="P2", last_name="User", role_id=role.id)
    test_db.add_all([u1, u2])
    test_db.commit()
    test_db.refresh(u1)
    test_db.refresh(u2)

    # Create patient records linked to users
    p1 = Patient(first_name="P1", last_name="User", date_of_birth="1990-01-01", gender="male", user_id=u1.id)
    p2 = Patient(first_name="P2", last_name="User", date_of_birth="1991-01-01", gender="female", user_id=u2.id)
    test_db.add_all([p1, p2])
    test_db.commit()
    test_db.refresh(p1)
    test_db.refresh(p2)

    # Override current user to be u1 (patient)
    def override_current_user():
        return u1

    _app.dependency_overrides[get_current_active_user] = override_current_user

    # u1 can access own record
    res = client.get(f"/api/v1/patients/{p1.id}")
    assert res.status_code == status.HTTP_200_OK

    # u1 cannot access other patient's record
    res = client.get(f"/api/v1/patients/{p2.id}")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # u1 cannot access other patient's prescriptions
    res = client.get(f"/api/v1/patients/{p2.id}/prescriptions")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # Clean overrides
    _app.dependency_overrides.pop(get_current_active_user, None)
