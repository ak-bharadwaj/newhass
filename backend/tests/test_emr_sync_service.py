"""
Unit tests for EMR Sync Service

Run with: pytest tests/test_emr_sync_service.py -v
"""
import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock, patch

from app.services.emr_sync_service import EMRSyncService
from app.models import Visit, Patient, Vitals, LabTest, Prescription, LocalEMR, GlobalEMR


@pytest.fixture
def db_session():
    """Mock database session"""
    session = Mock()
    session.query = Mock()
    session.add = Mock()
    session.commit = Mock()
    session.rollback = Mock()
    return session


@pytest.fixture
def emr_sync_service(db_session):
    """Create EMR sync service instance"""
    return EMRSyncService(db_session)


@pytest.fixture
def sample_visit():
    """Create sample visit data"""
    visit = Mock(spec=Visit)
    visit.id = uuid4()
    visit.patient_id = uuid4()
    visit.hospital_id = uuid4()
    visit.admission_date = datetime.utcnow() - timedelta(days=3)
    visit.discharge_date = datetime.utcnow()
    visit.status = "discharged"
    visit.discharge_summary = "Patient recovered well"
    visit.is_synced_to_global = False

    # Mock patient
    visit.patient = Mock(spec=Patient)
    visit.patient.id = visit.patient_id
    visit.patient.first_name = "John"
    visit.patient.last_name = "Doe"
    visit.patient.mrn = "MRN001"

    return visit


@pytest.fixture
def sample_vitals():
    """Create sample vitals data"""
    vitals = []
    for i in range(5):
        vital = Mock(spec=Vitals)
        vital.id = uuid4()
        vital.patient_id = uuid4()
        vital.visit_id = uuid4()
        vital.temperature = 37.0 + (i * 0.1)
        vital.heart_rate = 72 + i
        vital.systolic_bp = 120
        vital.diastolic_bp = 80
        vital.spo2 = 98
        vital.recorded_at = datetime.utcnow() - timedelta(hours=i)
        vital.is_abnormal = False
        vitals.append(vital)
    return vitals


class TestEMRSyncService:
    """Test cases for EMR Sync Service"""

    def test_sync_visit_to_global_success(self, emr_sync_service, db_session, sample_visit, sample_vitals):
        """Test successful visit sync to global EMR"""
        # Arrange
        db_session.query.return_value.filter.return_value.first.return_value = sample_visit
        db_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = sample_vitals
        db_session.query.return_value.filter.return_value.all.return_value = []  # No existing global EMR

        # Act
        result = emr_sync_service.sync_visit_to_global(sample_visit.id)

        # Assert
        assert result is not None
        assert "records_created" in result
        assert result["records_created"] >= 1  # At least visit summary created
        assert db_session.commit.called

    def test_sync_visit_not_found(self, emr_sync_service, db_session):
        """Test sync when visit doesn't exist"""
        # Arrange
        db_session.query.return_value.filter.return_value.first.return_value = None

        # Act & Assert
        with pytest.raises(ValueError, match="Visit not found"):
            emr_sync_service.sync_visit_to_global(uuid4())

    def test_sync_visit_not_discharged(self, emr_sync_service, db_session, sample_visit):
        """Test sync when visit is not discharged"""
        # Arrange
        sample_visit.status = "active"
        db_session.query.return_value.filter.return_value.first.return_value = sample_visit

        # Act & Assert
        with pytest.raises(ValueError, match="can only be synced after discharge"):
            emr_sync_service.sync_visit_to_global(sample_visit.id)

    def test_sync_idempotency(self, emr_sync_service, db_session, sample_visit):
        """Test that sync is idempotent (can be run multiple times safely)"""
        # Arrange
        sample_visit.is_synced_to_global = True
        db_session.query.return_value.filter.return_value.first.return_value = sample_visit

        # Act
        result = emr_sync_service.sync_visit_to_global(sample_visit.id)

        # Assert - should not create duplicates
        assert result["records_created"] == 0
        assert result["message"] == "Already synced"

    def test_sync_vitals_filtering(self, emr_sync_service, db_session, sample_visit, sample_vitals):
        """Test that only significant vitals are synced (latest 10)"""
        # Arrange
        db_session.query.return_value.filter.return_value.first.return_value = sample_visit
        db_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = sample_vitals[:10]
        db_session.query.return_value.filter.return_value.all.return_value = []

        # Act
        result = emr_sync_service.sync_visit_to_global(sample_visit.id)

        # Assert
        assert result["vitals_synced"] <= 10  # Should sync max 10 vitals

    def test_sync_with_lab_tests(self, emr_sync_service, db_session, sample_visit):
        """Test syncing visit with lab tests"""
        # Arrange
        lab_test = Mock(spec=LabTest)
        lab_test.id = uuid4()
        lab_test.test_type = "Blood Test"
        lab_test.status = "completed"
        lab_test.results = {"hemoglobin": 14.5}

        db_session.query.return_value.filter.return_value.first.return_value = sample_visit
        db_session.query.return_value.filter.return_value.all.return_value = [lab_test]
        db_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []

        # Act
        result = emr_sync_service.sync_visit_to_global(sample_visit.id)

        # Assert
        assert result["lab_tests_synced"] == 1

    def test_sync_with_prescriptions(self, emr_sync_service, db_session, sample_visit):
        """Test syncing visit with prescriptions"""
        # Arrange
        prescription = Mock(spec=Prescription)
        prescription.id = uuid4()
        prescription.medication_name = "Amoxicillin"
        prescription.dosage = "500mg"
        prescription.frequency = "3 times daily"

        db_session.query.return_value.filter.return_value.first.return_value = sample_visit
        db_session.query.return_value.filter.return_value.all.return_value = [prescription]
        db_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []

        # Act
        result = emr_sync_service.sync_visit_to_global(sample_visit.id)

        # Assert
        assert result["prescriptions_synced"] == 1

    def test_sync_rollback_on_error(self, emr_sync_service, db_session, sample_visit):
        """Test that sync rolls back on error"""
        # Arrange
        db_session.query.return_value.filter.return_value.first.return_value = sample_visit
        db_session.commit.side_effect = Exception("Database error")

        # Act & Assert
        with pytest.raises(Exception):
            emr_sync_service.sync_visit_to_global(sample_visit.id)

        assert db_session.rollback.called

    def test_deduplication_logic(self, emr_sync_service, db_session, sample_visit):
        """Test that duplicate records are not created"""
        # Arrange
        existing_global_record = Mock(spec=GlobalEMR)
        existing_global_record.visit_id = sample_visit.id

        db_session.query.return_value.filter.return_value.first.return_value = sample_visit
        db_session.query.return_value.filter.return_value.all.return_value = [existing_global_record]
        db_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []

        # Act
        result = emr_sync_service.sync_visit_to_global(sample_visit.id)

        # Assert - should not create duplicates
        assert result["records_created"] == 0


@pytest.mark.integration
class TestEMRSyncIntegration:
    """Integration tests for EMR sync (requires test database)"""

    @pytest.mark.skip(reason="Requires test database setup")
    def test_full_discharge_workflow(self):
        """Test complete discharge workflow with real database"""
        # This would test:
        # 1. Create patient and visit
        # 2. Add vitals, labs, prescriptions
        # 3. Discharge patient
        # 4. Sync to global EMR
        # 5. Verify all data in global EMR
        pass

    @pytest.mark.skip(reason="Requires test database setup")
    def test_concurrent_sync_attempts(self):
        """Test handling of concurrent sync attempts"""
        # This would test race conditions
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
