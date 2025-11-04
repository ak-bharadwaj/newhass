"""Seed script for demo data - Creates all roles, demo users, and sample data"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, date, timedelta
import uuid

from app.core.database import SessionLocal
from app.models import (
    Role,
    Region,
    Hospital,
    User,
    Patient,
    Visit,
    Bed,
    Vitals,
    Prescription,
    LabTest,
    Appointment,
    Inventory,
)

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def seed_roles(db: Session):
    """Create all system roles"""
    print("Creating roles...")

    roles_data = [
        {
            "name": "super_admin",
            "display_name": "Super Administrator",
            "permissions": {
                "can_view_global_metrics": True,
                "can_create_regions": True,
                "can_manage_users": True,
                "can_view_emr": True,
                "can_edit_emr": False,
                "can_prescribe": False,
            },
        },
        {
            "name": "regional_admin",
            "display_name": "Regional Administrator",
            "permissions": {
                "can_view_regional_metrics": True,
                "can_create_hospitals": True,
                "can_manage_regional_users": True,
                "can_view_emr": True,
                "can_edit_emr": False,
            },
        },
        {
            "name": "manager",
            "display_name": "Manager / Front Desk",
            "permissions": {
                "can_admit_patients": True,
                "can_assign_beds": True,
                "can_manage_appointments": True,
                "can_view_emr": True,
            },
        },
        {
            "name": "doctor",
            "display_name": "Doctor",
            "permissions": {
                "can_view_emr": True,
                "can_edit_emr": True,
                "can_prescribe": True,
                "can_order_labs": True,
                "can_discharge": True,
                "can_approve_ai_drafts": True,
            },
        },
        {
            "name": "nurse",
            "display_name": "Nurse",
            "permissions": {
                "can_view_emr": True,
                "can_record_vitals": True,
                "can_administer_meds": True,
                "can_create_nurse_logs": True,
            },
        },
        {
            "name": "lab_tech",
            "display_name": "Lab Technician",
            "permissions": {
                "can_view_lab_requests": True,
                "can_upload_lab_results": True,
                "can_manage_lab_inventory": True,
            },
        },
        {
            "name": "pharmacist",
            "display_name": "Pharmacist",
            "permissions": {
                "can_view_prescriptions": True,
                "can_dispense_medications": True,
                "can_manage_pharmacy_inventory": True,
            },
        },
        {
            "name": "reception",
            "display_name": "Receptionist",
            "permissions": {
                "can_book_appointments": True,
                "can_checkin_patients": True,
                "can_search_patients": True,
            },
        },
        {
            "name": "patient",
            "display_name": "Patient",
            "permissions": {
                "can_view_own_emr": True,
                "can_view_own_lab_results": True,
                "can_request_appointments": True,
            },
        },
    ]

    roles = {}
    for role_data in roles_data:
        existing = db.query(Role).filter(Role.name == role_data["name"]).first()
        if existing:
            roles[role_data["name"]] = existing
            print(f"  ~ Exists role: {existing.display_name}")
            continue
        role = Role(**role_data)
        db.add(role)
        db.flush()
        roles[role_data["name"]] = role
        print(f"  ✓ Created role: {role.display_name}")

    return roles


def seed_regions_and_hospitals(db: Session):
    """Create demo regions and hospitals"""
    print("\nCreating regions and hospitals...")

    # Create North Region (idempotent)
    north_region = db.query(Region).filter(Region.code == "NORTH").first()
    if not north_region:
        north_region = Region(
            name="North Region",
            code="NORTH",
            theme_settings={
                "primary_color": "#1976d2",
                "secondary_color": "#dc004e",
                "logo_url": "https://example.com/north-logo.png",
            },
            is_active=True,
        )
        db.add(north_region)
        db.flush()
        print(f"  ✓ Created region: {north_region.name}")
    else:
        print(f"  ~ Exists region: {north_region.name}")

    # Create hospital in North Region (idempotent)
    north_hospital = db.query(Hospital).filter(Hospital.code == "NGH001").first()
    if not north_hospital:
        north_hospital = Hospital(
            region_id=north_region.id,
            name="North General Hospital",
            code="NGH001",
            address="123 Medical Center Dr, North City, NC 12345",
            phone="+1-555-0100",
            email="contact@northgeneral.example",
            bed_capacity=200,
            is_active=True,
        )
        db.add(north_hospital)
        db.flush()
        print(f"  ✓ Created hospital: {north_hospital.name}")
    else:
        print(f"  ~ Exists hospital: {north_hospital.name}")

    return {"north_region": north_region, "north_hospital": north_hospital}


def seed_users(db: Session, roles: dict, entities: dict):
    """Create demo users for all roles"""
    print("\nCreating demo users...")

    north_region = entities["north_region"]
    north_hospital = entities["north_hospital"]

    users_data = [
        {
            "email": "admin@hass.example",
            "password": "admin123",
            "first_name": "Super",
            "last_name": "Admin",
            "role": "super_admin",
            "region_id": None,
            "hospital_id": None,
        },
        {
            "email": "radmin@hass.example",
            "password": "radmin123",
            "first_name": "Regional",
            "last_name": "Administrator",
            "role": "regional_admin",
            "region_id": north_region.id,
            "hospital_id": None,
        },
        {
            "email": "manager@hass.example",
            "password": "manager123",
            "first_name": "Front",
            "last_name": "Desk",
            "role": "manager",
            "region_id": north_region.id,
            "hospital_id": north_hospital.id,
        },
        {
            "email": "doctor@hass.example",
            "password": "doctor123",
            "first_name": "Dr. Sarah",
            "last_name": "Johnson",
            "role": "doctor",
            "region_id": north_region.id,
            "hospital_id": north_hospital.id,
        },
        {
            "email": "nurse@hass.example",
            "password": "nurse123",
            "first_name": "Emily",
            "last_name": "Davis",
            "role": "nurse",
            "region_id": north_region.id,
            "hospital_id": north_hospital.id,
        },
        {
            "email": "lab@hass.example",
            "password": "lab123",
            "first_name": "Lab",
            "last_name": "Technician",
            "role": "lab_tech",
            "region_id": north_region.id,
            "hospital_id": north_hospital.id,
        },
        {
            "email": "pharma@hass.example",
            "password": "pharma123",
            "first_name": "Pharmacy",
            "last_name": "Staff",
            "role": "pharmacist",
            "region_id": north_region.id,
            "hospital_id": north_hospital.id,
        },
        {
            "email": "reception@hass.example",
            "password": "reception123",
            "first_name": "Reception",
            "last_name": "Desk",
            "role": "reception",
            "region_id": north_region.id,
            "hospital_id": north_hospital.id,
        },
        {
            "email": "patient@hass.example",
            "password": "patient123",
            "first_name": "John",
            "last_name": "Smith",
            "role": "patient",
            "region_id": None,
            "hospital_id": None,
        },
    ]

    users = {}
    for user_data in users_data:
        role_name = user_data.pop("role")
        password = user_data.pop("password")
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            users[role_name] = existing
            print(f"  ~ Exists user: {existing.email} ({roles[role_name].display_name})")
            continue

        user = User(
            **user_data,
            password_hash=hash_password(password),
            role_id=roles[role_name].id,
            is_active=True,
            is_deleted=False,
        )
        db.add(user)
        db.flush()
        users[role_name] = user
        print(f"  ✓ Created user: {user.email} ({roles[role_name].display_name})")

    return users


def seed_patients_and_visits(db: Session, entities: dict, users: dict):
    """Create demo patients and visits"""
    print("\nCreating demo patients and visits...")

    north_hospital = entities["north_hospital"]
    doctor = users["doctor"]

    # Create patient (link to patient user)
    patient_user = users["patient"]
    patient = db.query(Patient).filter(Patient.mrn == "MRN001234").first()
    if not patient:
        patient = Patient(
            user_id=patient_user.id,
            hospital_id=north_hospital.id,
            mrn="MRN001234",
            first_name="John",
            last_name="Smith",
            date_of_birth=date(1985, 5, 15),
            gender="male",
            blood_group="A+",
            phone="+1-555-0199",
            email="patient@hass.example",
            address="456 Patient St, North City, NC 12345",
            emergency_contact_name="Jane Smith",
            emergency_contact_phone="+1-555-0198",
            allergies="Penicillin",
            is_active=True,
        )
        db.add(patient)
        db.flush()
        print(f"  ✓ Created patient: {patient.first_name} {patient.last_name} (MRN: {patient.mrn})")
    else:
        print(f"  ~ Exists patient: {patient.first_name} {patient.last_name} (MRN: {patient.mrn})")

    # Create active visit
    visit = db.query(Visit).filter(Visit.patient_id == patient.id, Visit.status == "active").first()
    if not visit:
        visit = Visit(
            patient_id=patient.id,
            hospital_id=north_hospital.id,
            attending_doctor_id=doctor.id,
            visit_type="inpatient",
            admission_date=datetime.now() - timedelta(days=2),
            reason_for_visit="Routine checkup and monitoring",
            diagnosis="Hypertension",
            status="active",
            is_synced_to_global=False,
        )
        db.add(visit)
        db.flush()
        print(f"  ✓ Created visit: {visit.visit_type} (Status: {visit.status})")
    else:
        print(f"  ~ Exists visit: {visit.visit_type} (Status: {visit.status})")

    return {"patient": patient, "visit": visit}


def seed_beds(db: Session, entities: dict, patient_data: dict):
    """Create demo beds"""
    print("\nCreating demo beds...")

    north_hospital = entities["north_hospital"]
    patient = patient_data["patient"]
    visit = patient_data["visit"]

    # Create beds
    existing_bed1 = db.query(Bed).filter(Bed.bed_number == "101", Bed.hospital_id == north_hospital.id).first()
    if not existing_bed1:
        bed1 = Bed(
            hospital_id=north_hospital.id,
            bed_number="101",
            ward="General Ward",
            floor="1",
            bed_type="standard",
            status="occupied",
            assigned_patient_id=patient.id,
            assigned_visit_id=visit.id,
            assigned_at=datetime.now() - timedelta(days=2),
            is_active=True,
        )
        db.add(bed1)
        print(f"  ✓ Created bed: {bed1.bed_number} ({bed1.status})")
    else:
        print(f"  ~ Exists bed: {existing_bed1.bed_number} ({existing_bed1.status})")

    # Create available beds
    for i in range(102, 110):
        exists = db.query(Bed).filter(Bed.bed_number == str(i), Bed.hospital_id == north_hospital.id).first()
        if exists:
            continue
        bed = Bed(
            hospital_id=north_hospital.id,
            bed_number=str(i),
            ward="General Ward" if i < 105 else "ICU",
            floor="1" if i < 105 else "2",
            bed_type="standard" if i < 105 else "icu",
            status="available",
            is_active=True,
        )
        db.add(bed)

    db.flush()
    print(f"  ✓ Created 9 total beds")


def seed_vitals(db: Session, patient_data: dict, users: dict):
    """Create demo vital signs"""
    print("\nCreating demo vitals...")

    patient = patient_data["patient"]
    visit = patient_data["visit"]
    nurse = users["nurse"]

    # Only seed vitals if none exist for this visit
    any_vitals = db.query(Vitals).filter(Vitals.visit_id == visit.id).first()
    created = 0
    if not any_vitals:
        for i in range(6):
            vitals = Vitals(
                patient_id=patient.id,
                visit_id=visit.id,
                recorded_by_id=nurse.id,
                recorded_at=datetime.now() - timedelta(days=2) + timedelta(hours=i * 8),
                temperature=36.5 + (i * 0.1),
                heart_rate=72 + (i * 2),
                blood_pressure_systolic=120 + i,
                blood_pressure_diastolic=80,
                respiratory_rate=16,
                spo2=98,
                notes=f"Vitals check #{i+1}",
                is_abnormal=False,
            )
            db.add(vitals)
            created += 1
        db.flush()
        print(f"  ✓ Created {created} vitals records")
    else:
        print("  ~ Vitals already exist for visit")


def seed_lab_tests(db: Session, patient_data: dict, users: dict):
    """Create demo lab tests"""
    print("\nCreating demo lab tests...")

    patient = patient_data["patient"]
    visit = patient_data["visit"]
    doctor = users["doctor"]
    lab_tech = users.get("lab_tech")

    exists = db.query(LabTest).filter(LabTest.visit_id == visit.id, LabTest.test_type == "Complete Blood Count (CBC)").first()
    if not exists:
        lab_test = LabTest(
            patient_id=patient.id,
            visit_id=visit.id,
            requested_by_id=doctor.id,
            assigned_to_id=lab_tech.id if lab_tech else None,
            test_type="Complete Blood Count (CBC)",
            urgency="routine",
            status="pending",
            requested_at=datetime.now() - timedelta(days=1),
            notes="Routine blood work",
        )
        db.add(lab_test)
        db.flush()
        print(f"  ✓ Created lab test: {lab_test.test_type}")
    else:
        print(f"  ~ Exists lab test: {exists.test_type}")


def seed_prescriptions(db: Session, patient_data: dict, users: dict):
    """Create demo prescriptions"""
    print("\nCreating demo prescriptions...")

    patient = patient_data["patient"]
    visit = patient_data["visit"]
    doctor = users["doctor"]

    exists = db.query(Prescription).filter(Prescription.visit_id == visit.id, Prescription.medication_name == "Lisinopril").first()
    if not exists:
        prescription = Prescription(
            patient_id=patient.id,
            visit_id=visit.id,
            prescribed_by_id=doctor.id,
            medication_name="Lisinopril",
            dosage="10mg",
            frequency="once daily",
            route="oral",
            duration_days=30,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            instructions="Take in the morning with food",
            status="active",
        )
        db.add(prescription)
        db.flush()
        print(f"  ✓ Created prescription: {prescription.medication_name}")
    else:
        print(f"  ~ Exists prescription: {exists.medication_name}")


def seed_appointments(db: Session, patient_data: dict, users: dict, entities: dict):
    """Create demo appointments"""
    print("\nCreating demo appointments...")

    patient = patient_data["patient"]
    doctor = users["doctor"]
    north_hospital = entities["north_hospital"]
    reception = users["reception"]

    future_appt = db.query(Appointment).filter(
        Appointment.patient_id == patient.id,
        Appointment.status.in_(["scheduled", "confirmed"])
    ).first()
    if not future_appt:
        appointment = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            hospital_id=north_hospital.id,
            scheduled_at=datetime.now() + timedelta(days=7, hours=10),
            duration_minutes=30,
            appointment_type="follow-up",
            status="scheduled",
            reason="Follow-up checkup",
            created_by_id=reception.id,
        )
        db.add(appointment)
        db.flush()
        print(f"  ✓ Created appointment: {appointment.scheduled_at}")
    else:
        print(f"  ~ Exists appointment: {future_appt.scheduled_at}")


def seed_inventory(db: Session, entities: dict):
    """Create demo inventory items"""
    print("\nCreating demo inventory...")

    north_hospital = entities["north_hospital"]

    inventory_items = [
        {
            "item_type": "medication",
            "item_name": "Lisinopril 10mg",
            "item_code": "MED-LIS-10",
            "category": "Antihypertensive",
            "quantity": 500,
            "unit": "tablets",
            "threshold_alert": 100,
        },
        {
            "item_type": "supply",
            "item_name": "Surgical Gloves (Large)",
            "item_code": "SUP-GLV-L",
            "category": "PPE",
            "quantity": 50,
            "unit": "boxes",
            "threshold_alert": 20,
        },
        {
            "item_type": "reagent",
            "item_name": "CBC Test Reagent",
            "item_code": "REG-CBC-01",
            "category": "Lab Reagents",
            "quantity": 15,
            "unit": "kits",
            "threshold_alert": 5,
        },
    ]

    for item_data in inventory_items:
        exists = db.query(Inventory).filter(Inventory.item_code == item_data["item_code"], Inventory.hospital_id == north_hospital.id).first()
        if exists:
            print(f"  ~ Exists inventory item: {item_data['item_name']}")
            continue
        inventory = Inventory(
            hospital_id=north_hospital.id,
            **item_data,
            is_active=True,
        )
        db.add(inventory)
        print(f"  ✓ Created inventory item: {item_data['item_name']}")

    db.flush()


def main():
    """Main seed function"""
    print("=" * 60)
    print("Hospital Automation System - Database Seeding")
    print("=" * 60)

    db = SessionLocal()

    try:
        # Seed all data
        roles = seed_roles(db)
        entities = seed_regions_and_hospitals(db)
        users = seed_users(db, roles, entities)
        patient_data = seed_patients_and_visits(db, entities, users)
        seed_beds(db, entities, patient_data)
        seed_vitals(db, patient_data, users)
        seed_lab_tests(db, patient_data, users)
        seed_prescriptions(db, patient_data, users)
        seed_appointments(db, patient_data, users, entities)
        seed_inventory(db, entities)

        # Commit all changes
        db.commit()

        print("\n" + "=" * 60)
        print("✅ Database seeding completed successfully!")
        print("=" * 60)
        print("\nDemo Credentials:")
        print("  Super Admin:     admin@hass.example / admin123")
        print("  Regional Admin:  radmin@hass.example / radmin123")
        print("  Manager:         manager@hass.example / manager123")
        print("  Doctor:          doctor@hass.example / doctor123")
        print("  Nurse:           nurse@hass.example / nurse123")
        print("  Lab Tech:        lab@hass.example / lab123")
        print("  Pharmacist:      pharma@hass.example / pharma123")
        print("  Reception:       reception@hass.example / reception123")
        print("  Patient:         patient@hass.example / patient123")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
