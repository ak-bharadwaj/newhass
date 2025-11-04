from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import date

from app.main import app
from app.core.database import get_db
from app.models.role import Role
from app.models.user import User
from app.models.patient import Patient


def test_messages_thread_and_send(client: TestClient, test_db: Session):
    # Arrange: roles + users
    role_staff = Role(name="doctor", display_name="Doctor", permissions={})
    test_db.add(role_staff)
    test_db.flush()

    staff = User(
        email="doc@example.com",
        password_hash="x",
        first_name="Doc",
        last_name="Tor",
        role_id=role_staff.id,
        is_active=True,
    )
    test_db.add(staff)
    test_db.flush()

    # Patient + linked user
    patient_user = User(
        email="patient@example.com",
        password_hash="x",
        first_name="Pat",
        last_name="Ient",
        role_id=role_staff.id,  # role not used for patient in this test
        is_active=True,
    )
    test_db.add(patient_user)
    test_db.flush()

    patient = Patient(
        user_id=patient_user.id,
        first_name="Pat",
        last_name="Ient",
        date_of_birth=date(1990, 1, 1),
        gender="male",
    )
    test_db.add(patient)
    test_db.commit()
    test_db.refresh(staff)
    test_db.refresh(patient)

    # Override current user to staff for creating thread
    from app.core.dependencies import get_current_active_user

    def _override_current_user_staff():
        return staff

    app.dependency_overrides[get_current_active_user] = _override_current_user_staff

    # Create/get thread
    resp = client.post(
        "/api/v1/messages/threads",
        json={"patient_id": str(patient.id), "staff_user_id": str(staff.id), "subject": "Follow-up"},
        headers={"Authorization": "Bearer test"},
    )
    assert resp.status_code == 200, resp.text
    thread = resp.json()

    # Send message as staff
    resp = client.post(
        f"/api/v1/messages/threads/{thread['id']}/messages",
        json={"content": "Hello, how are you?"},
        headers={"Authorization": "Bearer test"},
    )
    assert resp.status_code == 200, resp.text

    # Switch current user to patient for listing
    def _override_current_user_patient():
        return patient_user

    app.dependency_overrides[get_current_active_user] = _override_current_user_patient

    resp = client.get(
        f"/api/v1/messages/threads/{thread['id']}/messages",
        headers={"Authorization": "Bearer test"},
    )
    assert resp.status_code == 200
    msgs = resp.json()
    assert len(msgs) == 1
    assert msgs[0]["content"] == "Hello, how are you?"

    app.dependency_overrides.clear()
