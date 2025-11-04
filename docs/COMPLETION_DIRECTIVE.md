# 🚀 COMPLETION DIRECTIVE: Hospital Automation System
## Enterprise-Grade Implementation Completion Guide

**Repository:** `/workspace/cmh2z1g40002cq2i3l9kktmdp/hass`
**Current Status:** 85% Complete (Phases 1-10 Done)
**Remaining:** Core automation, real-time features, production hardening
**Target:** Full enterprise-grade hospital automation system

---

## 🎯 MISSION STATEMENT

You are a Senior Full-Stack AI Engineer completing a **production-ready Hospital Automation System**. The system has:
- ✅ All 10 role-based dashboards (functional, connected to real APIs)
- ✅ Complete database schema with 18+ tables
- ✅ 11 API route modules with JWT + RBAC
- ✅ Modern SaaS UI (Style B: glass morphism, Framer Motion animations)
- ✅ Advanced features (profile pictures, regional branding, patient registration)

**Your task:** Implement the **remaining critical features** from the gap analysis to make this system **fully production-ready** with working automation, real-time alerts, and enterprise polish.

---

## ⚠️ CRITICAL RULES

1. **NO PLACEHOLDERS** - Every feature must be fully functional
2. **NO BREAKING CHANGES** - Existing working code is sacred
3. **FOLLOW EXISTING PATTERNS** - Match the codebase style exactly
4. **TEST AS YOU GO** - Verify each feature works before moving on
5. **COMMIT LOGICALLY** - One feature per commit with clear messages
6. **DOCUMENT EVERYTHING** - Update docs for new features

---

## 📊 PRIORITY IMPLEMENTATION PHASES

### Phase A: CRITICAL AUTOMATION (Days 1-5) ⚡

**Goal:** Complete core workflows so discharge, reminders, and lab coordination work end-to-end.

---

#### A1. EMR Auto-Sync System (Day 1-2)

**Files to Create/Modify:**

```
backend/app/tasks/autosync.py          # NEW - Celery task
backend/app/services/emr_sync_service.py  # NEW - Merge logic
backend/app/services/pdf_service.py    # NEW - PDF generation
backend/app/api/routes/visits.py       # MODIFY - Wire discharge
```

**Implementation:**

**File: `backend/app/tasks/autosync.py`**

```python
"""
Automatic EMR synchronization on patient discharge
"""
from celery import shared_task
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.emr_sync_service import EMRSyncService
from app.services.pdf_service import PDFService
from app.services.notification_service import NotificationService
from app.services.audit_service import AuditService
from app.models.visit import Visit
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def autosync_discharge(self, visit_id: str, approved_by_user_id: str):
    """
    Triggered on discharge approval
    - Merges Local EMR → Global EMR (idempotent)
    - Generates discharge PDF case-sheet
    - Uploads to S3
    - Notifies admins
    - Creates audit log
    """
    db: Session = SessionLocal()

    try:
        logger.info(f"Starting auto-sync for visit {visit_id}")

        # Get visit and validate
        visit = db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            logger.error(f"Visit {visit_id} not found")
            return {"status": "error", "message": "Visit not found"}

        if visit.status != "discharged":
            logger.warning(f"Visit {visit_id} not discharged, skipping sync")
            return {"status": "skipped", "message": "Visit not discharged"}

        # Prevent duplicate syncs
        if visit.is_synced_to_global:
            logger.info(f"Visit {visit_id} already synced, skipping")
            return {"status": "skipped", "message": "Already synced"}

        # 1. Sync Local → Global EMR
        sync_service = EMRSyncService(db)
        sync_result = sync_service.sync_visit_to_global(visit_id)

        # 2. Generate PDF case-sheet
        pdf_service = PDFService(db)
        pdf_url = pdf_service.generate_discharge_pdf(visit_id)

        # 3. Update visit record
        visit.is_synced_to_global = True
        visit.discharge_summary_pdf_url = pdf_url
        db.commit()

        # 4. Send notifications
        notification_service = NotificationService(db)

        # Notify super admin and regional admin
        notification_service.notify_discharge_complete(
            visit_id=visit_id,
            patient_name=f"{visit.patient.first_name} {visit.patient.last_name}",
            hospital_name=visit.hospital.name
        )

        # 5. Create audit log
        audit_service = AuditService(db)
        audit_service.log_action(
            user_id=approved_by_user_id,
            action="EMR_SYNC",
            resource_type="visit",
            resource_id=visit_id,
            after_state={
                "synced": True,
                "pdf_url": pdf_url,
                "global_emr_records": sync_result.get("records_created", 0)
            }
        )

        logger.info(f"Auto-sync completed for visit {visit_id}")

        return {
            "status": "success",
            "visit_id": visit_id,
            "pdf_url": pdf_url,
            "records_synced": sync_result.get("records_created", 0)
        }

    except Exception as e:
        logger.error(f"Auto-sync failed for visit {visit_id}: {str(e)}")
        db.rollback()
        # Retry task
        raise self.retry(exc=e)

    finally:
        db.close()
```

**File: `backend/app/services/emr_sync_service.py`**

```python
"""
EMR synchronization service - Local → Global
"""
from sqlalchemy.orm import Session
from app.models.visit import Visit
from app.models.emr_local import EMRLocal
from app.models.emr_global import EMRGlobal
from app.models.vitals import Vitals
from app.models.lab_test import LabTest
from app.models.prescription import Prescription
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EMRSyncService:
    def __init__(self, db: Session):
        self.db = db

    def sync_visit_to_global(self, visit_id: str) -> dict:
        """
        Merge Local EMR data to Global EMR
        - Deduplicates records
        - Preserves history
        - Returns summary
        """
        visit = self.db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            raise ValueError(f"Visit {visit_id} not found")

        patient = visit.patient
        records_created = 0

        # 1. Sync visit summary
        visit_summary = self._create_global_visit_record(visit)
        records_created += 1

        # 2. Sync significant vitals (latest or abnormal)
        significant_vitals = (
            self.db.query(Vitals)
            .filter(Vitals.visit_id == visit_id)
            .filter((Vitals.is_abnormal == True) | (Vitals.id.in_(
                self.db.query(Vitals.id)
                .filter(Vitals.visit_id == visit_id)
                .order_by(Vitals.recorded_at.desc())
                .limit(5)
            )))
            .all()
        )

        for vital in significant_vitals:
            self._create_global_vitals_record(patient.id, vital)
            records_created += 1

        # 3. Sync lab tests with results
        lab_tests = (
            self.db.query(LabTest)
            .filter(LabTest.visit_id == visit_id)
            .filter(LabTest.status == "completed")
            .all()
        )

        for test in lab_tests:
            self._create_global_lab_record(patient.id, test)
            records_created += 1

        # 4. Sync prescriptions
        prescriptions = (
            self.db.query(Prescription)
            .filter(Prescription.visit_id == visit_id)
            .all()
        )

        for prescription in prescriptions:
            self._create_global_prescription_record(patient.id, prescription)
            records_created += 1

        self.db.commit()

        logger.info(f"Synced {records_created} records to Global EMR for visit {visit_id}")

        return {
            "records_created": records_created,
            "patient_id": patient.id,
            "visit_id": visit_id
        }

    def _create_global_visit_record(self, visit: Visit):
        """Create global EMR record for visit summary"""
        # Check for duplicate
        existing = (
            self.db.query(EMRGlobal)
            .filter(EMRGlobal.patient_id == visit.patient_id)
            .filter(EMRGlobal.visit_id == visit.id)
            .filter(EMRGlobal.record_type == "visit_summary")
            .first()
        )

        if existing:
            logger.info(f"Visit summary already synced for visit {visit.id}")
            return existing

        record = EMRGlobal(
            patient_id=visit.patient_id,
            visit_id=visit.id,
            source_hospital_id=visit.hospital_id,
            record_type="visit_summary",
            data={
                "admission_date": visit.admission_date.isoformat(),
                "discharge_date": visit.discharge_date.isoformat() if visit.discharge_date else None,
                "visit_type": visit.visit_type,
                "reason_for_visit": visit.reason_for_visit,
                "diagnosis": visit.diagnosis,
                "discharge_summary": visit.discharge_summary,
                "attending_doctor": f"{visit.attending_doctor.first_name} {visit.attending_doctor.last_name}" if visit.attending_doctor else None
            },
            synced_at=datetime.utcnow()
        )

        self.db.add(record)
        return record

    def _create_global_vitals_record(self, patient_id: str, vital: Vitals):
        """Create global EMR record for vitals"""
        # Deduplicate by recording timestamp
        existing = (
            self.db.query(EMRGlobal)
            .filter(EMRGlobal.patient_id == patient_id)
            .filter(EMRGlobal.record_type == "vitals")
            .filter(EMRGlobal.data["recorded_at"].astext == vital.recorded_at.isoformat())
            .first()
        )

        if existing:
            return existing

        record = EMRGlobal(
            patient_id=patient_id,
            visit_id=vital.visit_id,
            source_hospital_id=vital.visit.hospital_id,
            record_type="vitals",
            data={
                "recorded_at": vital.recorded_at.isoformat(),
                "temperature": float(vital.temperature) if vital.temperature else None,
                "heart_rate": vital.heart_rate,
                "blood_pressure_systolic": vital.blood_pressure_systolic,
                "blood_pressure_diastolic": vital.blood_pressure_diastolic,
                "respiratory_rate": vital.respiratory_rate,
                "spo2": vital.spo2,
                "is_abnormal": vital.is_abnormal
            },
            synced_at=datetime.utcnow()
        )

        self.db.add(record)
        return record

    def _create_global_lab_record(self, patient_id: str, test: LabTest):
        """Create global EMR record for lab test"""
        existing = (
            self.db.query(EMRGlobal)
            .filter(EMRGlobal.patient_id == patient_id)
            .filter(EMRGlobal.record_type == "lab_test")
            .filter(EMRGlobal.data["test_id"].astext == str(test.id))
            .first()
        )

        if existing:
            return existing

        record = EMRGlobal(
            patient_id=patient_id,
            visit_id=test.visit_id,
            source_hospital_id=test.visit.hospital_id,
            record_type="lab_test",
            data={
                "test_id": str(test.id),
                "test_type": test.test_type,
                "requested_at": test.requested_at.isoformat(),
                "completed_at": test.completed_at.isoformat() if test.completed_at else None,
                "result_file_url": test.result_file_url,
                "result_summary": test.result_summary
            },
            synced_at=datetime.utcnow()
        )

        self.db.add(record)
        return record

    def _create_global_prescription_record(self, patient_id: str, prescription: Prescription):
        """Create global EMR record for prescription"""
        existing = (
            self.db.query(EMRGlobal)
            .filter(EMRGlobal.patient_id == patient_id)
            .filter(EMRGlobal.record_type == "prescription")
            .filter(EMRGlobal.data["prescription_id"].astext == str(prescription.id))
            .first()
        )

        if existing:
            return existing

        record = EMRGlobal(
            patient_id=patient_id,
            visit_id=prescription.visit_id,
            source_hospital_id=prescription.visit.hospital_id,
            record_type="prescription",
            data={
                "prescription_id": str(prescription.id),
                "medication_name": prescription.medication_name,
                "dosage": prescription.dosage,
                "frequency": prescription.frequency,
                "route": prescription.route,
                "start_date": prescription.start_date.isoformat(),
                "end_date": prescription.end_date.isoformat() if prescription.end_date else None,
                "prescribed_by": f"{prescription.prescribed_by.first_name} {prescription.prescribed_by.last_name}"
            },
            synced_at=datetime.utcnow()
        )

        self.db.add(record)
        return record
```

**File: `backend/app/services/pdf_service.py`**

```python
"""
PDF generation service for discharge case-sheets
"""
from sqlalchemy.orm import Session
from app.models.visit import Visit
from app.services.file_storage_service import FileStorageService
from weasyprint import HTML, CSS
from jinja2 import Template
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PDFService:
    def __init__(self, db: Session):
        self.db = db
        self.storage = FileStorageService()

    def generate_discharge_pdf(self, visit_id: str) -> str:
        """
        Generate discharge case-sheet PDF
        Returns S3 URL
        """
        visit = self.db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            raise ValueError(f"Visit {visit_id} not found")

        # Gather all data
        patient = visit.patient
        hospital = visit.hospital
        region = hospital.region

        # Get vitals, labs, prescriptions
        vitals = visit.vitals
        lab_tests = [test for test in visit.lab_tests if test.status == "completed"]
        prescriptions = visit.prescriptions
        nurse_logs = visit.nurse_logs[:10]  # Latest 10

        # Render HTML from template
        html_content = self._render_template({
            "patient": patient,
            "visit": visit,
            "hospital": hospital,
            "region": region,
            "vitals": vitals[-5:],  # Latest 5
            "lab_tests": lab_tests,
            "prescriptions": prescriptions,
            "nurse_logs": nurse_logs,
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        })

        # Generate PDF
        pdf_bytes = HTML(string=html_content).write_pdf(
            stylesheets=[CSS(string=self._get_pdf_styles())]
        )

        # Upload to S3
        file_path = f"{region.code}/{hospital.code}/patients/{patient.id}/visits/{visit.id}/discharge-summary.pdf"
        pdf_url = self.storage.upload_pdf(file_path, pdf_bytes)

        logger.info(f"Generated discharge PDF for visit {visit_id}: {pdf_url}")

        return pdf_url

    def _render_template(self, context: dict) -> str:
        """Render HTML template with context"""
        template_str = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Discharge Summary</title>
        </head>
        <body>
            <div class="header">
                <h1>{{ hospital.name }}</h1>
                <p>{{ hospital.address }}</p>
                <p>Phone: {{ hospital.phone }}</p>
            </div>

            <div class="title">
                <h2>DISCHARGE SUMMARY</h2>
            </div>

            <div class="patient-info">
                <h3>Patient Information</h3>
                <table>
                    <tr><td><strong>Name:</strong></td><td>{{ patient.first_name }} {{ patient.last_name }}</td></tr>
                    <tr><td><strong>MRN:</strong></td><td>{{ patient.mrn }}</td></tr>
                    <tr><td><strong>Date of Birth:</strong></td><td>{{ patient.date_of_birth }}</td></tr>
                    <tr><td><strong>Gender:</strong></td><td>{{ patient.gender }}</td></tr>
                    <tr><td><strong>Blood Group:</strong></td><td>{{ patient.blood_group or 'N/A' }}</td></tr>
                    {% if patient.allergies %}
                    <tr><td><strong>Allergies:</strong></td><td style="color: red; font-weight: bold;">{{ patient.allergies }}</td></tr>
                    {% endif %}
                </table>
            </div>

            <div class="visit-info">
                <h3>Visit Details</h3>
                <table>
                    <tr><td><strong>Admission Date:</strong></td><td>{{ visit.admission_date.strftime('%Y-%m-%d %H:%M') }}</td></tr>
                    <tr><td><strong>Discharge Date:</strong></td><td>{{ visit.discharge_date.strftime('%Y-%m-%d %H:%M') if visit.discharge_date else 'N/A' }}</td></tr>
                    <tr><td><strong>Visit Type:</strong></td><td>{{ visit.visit_type }}</td></tr>
                    <tr><td><strong>Attending Doctor:</strong></td><td>{{ visit.attending_doctor.first_name }} {{ visit.attending_doctor.last_name if visit.attending_doctor else 'N/A' }}</td></tr>
                </table>
            </div>

            <div class="clinical">
                <h3>Clinical Summary</h3>
                <p><strong>Reason for Visit:</strong> {{ visit.reason_for_visit }}</p>
                <p><strong>Diagnosis:</strong> {{ visit.diagnosis or 'N/A' }}</p>
                <p><strong>Discharge Summary:</strong></p>
                <p>{{ visit.discharge_summary or 'No summary provided' }}</p>
            </div>

            {% if vitals %}
            <div class="vitals">
                <h3>Vital Signs (Latest)</h3>
                <table>
                    <tr>
                        <th>Date/Time</th>
                        <th>Temp (°C)</th>
                        <th>HR (bpm)</th>
                        <th>BP (mmHg)</th>
                        <th>SpO2 (%)</th>
                    </tr>
                    {% for vital in vitals %}
                    <tr>
                        <td>{{ vital.recorded_at.strftime('%Y-%m-%d %H:%M') }}</td>
                        <td>{{ vital.temperature or '-' }}</td>
                        <td>{{ vital.heart_rate or '-' }}</td>
                        <td>{{ vital.blood_pressure_systolic }}/{{ vital.blood_pressure_diastolic if vital.blood_pressure_systolic else '-' }}</td>
                        <td>{{ vital.spo2 or '-' }}</td>
                    </tr>
                    {% endfor %}
                </table>
            </div>
            {% endif %}

            {% if lab_tests %}
            <div class="labs">
                <h3>Laboratory Tests</h3>
                <table>
                    <tr>
                        <th>Test Type</th>
                        <th>Requested</th>
                        <th>Completed</th>
                        <th>Result</th>
                    </tr>
                    {% for test in lab_tests %}
                    <tr>
                        <td>{{ test.test_type }}</td>
                        <td>{{ test.requested_at.strftime('%Y-%m-%d') }}</td>
                        <td>{{ test.completed_at.strftime('%Y-%m-%d') if test.completed_at else 'Pending' }}</td>
                        <td>{{ test.result_summary or 'See attached report' }}</td>
                    </tr>
                    {% endfor %}
                </table>
            </div>
            {% endif %}

            {% if prescriptions %}
            <div class="prescriptions">
                <h3>Medications Prescribed</h3>
                <table>
                    <tr>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                    </tr>
                    {% for rx in prescriptions %}
                    <tr>
                        <td>{{ rx.medication_name }}</td>
                        <td>{{ rx.dosage }}</td>
                        <td>{{ rx.frequency }}</td>
                        <td>{{ rx.duration_days }} days</td>
                    </tr>
                    {% endfor %}
                </table>
            </div>
            {% endif %}

            <div class="footer">
                <p>Generated on: {{ generated_at }}</p>
                <p>This is a system-generated document. No signature required.</p>
            </div>
        </body>
        </html>
        """

        template = Template(template_str)
        return template.render(**context)

    def _get_pdf_styles(self) -> str:
        """CSS styles for PDF"""
        return """
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 18pt;
        }
        .header p {
            margin: 2px 0;
            font-size: 10pt;
        }
        .title {
            text-align: center;
            margin: 20px 0;
        }
        .title h2 {
            background: #333;
            color: white;
            padding: 10px;
            margin: 0;
        }
        h3 {
            background: #f0f0f0;
            padding: 5px 10px;
            margin-top: 20px;
            border-left: 4px solid #007bff;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        table, th, td {
            border: 1px solid #ddd;
        }
        th, td {
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        .patient-info table, .visit-info table {
            border: none;
        }
        .patient-info td, .visit-info td {
            border: none;
            padding: 4px 8px;
        }
        .clinical p {
            margin: 10px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            color: #666;
            text-align: center;
        }
        """
```

**Modify: `backend/app/api/routes/visits.py`** (add discharge endpoint if missing)

```python
@router.post("/{visit_id}/discharge")
async def discharge_patient(
    visit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "super_admin"]))
):
    """
    Discharge patient and trigger auto-sync
    Requires doctor or super_admin role
    """
    from app.tasks.autosync import autosync_discharge

    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    if visit.status == "discharged":
        raise HTTPException(status_code=400, detail="Patient already discharged")

    # Update visit status
    visit.status = "discharged"
    visit.discharge_date = datetime.utcnow()
    db.commit()

    # Trigger async auto-sync task
    task = autosync_discharge.delay(str(visit_id), str(current_user.id))

    return {
        "message": "Discharge initiated",
        "visit_id": visit_id,
        "task_id": task.id,
        "status": "processing"
    }
```

**Dependencies to Add:**

```
# backend/requirements.txt
weasyprint==60.1
jinja2==3.1.2
```

**Test Checklist for A1:**
- [ ] Doctor can discharge patient from UI
- [ ] Celery task runs successfully
- [ ] PDF generated and uploaded to S3
- [ ] Global EMR records created (check database)
- [ ] Visit marked as synced
- [ ] No duplicate records on repeated runs

---

#### A2. Notification System (Day 3)

**Files to Create:**

```
backend/app/services/notification_service.py
backend/app/notifications/base.py
backend/app/notifications/email_provider.py
backend/app/notifications/sms_provider.py
backend/app/notifications/logger_provider.py
backend/app/tasks/reminders.py
```

**(Implementation details similar in structure - create provider pattern with dev fallbacks)**

---

#### A3. Lab Coordination Task (Day 4)

**File: `backend/app/tasks/lab_coordination.py`**

```python
@shared_task
def lab_coordination(test_id: str):
    """Auto-schedule lab slot and notify parties"""
    # Implementation: find available slot, book, update status, send notifications
```

---

#### A4. Vitals Monitoring Task (Day 4)

**File: `backend/app/tasks/vitals_monitoring.py`**

```python
@shared_task
def monitor_vitals():
    """Check recent vitals for emergencies"""
    # Implementation: query vitals, check thresholds, escalate via SSE
```

---

#### A5. SSE Real-Time Alerts (Day 5)

**File: `backend/app/core/sse.py`**
**File: `frontend/src/lib/sse.ts`**

**(Implementation for Server-Sent Events)**

---

### Phase B: DASHBOARD POLISH (Days 6-8) ✨

- AI Drafts queue widget
- Drag-and-drop bed assignment
- Voice-to-text vitals stub
- Enhanced animations

---

### Phase C: PRODUCTION HARDENING (Days 9-10) 🔒

- Comprehensive tests
- /metrics endpoint
- Security hardening
- Documentation updates

---

## 🏁 ACCEPTANCE CRITERIA

Before marking complete, verify:

- [ ] `docker-compose up --build` starts all services (including celery-worker, celery-beat)
- [ ] Doctor can discharge → PDF generated → Global EMR synced
- [ ] Notifications sent (or logged in dev mode)
- [ ] Real-time vitals alerts work (SSE)
- [ ] All tests pass (`pytest` and `npm test`)
- [ ] Lighthouse scores meet targets (≥80 for dashboards)
- [ ] No console errors in frontend
- [ ] All API endpoints documented in OpenAPI
- [ ] RUNBOOK.md updated with operations guide

---

## 💡 IMPLEMENTATION TIPS

1. **Follow Existing Patterns:**
   - Look at `backend/app/services/file_storage_service.py` for service pattern
   - Look at `backend/app/api/routes/auth.py` for endpoint structure
   - Look at `frontend/src/components/clinical/*` for component patterns

2. **Test Incrementally:**
   - After each feature, manually test in browser
   - Run `pytest backend/tests` frequently
   - Check Celery worker logs: `docker logs hass-celery-worker`

3. **Use Existing Tools:**
   - ApiClient already has methods - extend it
   - Animation library exists - use existing variants
   - Theme system works - apply it

4. **Dev Mode Fallbacks:**
   - If Twilio key missing → log to console
   - If OpenAI key missing → return dev mock
   - If SMTP not configured → log email body

5. **Commit Strategy:**
   ```
   git checkout -b feature/emr-autosync
   # implement A1
   git commit -m "feat(backend): implement EMR auto-sync task"
   # implement A2
   git commit -m "feat(backend): add notification system"
   # etc.
   ```

---

## 📞 GETTING HELP

If stuck:
1. Read existing code for patterns
2. Check docs/GAP_ANALYSIS.md for context
3. Review planning.md for original requirements
4. Test in isolation before integration

---

## 🎉 SUCCESS METRICS

**You succeed when:**
- Complete discharge flow works (Doctor → Discharge → PDF → Global EMR → Notification)
- All automation tasks run on schedule
- Real-time alerts appear in dashboards
- Tests pass
- System is deployable to production

**Ready to start? Begin with A1: EMR Auto-Sync System**

---

*End of Completion Directive*
