"""
Quick Hospital Data Seeding
Creates essential test users and data for immediate testing
"""

import sys
import os
from datetime import datetime, timedelta
import uuid

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.auth import get_password_hash
from app.models import User, Patient, Hospital, Role, Region

def create_basic_test_data():
    """Create basic test users and hospital data"""
    print("🏥 Creating basic test hospital data...")

    db = SessionLocal()

    try:
        # Create basic hospital if not exists
        hospital = db.query(Hospital).filter(Hospital.name == "City General Hospital").first()
        if not hospital:
            hospital = Hospital(
                name="City General Hospital",
                code="CGH",
                address="123 Hospital Ave, San Francisco, CA",
                phone="555-0100",
                email="info@citygeneral.com",
                is_active=True
            )
            db.add(hospital)
            db.commit()
            print("✅ Created City General Hospital")
        else:
            print("ℹ️  Hospital already exists")

        # Create basic roles if they don't exist
        roles = [
            {"name": "super_admin", "description": "System Administrator"},
            {"name": "manager", "description": "Hospital Manager"},
            {"name": "doctor", "description": "Medical Doctor"},
            {"name": "nurse", "description": "Registered Nurse"},
            {"name": "pharmacist", "description": "Pharmacist"},
            {"name": "lab_technician", "description": "Lab Technician"},
            {"name": "reception", "description": "Reception Staff"},
        ]

        for role_data in roles:
            role = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not role:
                role = Role(
                    name=role_data["name"],
                    description=role_data["description"],
                    is_active=True
                )
                db.add(role)

        db.commit()
        print("✅ Created basic roles")

        # Get roles
        super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
        manager_role = db.query(Role).filter(Role.name == "manager").first()
        doctor_role = db.query(Role).filter(Role.name == "doctor").first()
        nurse_role = db.query(Role).filter(Role.name == "nurse").first()

        # Create test users
        test_users = [
            {
                "email": "admin@citygeneral.com",
                "password": "Admin123!",
                "first_name": "Sarah",
                "last_name": "Johnson",
                "role": super_admin_role,
                "title": "Hospital Director"
            },
            {
                "email": "manager@citygeneral.com",
                "password": "Manager123!",
                "first_name": "Michael",
                "last_name": "Chen",
                "role": manager_role,
                "title": "Operations Manager"
            },
            {
                "email": "doctor@citygeneral.com",
                "password": "Doctor123!",
                "first_name": "Emily",
                "last_name": "Rodriguez",
                "role": doctor_role,
                "title": "Emergency Medicine Physician"
            },
            {
                "email": "nurse@citygeneral.com",
                "password": "Nurse123!",
                "first_name": "Jennifer",
                "last_name": "Adams",
                "role": nurse_role,
                "title": "Head Nurse"
            }
        ]

        created_count = 0
        for user_data in test_users:
            # Check if user exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if existing_user:
                print(f"ℹ️  User {user_data['email']} already exists")
                continue

            user = User(
                email=user_data["email"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                password_hash=get_password_hash(user_data["password"]),
                role_id=user_data["role"].id,
                hospital_id=hospital.id,
                qualification=user_data["title"],
                is_active=True,
                phone=f"555-01{str(created_count+1).zfill(3)}"
            )

            db.add(user)
            created_count += 1
            print(f"✅ Created {user_data['title']}: {user_data['email']}")

        db.commit()

        # Create some test patients
        test_patients = [
            {
                "first_name": "John",
                "last_name": "Smith",
                "email": "john.smith@email.com",
                "phone": "555-0101",
                "date_of_birth": "1975-03-15",
                "gender": "Male",
                "blood_group": "O+",
                "address": "123 Main St, San Francisco, CA 94102"
            },
            {
                "first_name": "Maria",
                "last_name": "Garcia",
                "email": "maria.garcia@email.com",
                "phone": "555-0102",
                "date_of_birth": "1982-07-22",
                "gender": "Female",
                "blood_group": "A+",
                "address": "456 Oak Ave, San Francisco, CA 94103"
            },
            {
                "first_name": "Robert",
                "last_name": "Johnson",
                "email": "robert.johnson@email.com",
                "phone": "555-0103",
                "date_of_birth": "1990-11-08",
                "gender": "Male",
                "blood_group": "B-",
                "address": "789 Pine St, San Francisco, CA 94104"
            }
        ]

        patient_count = 0
        for patient_data in test_patients:
            # Check if patient exists
            existing_patient = db.query(Patient).filter(Patient.email == patient_data["email"]).first()
            if existing_patient:
                print(f"ℹ️  Patient {patient_data['email']} already exists")
                continue

            patient = Patient(
                first_name=patient_data["first_name"],
                last_name=patient_data["last_name"],
                email=patient_data["email"],
                phone=patient_data["phone"],
                date_of_birth=datetime.strptime(patient_data["date_of_birth"], "%Y-%m-%d").date(),
                gender=patient_data["gender"],
                blood_group=patient_data["blood_group"],
                address=patient_data["address"],
                emergency_contact_name="Emergency Contact",
                emergency_contact_phone="555-0000",
                is_active=True,
                hospital_id=hospital.id
            )

            db.add(patient)
            patient_count += 1
            print(f"✅ Created Patient: {patient.first_name} {patient.last_name}")

        db.commit()

        print("\n" + "="*50)
        print("✅ Basic hospital data seeding completed!")
        print("="*50)

        print(f"\n📊 Created:")
        print(f"   • Users: {created_count}")
        print(f"   • Patients: {patient_count}")
        print(f"   • Hospital: City General Hospital")
        print(f"   • Roles: 7 basic roles")

        print("\n🔑 Test Login Credentials:")
        print("   • Super Admin: admin@citygeneral.com / Admin123!")
        print("   • Manager:     manager@citygeneral.com / Manager123!")
        print("   • Doctor:      doctor@citygeneral.com / Doctor123!")
        print("   • Nurse:       nurse@citygeneral.com / Nurse123!")

        print("\n🌐 Access URLs:")
        print("   • Frontend: http://localhost:3000")
        print("   • API:      http://localhost:8000")
        print("   • API Docs: http://localhost:8000/api/docs")

    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_basic_test_data()