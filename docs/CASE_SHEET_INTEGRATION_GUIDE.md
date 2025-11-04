# Case Sheet Integration Guide

## Quick Start: Adding Case Sheets to Doctor Dashboard

### Step 1: Create Case Sheet Page

**File**: `frontend/src/app/dashboard/doctor/case-sheets/[id]/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CaseSheetForm from '@/components/CaseSheet/CaseSheetForm';
import CaseSheetViewer from '@/components/CaseSheet/CaseSheetViewer';
import apiClient from '@/lib/api';

export default function CaseSheetPage() {
    const params = useParams();
    const router = useRouter();
    const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');
    const [caseSheet, setCaseSheet] = useState(null);
    const [patientInfo, setPatientInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id && params.id !== 'new') {
            loadCaseSheet();
        } else {
            setMode('create');
            setLoading(false);
        }
    }, [params.id]);

    const loadCaseSheet = async () => {
        try {
            const data = await apiClient.getCaseSheet(params.id as string);
            setCaseSheet(data);
            
            // Load patient info
            const patient = await apiClient.getPatient(data.patient_id);
            setPatientInfo(patient);
            
            setLoading(false);
        } catch (error) {
            console.error('Failed to load case sheet:', error);
            setLoading(false);
        }
    };

    const handleSave = async (data: any) => {
        try {
            if (mode === 'create') {
                const result = await apiClient.createCaseSheet(data);
                router.push(`/dashboard/doctor/case-sheets/${result.id}`);
            } else {
                await apiClient.updateCaseSheet(params.id as string, data);
                await loadCaseSheet();
                setMode('view');
            }
        } catch (error) {
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (mode === 'create' || mode === 'edit') {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <button
                        onClick={() => mode === 'edit' ? setMode('view') : router.back()}
                        className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20"
                    >
                        ← Back
                    </button>
                </div>
                <CaseSheetForm
                    patientId={caseSheet?.patient_id || params.patientId}
                    visitId={caseSheet?.visit_id || params.visitId}
                    hospitalId={caseSheet?.hospital_id || 'current-hospital-id'}
                    initialData={caseSheet}
                    mode={mode}
                    onSave={handleSave}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <CaseSheetViewer
                caseSheet={caseSheet}
                patientInfo={patientInfo}
                onEdit={() => setMode('edit')}
                onPrint={() => window.print()}
            />
        </div>
    );
}
```

---

### Step 2: Add List Page

**File**: `frontend/src/app/dashboard/doctor/case-sheets/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api';

export default function CaseSheetsListPage() {
    const [caseSheets, setCaseSheets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCaseSheets();
    }, []);

    const loadCaseSheets = async () => {
        try {
            const data = await apiClient.getCaseSheets();
            setCaseSheets(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load case sheets:', error);
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Case Sheets</h1>
                <Link
                    href="/dashboard/doctor/case-sheets/new"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500"
                >
                    + Create New Case Sheet
                </Link>
            </div>

            <div className="grid gap-4">
                {caseSheets.map((sheet: any) => (
                    <Link
                        key={sheet.id}
                        href={`/dashboard/doctor/case-sheets/${sheet.id}`}
                        className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-semibold text-white">
                                        {sheet.case_number}
                                    </h3>
                                    <span className="px-3 py-1 bg-blue-600/30 rounded-full text-blue-300 text-sm">
                                        {sheet.patient_name}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-sm mb-2">
                                    {sheet.chief_complaint}
                                </p>
                                <p className="text-gray-500 text-xs">
                                    Admitted: {new Date(sheet.admission_date).toLocaleDateString()}
                                </p>
                            </div>
                            {sheet.discharge_date ? (
                                <span className="px-3 py-1 bg-green-600/30 rounded-full text-green-300 text-sm">
                                    Discharged
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-yellow-600/30 rounded-full text-yellow-300 text-sm">
                                    Active
                                </span>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
```

---

### Step 3: Add API Methods to `lib/api.ts`

```typescript
// Case Sheet Methods
async getCaseSheets() {
    return this.authenticatedRequest('/case-sheets', { method: 'GET' });
}

async getCaseSheet(id: string) {
    return this.authenticatedRequest(`/case-sheets/${id}`, { method: 'GET' });
}

async createCaseSheet(data: any) {
    return this.authenticatedRequest('/case-sheets', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

async updateCaseSheet(id: string, data: any) {
    return this.authenticatedRequest(`/case-sheets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

async getCaseSheetsByPatient(patientId: string) {
    return this.authenticatedRequest(`/case-sheets/patient/${patientId}`, {
        method: 'GET',
    });
}

async getCaseSheetsByVisit(visitId: string) {
    return this.authenticatedRequest(`/case-sheets/visit/${visitId}`, {
        method: 'GET',
    });
}

// Progress Notes
async addProgressNote(caseSheetId: string, note: string) {
    return this.authenticatedRequest(`/case-sheets/${caseSheetId}/progress-notes`, {
        method: 'POST',
        body: JSON.stringify({ note }),
    });
}

// Event Timeline (from previous implementation)
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

### Step 4: Add Navigation Link

**File**: Update doctor dashboard layout or sidebar

```typescript
<Link
    href="/dashboard/doctor/case-sheets"
    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10"
>
    <span className="text-2xl">📋</span>
    <span>Case Sheets</span>
</Link>
```

---

## Quick Create from Visit Page

Add a button to create case sheet directly from a visit:

```typescript
// In visit details page
<Link
    href={`/dashboard/doctor/case-sheets/new?visitId=${visit.id}&patientId=${visit.patient_id}`}
    className="px-4 py-2 bg-blue-600 text-white rounded-xl"
>
    📋 Create Case Sheet
</Link>
```

---

## Print Styling

Add print styles to `globals.css`:

```css
@media print {
    /* Hide navigation, sidebar, etc. */
    nav, aside, .no-print {
        display: none !important;
    }
    
    /* Full width for case sheet */
    .print-content {
        width: 100%;
        max-width: none;
    }
    
    /* Page breaks */
    .page-break {
        page-break-after: always;
    }
    
    /* Print-friendly colors */
    body {
        background: white;
        color: black;
    }
}
```

---

## For Nurse Dashboard

Nurses should see:
- **Read-only view** of case sheets
- **Add progress notes** button
- **Acknowledge events** interface
- **Vital signs chart** entry

```typescript
// Simplified nurse view
<CaseSheetViewer
    caseSheet={caseSheet}
    patientInfo={patientInfo}
    onEdit={undefined} // No edit for nurses
    onPrint={() => window.print()}
/>

{/* Add progress note section */}
<AddProgressNoteForm caseSheetId={caseSheet.id} />

{/* Pending acknowledgments */}
<NursePendingTasks caseSheetId={caseSheet.id} />
```

---

## Testing Checklist

- [ ] Doctor can create comprehensive case sheet (all 11 sections)
- [ ] Doctor can edit existing case sheet
- [ ] Doctor can view case sheet in read-only mode
- [ ] Nurse can view case sheet
- [ ] Nurse can add progress notes
- [ ] Nurse can acknowledge events
- [ ] Case sheet prints properly
- [ ] All fields save correctly
- [ ] Validation works (required fields)
- [ ] Navigation between sections works
- [ ] Data persists after refresh

---

## Next Steps

1. **Start Docker**: `docker compose up -d`
2. **Run Migration**: `cd backend && alembic upgrade head`
3. **Test Backend**: Create case sheet via API
4. **Add Frontend Routes**: Create the pages above
5. **Test Full Workflow**: Create → Edit → View → Print
6. **Add to Other Roles**: Manager, Admin views

---

**Document Version**: 1.0  
**Created**: October 29, 2025
