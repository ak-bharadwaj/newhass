"""
PDF generation service for discharge case-sheets
Uses HTML template that can be converted to PDF via browser or headless chrome
"""
from sqlalchemy.orm import Session
from app.models.visit import Visit
from app.services.file_storage_service import FileStorageService
from jinja2 import Template
from datetime import datetime
from uuid import UUID
from io import BytesIO
import logging

logger = logging.getLogger(__name__)


class PDFService:
    """Service for generating discharge PDF case-sheets"""

    def __init__(self, db: Session):
        self.db = db
        self.storage = FileStorageService()

    def generate_discharge_pdf(self, visit_id: UUID) -> str:
        """
        Generate discharge case-sheet as HTML (can be printed as PDF)
        Returns S3 URL

        Args:
            visit_id: Visit UUID

        Returns:
            str: S3 URL to the generated HTML/PDF file
        """
        visit = self.db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            raise ValueError(f"Visit {visit_id} not found")

        # Gather all data
        patient = visit.patient
        hospital = visit.hospital
        region = hospital.region

        # Get related data (latest records)
        vitals = list(visit.vitals.order_by(Visit.vitals.property.mapper.class_.recorded_at.desc()).limit(5))
        lab_tests = [test for test in visit.lab_tests if test.status == "completed"]
        prescriptions = list(visit.prescriptions.all())
        nurse_logs = list(visit.nurse_logs.order_by(Visit.nurse_logs.property.mapper.class_.logged_at.desc()).limit(10))

        # Render HTML from template
        html_content = self._render_template({
            "patient": patient,
            "visit": visit,
            "hospital": hospital,
            "region": region,
            "vitals": vitals,
            "lab_tests": lab_tests,
            "prescriptions": prescriptions,
            "nurse_logs": nurse_logs,
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        })

        # Convert HTML string to bytes
        html_bytes = html_content.encode('utf-8')

        # Upload to S3
        file_path = f"{region.code}/{hospital.code}/patients/{patient.id}/visits/{visit.id}/discharge-summary.html"

        try:
            # Create BytesIO object for upload
            file_obj = BytesIO(html_bytes)
            file_obj.seek(0)

            # Use generic file upload (treated as document)
            pdf_url = self.storage.upload_file(
                file_path=file_path,
                file_content=file_obj,
                content_type="text/html"
            )

            logger.info(f"Generated discharge summary for visit {visit_id}: {pdf_url}")

            return pdf_url

        except Exception as e:
            logger.error(f"Failed to upload discharge summary: {str(e)}")
            # Return a placeholder URL in dev mode
            return f"/dev-mode/discharge-summaries/{visit.id}.html"

    def upload_file(self, file_path: str, file_content: BytesIO, content_type: str = "application/octet-stream") -> str:
        """
        Upload file to storage
        Dev mode fallback: returns a dev URL
        """
        if hasattr(self.storage, 'use_minio') and self.storage.use_minio:
            # Production: actually upload
            return self.storage.upload_file(file_path, file_content, content_type)
        else:
            # Dev mode: return placeholder
            return f"/dev-storage/{file_path}"

    def _render_template(self, context: dict) -> str:
        """Render HTML template with context"""
        template_str = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discharge Summary - {{ patient.first_name }} {{ patient.last_name }}</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11pt;
            color: #333;
            line-height: 1.6;
            background: white;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #1976d2;
            padding-bottom: 15px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1976d2;
            font-size: 24pt;
            margin-bottom: 5px;
        }
        .header p {
            color: #666;
            font-size: 10pt;
            margin: 2px 0;
        }
        .title {
            text-align: center;
            margin: 30px 0;
        }
        .title h2 {
            background: #1976d2;
            color: white;
            padding: 12px;
            font-size: 18pt;
            border-radius: 4px;
        }
        .section {
            margin: 25px 0;
            page-break-inside: avoid;
        }
        .section h3 {
            background: #f5f5f5;
            padding: 8px 12px;
            margin-bottom: 12px;
            border-left: 4px solid #1976d2;
            font-size: 14pt;
            color: #1976d2;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        table, th, td {
            border: 1px solid #ddd;
        }
        th {
            background-color: #f0f0f0;
            font-weight: 600;
            text-align: left;
            padding: 10px;
            font-size: 10pt;
        }
        td {
            padding: 8px 10px;
            font-size: 10pt;
        }
        .info-table {
            border: none;
        }
        .info-table td {
            border: none;
            padding: 6px 10px;
        }
        .info-table td:first-child {
            font-weight: 600;
            width: 180px;
            color: #555;
        }
        .clinical-text {
            background: #f9f9f9;
            padding: 15px;
            border-left: 3px solid #1976d2;
            margin-top: 10px;
            border-radius: 4px;
        }
        .clinical-text p {
            margin: 8px 0;
        }
        .alert {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-weight: 600;
            color: #856404;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            font-size: 9pt;
            color: #666;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            margin-bottom: 10px;
        }
        @media print {
            body {
                padding: 0;
            }
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            {% if region.theme_settings and region.theme_settings.logo_url %}
            <img src="{{ region.theme_settings.logo_url }}" alt="Logo" class="logo">
            {% endif %}
            <h1>{{ hospital.name }}</h1>
            <p>{{ hospital.address }}</p>
            <p>Phone: {{ hospital.phone or 'N/A' }} | Email: {{ hospital.email or 'N/A' }}</p>
        </div>

        <!-- Title -->
        <div class="title">
            <h2>DISCHARGE SUMMARY</h2>
        </div>

        <!-- Patient Information -->
        <div class="section">
            <h3>Patient Information</h3>
            <table class="info-table">
                <tr>
                    <td>Full Name:</td>
                    <td>{{ patient.first_name }} {{ patient.last_name }}</td>
                </tr>
                <tr>
                    <td>Medical Record Number:</td>
                    <td><strong>{{ patient.mrn }}</strong></td>
                </tr>
                <tr>
                    <td>Date of Birth:</td>
                    <td>{{ patient.date_of_birth }}</td>
                </tr>
                <tr>
                    <td>Gender:</td>
                    <td>{{ patient.gender }}</td>
                </tr>
                <tr>
                    <td>Blood Group:</td>
                    <td>{{ patient.blood_group or 'Not recorded' }}</td>
                </tr>
                {% if patient.allergies %}
                <tr>
                    <td>Allergies:</td>
                    <td class="alert">⚠️ {{ patient.allergies }}</td>
                </tr>
                {% endif %}
            </table>
        </div>

        <!-- Visit Details -->
        <div class="section">
            <h3>Visit Details</h3>
            <table class="info-table">
                <tr>
                    <td>Admission Date:</td>
                    <td>{{ visit.admission_date.strftime('%B %d, %Y at %I:%M %p') if visit.admission_date else 'N/A' }}</td>
                </tr>
                <tr>
                    <td>Discharge Date:</td>
                    <td>{{ visit.discharge_date.strftime('%B %d, %Y at %I:%M %p') if visit.discharge_date else 'N/A' }}</td>
                </tr>
                <tr>
                    <td>Length of Stay:</td>
                    <td>
                        {% if visit.discharge_date and visit.admission_date %}
                        {{ (visit.discharge_date - visit.admission_date).days }} days
                        {% else %}
                        N/A
                        {% endif %}
                    </td>
                </tr>
                <tr>
                    <td>Visit Type:</td>
                    <td>{{ visit.visit_type|title }}</td>
                </tr>
                <tr>
                    <td>Attending Physician:</td>
                    <td>
                        {% if visit.attending_doctor %}
                        Dr. {{ visit.attending_doctor.first_name }} {{ visit.attending_doctor.last_name }}
                        {% else %}
                        Not assigned
                        {% endif %}
                    </td>
                </tr>
            </table>
        </div>

        <!-- Clinical Summary -->
        <div class="section">
            <h3>Clinical Summary</h3>
            <div class="clinical-text">
                <p><strong>Reason for Visit:</strong></p>
                <p>{{ visit.reason_for_visit }}</p>

                <p><strong>Diagnosis:</strong></p>
                <p>{{ visit.diagnosis or 'Not documented' }}</p>

                <p><strong>Discharge Summary:</strong></p>
                <p>{{ visit.discharge_summary or 'No discharge summary provided' }}</p>
            </div>
        </div>

        <!-- Vital Signs -->
        {% if vitals %}
        <div class="section">
            <h3>Vital Signs (Recent)</h3>
            <table>
                <thead>
                    <tr>
                        <th>Date/Time</th>
                        <th>Temp (°C)</th>
                        <th>Heart Rate</th>
                        <th>BP (mmHg)</th>
                        <th>SpO2 (%)</th>
                    </tr>
                </thead>
                <tbody>
                    {% for vital in vitals %}
                    <tr {% if vital.is_abnormal %}style="background: #fff3cd;"{% endif %}>
                        <td>{{ vital.recorded_at.strftime('%Y-%m-%d %H:%M') if vital.recorded_at else '-' }}</td>
                        <td>{{ vital.temperature or '-' }}</td>
                        <td>{{ vital.heart_rate or '-' }} bpm</td>
                        <td>
                            {% if vital.blood_pressure_systolic and vital.blood_pressure_diastolic %}
                            {{ vital.blood_pressure_systolic }}/{{ vital.blood_pressure_diastolic }}
                            {% else %}
                            -
                            {% endif %}
                        </td>
                        <td>{{ vital.spo2 or '-' }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        <!-- Laboratory Tests -->
        {% if lab_tests %}
        <div class="section">
            <h3>Laboratory Tests</h3>
            <table>
                <thead>
                    <tr>
                        <th>Test Type</th>
                        <th>Requested</th>
                        <th>Completed</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    {% for test in lab_tests %}
                    <tr>
                        <td>{{ test.test_type }}</td>
                        <td>{{ test.requested_at.strftime('%Y-%m-%d') if test.requested_at else '-' }}</td>
                        <td>{{ test.completed_at.strftime('%Y-%m-%d') if test.completed_at else 'Pending' }}</td>
                        <td>{{ test.result_summary or 'See attached report' }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        <!-- Medications -->
        {% if prescriptions %}
        <div class="section">
            <h3>Medications Prescribed</h3>
            <table>
                <thead>
                    <tr>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Route</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    {% for rx in prescriptions %}
                    <tr>
                        <td>{{ rx.medication_name }}</td>
                        <td>{{ rx.dosage }}</td>
                        <td>{{ rx.frequency }}</td>
                        <td>{{ rx.route }}</td>
                        <td>
                            {% if rx.duration_days %}
                            {{ rx.duration_days }} days
                            {% else %}
                            As needed
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        <!-- Footer -->
        <div class="footer">
            <p><strong>Document Generated:</strong> {{ generated_at }}</p>
            <p>This is a system-generated document from {{ hospital.name }}</p>
            <p>{{ region.name }} Healthcare System</p>
        </div>
    </div>
</body>
</html>
        """

        template = Template(template_str)
        return template.render(**context)
