from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.main import app
from app.core.database import Base
from app.core.database import get_db
from app.models.role import Role
from app.models.user import User
from app.models.hospital import Hospital


def test_api_keys_crud_flow(client: TestClient, test_db: Session):
    # Arrange: create admin role, hospital, and user
    role = Role(name="super_admin", display_name="Super Admin", permissions={})
    test_db.add(role)
    hospital = Hospital(id=uuid4(), name="Test Hospital", region_id=None)
    test_db.add(hospital)
    test_db.flush()

    admin = User(
        email="admin@example.com",
        password_hash="x",
        first_name="Admin",
        last_name="User",
        role_id=role.id,
        hospital_id=hospital.id,
        is_active=True,
    )
    test_db.add(admin)
    test_db.commit()
    test_db.refresh(admin)

    # Override auth to return our admin user
    from app.core.dependencies import get_current_active_user

    def _override_current_user():
        return admin

    app.dependency_overrides[get_current_active_user] = _override_current_user

    # Act: create an API key
    resp = client.post(
        "/api/v1/admin/api-keys/",
        json={"name": "CI Key", "scopes": ["read", "write"], "hospital_id": str(hospital.id)},
        headers={"Authorization": "Bearer test"},
    )
    assert resp.status_code == 201, resp.text
    key_payload = resp.json()
    assert "key" in key_payload and key_payload["prefix"] and key_payload["key_id"]

    # List
    resp = client.get(
        "/api/v1/admin/api-keys/",
        headers={"Authorization": "Bearer test"},
    )
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1

    key_id = items[0]["id"]

    # Rotate
    resp = client.post(
        f"/api/v1/admin/api-keys/{key_id}/rotate",
        headers={"Authorization": "Bearer test"},
    )
    assert resp.status_code == 200
    rotated = resp.json()
    assert rotated["prefix"] and rotated["key"]

    # Revoke
    resp = client.delete(
        f"/api/v1/admin/api-keys/{key_id}",
        headers={"Authorization": "Bearer test"},
    )
    assert resp.status_code == 204

    app.dependency_overrides.clear()
