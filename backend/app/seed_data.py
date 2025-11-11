"""
Hospital Automation System - Comprehensive Data Seeding
Creates realistic test hospital with complete data for all user roles and workflows
"""

import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
import random

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.core.auth import get_password_hash
from app.models import (
    User, Patient, Department, Bed, Appointment, Prescription,
    MedicalRecord, LabResult, StaffSchedule, Inventory, Ward
)

# Hospital configuration
HOSPITAL_NAME = "City General Hospital"
HOSPITAL_LOCATION = "San Francisco, CA"

# Realistic test data
DEPARTMENTS = [
    {"name": "Emergency", "description": "Emergency medicine and urgent care", "capacity": 20},
    {"name": "ICU", "description": "Intensive Care Unit", "capacity": 15},
    {"name": "Surgery", "description": "Surgical operations and recovery", "capacity": 12},
    {"name": "Pediatrics", "description": "Children's medical care", "capacity": 18},
    {"name": "Cardiology", "description": "Heart and cardiovascular care", "capacity": 10},
    {"name": "Laboratory", "description": "Diagnostic testing and analysis", "capacity": 8},
    {"name": "Pharmacy", "description": "Medication dispensing and consultation", "capacity": 6},
]

USERS_BY_ROLE = {
    "super_admin": [
        {"email": "admin@citygeneral.com", "password": "Admin123!", "name": "Dr. Sarah Johnson", "title": "Hospital Director"}
    ],
    "manager": [
        {"email": "manager@citygeneral.com", "password": "Manager123!", "name": "Michael Chen", "title": "Operations Manager"}
    ],
    "doctor": [
        {"email": "erodriguez@citygeneral.com", "password": "Doctor123!", "name": "Dr. Emily Rodriguez", "title": "Emergency Medicine Physician"},
        {"email": "jwilson@citygeneral.com", "password": "Doctor123!", "name": "Dr. James Wilson", "title": "Cardiologist"},
        {"email": "ppatel@citygeneral.com", "password": "Doctor123!", "name": "Dr. Priya Patel", "title": "Pediatrician"},
        {"email": "rkim@citygeneral.com", "password": "Doctor123!", "name": "Dr. Robert Kim", "title": "General Surgeon"},
        {"email": "mgarcia@citygeneral.com", "password": "Doctor123!", "name": "Dr. Maria Garcia", "title": "Internal Medicine Physician"},
    ],
    "nurse": [
        {"email": "jadams@citygeneral.com", "password": "Nurse123!", "name": "Jennifer Adams", "title": "Head Nurse"},
        {"email": "sbrown@citygeneral.com", "password": "Nurse123!", "name": "Susan Brown", "title": "Emergency Nurse"},
        {"email": "tdavis@citygeneral.com", "password": "Nurse123!", "name": "Thomas Davis", "title": "Emergency Nurse"},
        {"email": "lmiller@citygeneral.com", "password": "Nurse123!", "name": "Laura Miller", "title": "Emergency Nurse"},
        {"email": "jwilson@citygeneral.com", "password": "Nurse123!", "name": "John Wilson", "title": "ICU Nurse"},
        {"email": "srodriguez@citygeneral.com", "password": "Nurse123!", "name": "Sofia Rodriguez", "title": "ICU Nurse"},
        {"email": "mtaylor@citygeneral.com", "password": "Nurse123!", "name": "Michael Taylor", "title": "Floor Nurse"},
        {"email": "aanderson@citygeneral.com", "password": "Nurse123!", "name": "Amanda Anderson", "title": "Floor Nurse"},
    ],
    "pharmacist": [
        {"email": "dthompson@citygeneral.com", "password": "Pharm123!", "name": "David Thompson", "title": "Head Pharmacist"},
        {"email": "klee@citygeneral.com", "password": "Pharm123!", "name": "Kevin Lee", "title": "Staff Pharmacist"},
        {"email": "mwhite@citygeneral.com", "password": "Pharm123!", "name": "Michelle White", "title": "Staff Pharmacist"},
    ],
    "lab_technician": [
        {"email": "landerson@citygeneral.com", "password": "Lab123!", "name": "Lisa Anderson", "title": "Head Lab Technician"},
        {"email": "rjones@citygeneral.com", "password": "Lab123!", "name": "Robert Jones", "title": "Lab Specialist"},
        {"email": "jmartinez@citygeneral.com", "password": "Lab123!", "name": "Jessica Martinez", "title": "Lab Specialist"},
        {"email": "sgarcia@citygeneral.com", "password": "Lab123!", "name": "Samuel Garcia", "title": "Lab Specialist"},
    ],
    "reception": [
        {"email": "awhite@citygeneral.com", "password": "Reception123!", "name": "Amanda White", "title": "Head Receptionist"},
        {"email": "bstewart@citygeneral.com", "password": "Reception123!", "name": "Brian Stewart", "title": "Reception Staff"},
        {"email": "kjohnson@citygeneral.com", "password": "Reception123!", "name": "Karen Johnson", "title": "Reception Staff"},
    ],
}

# Sample patient data
PATIENTS = [
    {
        "first_name": "John", "last_name": "Smith", "email": "john.smith@email.com", "phone": "555-0101",
        "date_of_birth": "1975-03-15", "blood_type": "O+", "gender": "Male",
        "address": "123 Main St, San Francisco, CA 94102", "insurance_id": "INS001234567"
    },
    {
        "first_name": "Maria", "last_name": "Garcia", "email": "maria.garcia@email.com", "phone": "555-0102",
        "date_of_birth": "1982-07-22", "blood_type": "A+", "gender": "Female",
        "address": "456 Oak Ave, San Francisco, CA 94103", "insurance_id": "INS001234568"
    },
    {
        "first_name": "Robert", "last_name": "Johnson", "email": "robert.johnson@email.com", "phone": "555-0103",
        "date_of_birth": "1990-11-08", "blood_type": "B-", "gender": "Male",
        "address": "789 Pine St, San Francisco, CA 94104", "insurance_id": "INS001234569"
    },
    {
        "first_name": "Jennifer", "last_name": "Davis", "email": "jennifer.davis@email.com", "phone": "555-0104",
        "date_of_birth": "1985-02-14", "blood_type": "AB+", "gender": "Female",
        "address": "321 Elm Dr, San Francisco, CA 94105", "insurance_id": "INS001234570"
    },
    {
        "first_name": "Michael", "last_name": "Wilson", "email": "michael.wilson@email.com", "phone": "555-0105",
        "date_of_birth": "1978-09-30", "blood_type": "O-", "gender": "Male",
        "address": "654 Maple Ln, San Francisco, CA 94106", "insurance_id": "INS001234571"
    },
]

# Medical conditions and treatments
MEDICAL_CONDITIONS = [
    "Hypertension", "Type 2 Diabetes", "Asthma", "Coronary Artery Disease",
    "COPD", "Pneumonia", "Fracture", "Migraine", "Arthritis", "Gastroenteritis"
]

MEDICATIONS = [
    {"name": "Lisinopril", "dosage": "10mg", "frequency": "Once daily"},
    {"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily"},
    {"name": "Albuterol", "dosage": "90mcg", "frequency": "As needed"},
    {"name": "Aspirin", "dosage": "81mg", "frequency": "Once daily"},
    {"name": "Ibuprofen", "dosage": "400mg", "frequency": "Every 6-8 hours as needed"},
]

class HospitalDataSeeder:
    def __init__(self):
        self.db: Session = SessionLocal()
        self.created_users = []
        self.created_patients = []
        self.created_departments = []

    def clear_existing_data(self):
        """Clear existing data for fresh seeding"""
        print("🗑️  Clearing existing test data...")
        try:
            # Clear in order of dependencies
            self.db.query(Prescription).delete()
            self.db.query(MedicalRecord).delete()
            self.db.query(LabResult).delete()
            self.db.query(StaffSchedule).delete()
            self.db.query(Appointment).delete()
            self.db.query(Inventory).delete()
            self.db.query(Bed).delete()
            self.db.query(Patient).delete()
            self.db.query(User).delete()
            self.db.query(Department).delete()
            self.db.query(Ward).delete()
            self.db.commit()
            print("✅ Existing data cleared")
        except Exception as e:
            print(f"⚠️  Error clearing data: {e}")
            self.db.rollback()

    def create_departments(self):
        """Create hospital departments"""
        print("🏥 Creating hospital departments...")
        for dept_data in DEPARTMENTS:
            department = Department(
                name=dept_data["name"],
                description=dept_data["description"],
                capacity=dept_data["capacity"],
                location=f"{dept_data['name']} Wing"
            )
            self.db.add(department)
            self.created_departments.append(department)

        self.db.commit()
        print(f"✅ Created {len(self.created_departments)} departments")

    def create_users(self):
        """Create users for all roles"""
        print("👥 Creating hospital staff...")
        role_counts = {}

        for role, users in USERS_BY_ROLE.items():
            role_counts[role] = 0
            for user_data in users:
                # Check if user already exists
                existing_user = self.db.query(User).filter(User.email == user_data["email"]).first()
                if existing_user:
                    print(f"ℹ️  User {user_data['email']} already exists")
                    self.created_users.append(existing_user)
                    role_counts[role] += 1
                    continue

                user = User(
                    email=user_data["email"],
                    full_name=user_data["name"],
                    role=role,
                    hashed_password=get_password_hash(user_data["password"]),
                    is_active=True,
                    is_verified=True,
                    phone_number=self._generate_phone_number()
                )

                self.db.add(user)
                self.created_users.append(user)
                role_counts[role] += 1
                print(f"✅ Created {role.title()}: {user_data['name']} ({user_data['email']})")

        self.db.commit()

        print("\n📊 User Creation Summary:")
        for role, count in role_counts.items():
            print(f"   • {role.title()}: {count} users")

    def create_patients(self):
        """Create patients with realistic data"""
        print("👨‍⚕️ Creating patients...")

        for patient_data in PATIENTS:
            # Check if patient already exists
            existing_patient = self.db.query(Patient).filter(Patient.email == patient_data["email"]).first()
            if existing_patient:
                print(f"ℹ️  Patient {patient_data['email']} already exists")
                self.created_patients.append(existing_patient)
                continue

            patient = Patient(
                first_name=patient_data["first_name"],
                last_name=patient_data["last_name"],
                email=patient_data["email"],
                phone_number=patient_data["phone"],
                date_of_birth=datetime.strptime(patient_data["date_of_birth"], "%Y-%m-%d").date(),
                blood_type=patient_data["blood_type"],
                gender=patient_data["gender"],
                address=patient_data["address"],
                insurance_id=patient_data["insurance_id"],
                emergency_contact_name=self._generate_emergency_contact_name(),
                emergency_contact_phone=self._generate_phone_number(),
                is_active=True
            )

            self.db.add(patient)
            self.created_patients.append(patient)
            print(f"✅ Created Patient: {patient.first_name} {patient.last_name}")

        self.db.commit()
        print(f"✅ Created {len(self.created_patients)} patients")

    def create_beds(self):
        """Create beds for departments"""
        print("🛏️  Creating hospital beds...")

        bed_count = 0
        for department in self.created_departments:
            for i in range(department.capacity):
                bed = Bed(
                    bed_number=f"{department.name[0]}{i+1:03d}",
                    department_id=department.id,
                    is_occupied=random.choice([True, False]) if bed_count > 5 else False,
                    bed_type=random.choice(["Standard", "ICU", "Emergency", "Pediatric"])
                )
                self.db.add(bed)
                bed_count += 1

        self.db.commit()
        print(f"✅ Created {bed_count} beds")

    def create_appointments(self):
        """Create sample appointments"""
        print("📅 Creating appointments...")

        doctors = [u for u in self.created_users if u.role == "doctor"]
        patients = self.created_patients[:10]  # Use first 10 patients

        appointment_count = 0
        for i in range(20):  # Create 20 appointments
            if not doctors or not patients:
                break

            doctor = random.choice(doctors)
            patient = random.choice(patients)

            # Random appointment time within next 30 days
            appointment_time = datetime.now() + timedelta(
                days=random.randint(1, 30),
                hours=random.randint(8, 17),
                minutes=random.choice([0, 15, 30, 45])
            )

            appointment = Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                appointment_time=appointment_time,
                reason=random.choice(MEDICAL_CONDITIONS),
                status=random.choice(["scheduled", "completed", "cancelled"]),
                notes="Regular checkup and consultation"
            )

            self.db.add(appointment)
            appointment_count += 1

        self.db.commit()
        print(f"✅ Created {appointment_count} appointments")

    def create_medical_records(self):
        """Create medical records for patients"""
        print("📋 Creating medical records...")

        doctors = [u for u in self.created_users if u.role == "doctor"]
        patients = self.created_patients[:5]  # Use first 5 patients

        record_count = 0
        for patient in patients:
            if not doctors:
                break

            # Create 1-3 records per patient
            for i in range(random.randint(1, 3)):
                doctor = random.choice(doctors)

                record = MedicalRecord(
                    patient_id=patient.id,
                    doctor_id=doctor.id,
                    diagnosis=random.choice(MEDICAL_CONDITIONS),
                    treatment=f"Treatment plan includes {random.choice(MEDICATIONS)['name']} and follow-up in 2 weeks",
                    notes="Patient responded well to treatment",
                    created_at=datetime.now() - timedelta(days=random.randint(1, 30))
                )

                self.db.add(record)
                record_count += 1

        self.db.commit()
        print(f"✅ Created {record_count} medical records")

    def create_prescriptions(self):
        """Create prescriptions"""
        print("💊 Creating prescriptions...")

        doctors = [u for u in self.created_users if u.role == "doctor"]
        patients = self.created_patients[:8]  # Use first 8 patients

        prescription_count = 0
        for patient in patients:
            if not doctors:
                break

            doctor = random.choice(doctors)
            medication = random.choice(MEDICATIONS)

            prescription = Prescription(
                patient_id=patient.id,
                doctor_id=doctor.id,
                medication_name=medication["name"],
                dosage=medication["dosage"],
                frequency=medication["frequency"],
                duration="30 days",
                instructions="Take as prescribed with food",
                status="active",
                created_at=datetime.now() - timedelta(days=random.randint(1, 15))
            )

            self.db.add(prescription)
            prescription_count += 1

        self.db.commit()
        print(f"✅ Created {prescription_count} prescriptions")

    def create_lab_results(self):
        """Create lab results"""
        print("🔬 Creating lab results...")

        lab_techs = [u for u in self.created_users if u.role == "lab_technician"]
        patients = self.created_patients[:6]  # Use first 6 patients

        result_count = 0
        test_types = ["CBC", "CMP", "Lipid Panel", "HbA1c", "COVID-19", "Influenza", "Urinalysis"]

        for patient in patients:
            if not lab_techs:
                break

            tech = random.choice(lab_techs)

            result = LabResult(
                patient_id=patient.id,
                test_type=random.choice(test_types),
                result_value=f"{random.randint(80, 120)} mg/dL",
                reference_range="70-100 mg/dL",
                status=random.choice(["normal", "abnormal", "critical"]),
                technician_id=tech.id,
                created_at=datetime.now() - timedelta(days=random.randint(1, 10))
            )

            self.db.add(result)
            result_count += 1

        self.db.commit()
        print(f"✅ Created {result_count} lab results")

    def _generate_phone_number(self) -> str:
        """Generate realistic phone number"""
        return f"555-{random.randint(100, 999)}-{random.randint(1000, 9999)}"

    def _generate_emergency_contact_name(self) -> str:
        """Generate emergency contact name"""
        first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia"]
        return f"{random.choice(first_names)} {random.choice(last_names)}"

    def seed_all_data(self):
        """Execute complete data seeding"""
        print("🏥 Starting Hospital Data Seeding...")
        print("=" * 60)

        try:
            self.clear_existing_data()
            self.create_departments()
            self.create_users()
            self.create_patients()
            self.create_beds()
            self.create_appointments()
            self.create_medical_records()
            self.create_prescriptions()
            self.create_lab_results()

            print("\n" + "=" * 60)
            print("✅ Hospital data seeding completed successfully!")
            print("=" * 60)

            self._print_summary()

        except Exception as e:
            print(f"\n❌ Error during seeding: {e}")
            self.db.rollback()
            raise
        finally:
            self.db.close()

    def _print_summary(self):
        """Print summary of created data"""
        print("\n📊 Seeding Summary:")
        print(f"   • Departments: {len(self.created_departments)}")
        print(f"   • Users: {len(self.created_users)}")
        print(f"   • Patients: {len(self.created_patients)}")

        print("\n🔑 Test Credentials:")
        for role, users in USERS_BY_ROLE.items():
            for user in users[:1]:  # Show first user of each role
                print(f"   • {role.title()}: {user['email']} / {user['password']}")

def main():
    """Main seeding function"""
    seeder = HospitalDataSeeder()

    # Check if we want to clear existing data
    if len(sys.argv) > 1 and sys.argv[1] == "--clear":
        seeder.clear_existing_data()
        return

    seeder.seed_all_data()

if __name__ == "__main__":
    main()