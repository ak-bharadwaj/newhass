'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type CaseSheetResponse } from '@/lib/api'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { promiseFeedback } from '@/lib/activityFeedback'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'

export default function NurseCaseSheetDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caseSheet, setCaseSheet] = useState<CaseSheetResponse | null>(null)
  const [note, setNote] = useState('')

  const load = async () => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getCaseSheet(token, id)
      setCaseSheet(data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load case sheet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id])

  const handleAddNote = async () => {
    if (!token || !id || !note.trim()) return
    await promiseFeedback(apiClient.addProgressNote(token, id, { note: note.trim() }), {
      loading: 'Adding note...'
    , success: 'Note added', error: 'Failed to add note' })
    setNote('')
    await load()
  }

  if (!user || user.role_name !== 'nurse') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be a nurse to access case sheets.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <EnterpriseDashboardLayout role="nurse">
        <div className="p-8">
          <DashboardSkeleton />
        </div>
      </EnterpriseDashboardLayout>
    )
  }

  if (error || !caseSheet) {
    return (
      <EnterpriseDashboardLayout role="nurse">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center rounded-2xl p-8 border bg-white/80 backdrop-blur-xl shadow">
            <h1 className="text-2xl font-bold text-error-600 mb-2">Error</h1>
            <p className="text-gray-600 mb-4">{error || 'Case sheet not found'}</p>
            <Link href="/dashboard/nurse/case-sheets">
              <FeedbackButton variant="primary">Back to Case Sheets</FeedbackButton>
            </Link>
          </div>
        </div>
      </EnterpriseDashboardLayout>
    )
  }

  return (
    <EnterpriseDashboardLayout role="nurse">
      <div className="px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Case #{caseSheet.case_number}</h1>
            <p className="text-sm text-gray-600 mt-1">Admission: {new Date(caseSheet.admission_date).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/nurse/case-sheets" className="text-primary-600 hover:text-primary-700 font-medium">All Case Sheets</Link>
          </div>
        </div>

        {/* Summary */}
        <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
            <div><span className="text-gray-500">Patient ID:</span> {caseSheet.patient_id}</div>
            <div><span className="text-gray-500">Visit ID:</span> {caseSheet.visit_id}</div>
            <div><span className="text-gray-500">Chief Complaint:</span> {caseSheet.chief_complaint}</div>
            {caseSheet.final_diagnosis && (
              <div><span className="text-gray-500">Final Diagnosis:</span> {caseSheet.final_diagnosis}</div>
            )}
          </div>
        </div>

        {/* History and Exam */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
            <h3 className="text-md font-semibold text-gray-900 mb-3">History</h3>
            <div className="space-y-2 text-gray-800 text-sm">
              <div><span className="text-gray-500">Present illness:</span><div className="mt-1 whitespace-pre-wrap">{caseSheet.present_illness || '—'}</div></div>
              <div><span className="text-gray-500">Duration of symptoms:</span> {caseSheet.duration_of_symptoms || '—'}</div>
              <div><span className="text-gray-500">Past medical history:</span><pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(caseSheet.past_medical_history || {}, null, 2)}</pre></div>
              <div><span className="text-gray-500">Allergies:</span><pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(caseSheet.allergies || {}, null, 2)}</pre></div>
              <div><span className="text-gray-500">Current medications:</span><pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(caseSheet.current_medications || {}, null, 2)}</pre></div>
            </div>
          </div>
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Examination</h3>
            <div className="space-y-2 text-gray-800 text-sm">
              <div><span className="text-gray-500">General appearance:</span><div className="mt-1 whitespace-pre-wrap">{caseSheet.general_appearance || '—'}</div></div>
              <div><span className="text-gray-500">Vitals on admission:</span><pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(caseSheet.vital_signs_on_admission || {}, null, 2)}</pre></div>
              <div><span className="text-gray-500">Systemic exams:</span>
                <ul className="list-disc ml-6">
                  <li>CVS: {caseSheet.cardiovascular_system || '—'}</li>
                  <li>RS: {caseSheet.respiratory_system || '—'}</li>
                  <li>GIT: {caseSheet.gastrointestinal_system || '—'}</li>
                  <li>CNS: {caseSheet.central_nervous_system || '—'}</li>
                  <li>MSK: {caseSheet.musculoskeletal_system || '—'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Notes (Nurse can add) */}
        <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold text-gray-900">Progress notes</h3>
          </div>
          <div className="space-y-3">
            {(caseSheet.progress_notes || []).length === 0 ? (
              <p className="text-gray-600 text-sm">No progress notes yet.</p>
            ) : (
              (caseSheet.progress_notes || []).map((n: any, idx: number) => (
                <div key={idx} className="rounded border border-gray-200 bg-white/70 p-3">
                  <div className="text-xs text-gray-500">{new Date(n.date).toLocaleString()} • {n.by_user_name} ({n.by_user_role})</div>
                  <div className="mt-1 text-sm whitespace-pre-wrap">{n.note}</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Add note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Write a nursing note..."
            />
            <div className="mt-2">
              <FeedbackButton onClickAsync={handleAddNote} disabled={!note.trim()} variant="primary" loadingText="Adding..." successText="Added!">
                Add Note
              </FeedbackButton>
            </div>
          </div>
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
