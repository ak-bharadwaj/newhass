# 📋 Case Sheet Event Tracking & Acknowledgment System

> **Status**: ✅ Fully Implemented  
> **Version**: 1.0  
> **Last Updated**: October 29, 2025

---

## 📊 Overview

The Case Sheet system includes a comprehensive **event timeline** with **nurse acknowledgment** capabilities. This allows for complete tracking of all clinical events during a patient's inpatient stay, with proper attribution and verification.

---

## ✅ What's Already Implemented

### 1. Database Model ✅
**File**: `backend/app/models/case_sheet.py`

**Key Fields**:
- `event_timeline` (JSONB array) - Stores all events chronologically
- `progress_notes` (JSONB array) - Separate progress notes by doctors/nurses

**Event Timeline Structure**:
```python
{
    "type": "medication_administered",  # EventType enum
    "description": "Administered Paracetamol 500mg",
    "timestamp": "2025-10-29T10:30:00Z",
    "data": {  # Additional structured data
        "medication": "Paracetamol",
        "dosage": "500mg",
        "route": "oral"
    },
    "recorded_by_user_id": "uuid",
    "recorded_by_user_name": "Dr. John Smith",
    "recorded_by_role": "doctor",
    "requires_acknowledgment": True,  # Doctor orders require nurse ack
    "acknowledged": False,
    "acknowledged_by_user_id": None,
    "acknowledged_by_user_name": None,
    "acknowledged_by_role": None,
    "acknowledged_at": None,
    "acknowledgment_notes": None
}
```

### 2. Event Types ✅
**File**: `backend/app/schemas/case_sheet.py`

```python
class EventType(str, Enum):
    VITALS_RECORDED = "vitals_recorded"
    MEDICATION_ADMINISTERED = "medication_administered"
    DOCTOR_VISIT = "doctor_visit"
    PROCEDURE = "procedure"
    LAB_TEST_ORDERED = "lab_test_ordered"
    LAB_RESULT_RECEIVED = "lab_result_received"
    IMAGING_ORDERED = "imaging_ordered"
    IMAGING_RESULT_RECEIVED = "imaging_result_received"
    CONSULTATION_REQUESTED = "consultation_requested"
    TRANSFER = "transfer"
    DISCHARGE_PLANNED = "discharge_planned"
    OTHER = "other"
```

### 3. API Schemas ✅
**File**: `backend/app/schemas/case_sheet.py`

**AddEventToTimeline**:
```python
{
    "event_type": "medication_administered",
    "description": "Administered Paracetamol 500mg",
    "event_data": {
        "medication": "Paracetamol",
        "dosage": "500mg",
        "route": "oral"
    },
    "requires_acknowledgment": True  # If nurse needs to verify
}
```

**AcknowledgeEvent**:
```python
{
    "event_index": 3,  # Index in event_timeline array
    "acknowledgment_notes": "Administered at 10:30 AM"
}
```

### 4. API Endpoints ✅

#### A. Add Event to Timeline
**Endpoint**: `POST /api/v1/case-sheets/{case_sheet_id}/events`  
**Permission**: Doctor, Nurse, Manager  
**Purpose**: Add any event to the case sheet timeline

**Example Request**:
```json
{
    "event_type": "medication_administered",
    "description": "Administered Aspirin 75mg",
    "event_data": {
        "medication": "Aspirin",
        "dosage": "75mg",
        "route": "oral",
        "time": "08:00"
    },
    "requires_acknowledgment": true
}
```

**Example Response**: Full CaseSheet object with updated event_timeline

---

#### B. Acknowledge Event
**Endpoint**: `POST /api/v1/case-sheets/{case_sheet_id}/events/acknowledge`  
**Permission**: Doctor, Nurse, Manager  
**Purpose**: Mark an event as acknowledged (nurse verifying doctor's order)

**Example Request**:
```json
{
    "event_index": 2,
    "acknowledgment_notes": "Medication administered successfully at 08:15 AM"
}
```

**Example Response**: Full CaseSheet object with acknowledged event

---

#### C. Get Pending Acknowledgments
**Endpoint**: `GET /api/v1/case-sheets/{case_sheet_id}/events/pending`  
**Permission**: All authenticated users with view access  
**Purpose**: Get all events waiting for nurse acknowledgment

**Example Response**:
```json
{
    "case_sheet_id": "uuid",
    "patient_id": "uuid",
    "case_number": "CS-2025-001",
    "pending_count": 3,
    "pending_events": [
        {
            "index": 5,
            "event": {
                "type": "medication_administered",
                "description": "Administer Paracetamol 500mg",
                "timestamp": "2025-10-29T08:00:00Z",
                "recorded_by_user_name": "Dr. Smith",
                "requires_acknowledgment": true,
                "acknowledged": false
            }
        },
        {
            "index": 7,
            "event": {
                "type": "vitals_recorded",
                "description": "Record BP and temperature",
                "timestamp": "2025-10-29T09:00:00Z",
                "recorded_by_user_name": "Dr. Jones",
                "requires_acknowledgment": true,
                "acknowledged": false
            }
        }
    ]
}
```

---

## 🔄 Typical Workflows

### Workflow 1: Doctor Orders Medication
1. **Doctor** creates medication order:
   ```
   POST /api/v1/case-sheets/{id}/events
   {
       "event_type": "medication_administered",
       "description": "Administer Aspirin 75mg at 8:00 AM",
       "requires_acknowledgment": true
   }
   ```

2. **Nurse** views pending orders:
   ```
   GET /api/v1/case-sheets/{id}/events/pending
   ```

3. **Nurse** acknowledges after administering:
   ```
   POST /api/v1/case-sheets/{id}/events/acknowledge
   {
       "event_index": 5,
       "acknowledgment_notes": "Administered at 08:05 AM, no side effects"
   }
   ```

### Workflow 2: Nurse Records Vitals
1. **Nurse** records vitals (no acknowledgment needed):
   ```
   POST /api/v1/case-sheets/{id}/events
   {
       "event_type": "vitals_recorded",
       "description": "Vitals: BP 120/80, HR 72, Temp 98.6°F",
       "event_data": {
           "blood_pressure": "120/80",
           "heart_rate": 72,
           "temperature": 98.6,
           "spo2": 98
       },
       "requires_acknowledgment": false
   }
   ```

### Workflow 3: Doctor Visit
1. **Doctor** records visit:
   ```
   POST /api/v1/case-sheets/{id}/events
   {
       "event_type": "doctor_visit",
       "description": "Daily rounds - patient stable, continue current treatment",
       "requires_acknowledgment": false
   }
   ```

### Workflow 4: Procedure
1. **Doctor** records procedure:
   ```
   POST /api/v1/case-sheets/{id}/events
   {
       "event_type": "procedure",
       "description": "Central line insertion",
       "event_data": {
           "procedure_name": "Central line insertion",
           "location": "Right subclavian",
           "complications": "None"
       },
       "requires_acknowledgment": false
   }
   ```

---

## 👥 Access Control

### Who Can View Case Sheets?
```python
allowed_roles = ['super_admin', 'regional_admin', 'manager', 'doctor', 'nurse']
```

### Who Can Add Events?
- **Doctor**: All event types
- **Nurse**: All event types (typically vitals, medications)
- **Manager**: All event types

### Who Can Acknowledge?
- **Doctor**: Can acknowledge events
- **Nurse**: Can acknowledge events (primary use case)
- **Manager**: Can acknowledge events

### Hospital Access:
- Users can only access case sheets from their assigned hospital
- Exception: Super Admin and Regional Admin can access all hospitals

---

## 🎨 Frontend Integration Guide

### 1. Display Event Timeline
```tsx
// frontend/src/components/CaseSheetTimeline.tsx
interface Event {
    type: string;
    description: string;
    timestamp: string;
    recorded_by_user_name: string;
    recorded_by_role: string;
    requires_acknowledgment: boolean;
    acknowledged: boolean;
    acknowledged_by_user_name?: string;
    acknowledged_at?: string;
}

export const CaseSheetTimeline = ({ events }: { events: Event[] }) => {
    return (
        <div className="space-y-4">
            {events.map((event, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
                    <EventIcon type={event.type} />
                    <div className="flex-1">
                        <p className="text-white font-medium">{event.description}</p>
                        <p className="text-sm text-gray-400">
                            {new Date(event.timestamp).toLocaleString()} by {event.recorded_by_user_name}
                        </p>
                        {event.requires_acknowledgment && !event.acknowledged && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs mt-2">
                                ⏳ Pending Acknowledgment
                            </span>
                        )}
                        {event.acknowledged && (
                            <p className="text-sm text-green-400 mt-2">
                                ✅ Acknowledged by {event.acknowledged_by_user_name} at {new Date(event.acknowledged_at).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
```

### 2. Add Event Form
```tsx
import { useNotification } from '@/components/ui/Toast';
import apiClient from '@/lib/api';

export const AddEventForm = ({ caseSheetId, onSuccess }) => {
    const toast = useNotification();
    const [eventType, setEventType] = useState('medication_administered');
    const [description, setDescription] = useState('');
    const [requiresAck, setRequiresAck] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.addCaseSheetEvent(caseSheetId, {
                event_type: eventType,
                description,
                requires_acknowledgment: requiresAck
            });
            toast.success('Event added successfully');
            onSuccess();
        } catch (error) {
            toast.error('Failed to add event');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="medication_administered">Medication Administered</option>
                <option value="vitals_recorded">Vitals Recorded</option>
                <option value="doctor_visit">Doctor Visit</option>
                <option value="procedure">Procedure</option>
                <option value="other">Other</option>
            </select>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Event description"
                required
            />
            <label>
                <input
                    type="checkbox"
                    checked={requiresAck}
                    onChange={(e) => setRequiresAck(e.target.checked)}
                />
                Requires acknowledgment
            </label>
            <button type="submit">Add Event</button>
        </form>
    );
};
```

### 3. Nurse Pending Tasks Dashboard
```tsx
export const NursePendingTasks = ({ caseSheetId }) => {
    const [pending, setPending] = useState(null);
    const toast = useNotification();

    const loadPending = async () => {
        const data = await apiClient.getPendingAcknowledgments(caseSheetId);
        setPending(data);
    };

    const handleAcknowledge = async (eventIndex) => {
        try {
            await apiClient.acknowledgeCaseSheetEvent(caseSheetId, {
                event_index: eventIndex,
                acknowledgment_notes: "Completed as ordered"
            });
            toast.success('Event acknowledged');
            loadPending();
        } catch (error) {
            toast.error('Failed to acknowledge');
        }
    };

    return (
        <div className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl">
            <h3 className="text-xl font-semibold mb-4">
                Pending Tasks ({pending?.pending_count || 0})
            </h3>
            {pending?.pending_events.map(({ index, event }) => (
                <div key={index} className="p-4 bg-white/5 rounded-xl mb-3">
                    <p className="text-white">{event.description}</p>
                    <p className="text-sm text-gray-400">Ordered by: {event.recorded_by_user_name}</p>
                    <button
                        onClick={() => handleAcknowledge(index)}
                        className="mt-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500"
                    >
                        ✅ Acknowledge
                    </button>
                </div>
            ))}
        </div>
    );
};
```

---

## 📊 API Client Integration

Add these methods to `frontend/src/lib/api.ts`:

```typescript
// Case Sheet Events
async addCaseSheetEvent(caseSheetId: string, eventData: {
    event_type: string;
    description: string;
    event_data?: any;
    requires_acknowledgment: boolean;
}) {
    return this.authenticatedRequest(`/case-sheets/${caseSheetId}/events`, {
        method: 'POST',
        body: JSON.stringify(eventData),
    });
}

async acknowledgeCaseSheetEvent(caseSheetId: string, ackData: {
    event_index: number;
    acknowledgment_notes?: string;
}) {
    return this.authenticatedRequest(`/case-sheets/${caseSheetId}/events/acknowledge`, {
        method: 'POST',
        body: JSON.stringify(ackData),
    });
}

async getPendingAcknowledgments(caseSheetId: string) {
    return this.authenticatedRequest(`/case-sheets/${caseSheetId}/events/pending`, {
        method: 'GET',
    });
}
```

---

## 🎯 Use Cases

### 1. Medication Management
- Doctor orders medication → Event with `requires_acknowledgment: true`
- Nurse sees pending order in their dashboard
- Nurse administers medication
- Nurse acknowledges event with time and notes
- Complete audit trail maintained

### 2. Vital Signs Monitoring
- Nurse records vitals every 4 hours
- Events added with `requires_acknowledgment: false`
- Timeline shows complete vital signs history
- Doctors can review trends

### 3. Procedure Tracking
- Doctor performs procedure
- Event added with procedure details
- Complete record of all procedures performed

### 4. Lab/Imaging Workflow
- Doctor orders lab test → Event: `lab_test_ordered`
- Lab completes test → Event: `lab_result_received`
- Complete tracking from order to result

---

## ✅ Benefits

### For Doctors:
- ✅ Complete visibility of all interventions
- ✅ Know what nurses have administered
- ✅ Verify orders are being executed
- ✅ Complete audit trail for medico-legal purposes

### For Nurses:
- ✅ Clear task list of pending orders
- ✅ Acknowledge completion with notes
- ✅ Record vital signs and observations
- ✅ Proper attribution of their work

### For Admins:
- ✅ Complete audit trail
- ✅ Quality assurance
- ✅ Compliance tracking
- ✅ Performance metrics

### For Hospital:
- ✅ Medico-legal protection
- ✅ Quality improvement data
- ✅ Accreditation compliance
- ✅ Complete patient care documentation

---

## 🚀 Next Steps to Use

### 1. Deploy Backend
```bash
docker compose up -d --build backend
```

### 2. Add API Methods to Frontend
Add the 3 methods above to `frontend/src/lib/api.ts`

### 3. Create UI Components
- Event timeline display
- Add event form
- Acknowledge event button
- Pending tasks dashboard for nurses

### 4. Integrate into Existing Pages
- Doctor dashboard: Show pending acknowledgments
- Nurse dashboard: Show tasks requiring acknowledgment
- Case sheet view: Display full event timeline

---

## 📚 Reference

### Key Files:
- **Model**: `backend/app/models/case_sheet.py`
- **Schemas**: `backend/app/schemas/case_sheet.py`
- **Routes**: `backend/app/api/routes/case_sheets.py`
- **Event Endpoints**: `backend/app/api/v1/endpoints/case_sheet_events.py` (reference)

### API Documentation:
Once deployed, visit: `http://localhost:8000/api/v1/docs#/Case%20Sheets`

---

## ✨ Summary

**YES!** The case sheet system **already has** comprehensive event tracking with nurse acknowledgment:

✅ **Event Timeline** - Chronological log of all events  
✅ **Nurse Acknowledgment** - Verify doctor orders  
✅ **Complete Attribution** - Who did what, when  
✅ **Pending Tasks** - See what needs acknowledgment  
✅ **Audit Trail** - Complete medico-legal record  
✅ **Role-Based Access** - Doctors, nurses, managers can all participate  
✅ **Available to All** - Doctors, nurses, admins can all view and interact

The system is **fully implemented** and ready to use once deployed!

---

**Document Version**: 1.0  
**Created**: October 29, 2025  
**Status**: ✅ Complete Implementation
