'use client'

import { useEffect, useMemo, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type CaseSheetResponse } from '@/lib/api'
import Link from 'next/link'
import { Modal } from '@/components/dashboard/Modal'

interface PendingItem {
  caseSheet: CaseSheetResponse
  index: number
  event: any
}

export default function DischargeRequestsPage() {
  const { token, user } = useAuth()
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [itemToReject, setItemToReject] = useState<PendingItem | null>(null)

  const hospitalId = user?.hospital_id

  useEffect(() => {
    const run = async () => {
      if (!token || !hospitalId) return
      setLoading(true)
      setError(null)
      try {
        // Load recent case sheets for this hospital
        const caseSheets = await apiClient.getCaseSheets(token, { hospitalId, limit: 100 })
        // For each, check pending acknowledgments and filter discharge_request
        const pending = await Promise.all(
          caseSheets.map(async (cs) => {
            try {
              const p = await apiClient.getPendingAcknowledgments(token, cs.id)
              const matches = (p.pending_events || [])
                .filter((pe: any) => pe?.event?.event_type === 'discharge_request')
                .map((pe: any) => ({ caseSheet: cs, index: pe.index, event: pe.event }))
              return matches
            } catch {
              return []
            }
          })
        )
        setItems(pending.flat())
      } catch (e: any) {
        setError(e?.message || 'Failed to load discharge requests')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [token, hospitalId])

  const handleApprove = async (it: PendingItem) => {
    if (!token) return
    const visitId = it.caseSheet.visit_id
    setActionId(`${it.caseSheet.id}-${it.index}`)
    try {
      // Finalize discharge in backend
      const res = await fetch(`${(apiClient as any)['baseURL']}/api/v1/visits/${visitId}/discharge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ discharge_summary: it.event?.event_data?.discharge_summary || 'Discharged by reception' })
      })
      if (!res.ok) throw new Error('Failed to finalize discharge')
      // Acknowledge the request event
      await apiClient.acknowledgeCaseSheetEvent(token, it.caseSheet.id, { event_index: it.index, acknowledgment_notes: 'Approved and discharged by Reception' })
      // Remove from list
      setItems(prev => prev.filter(p => !(p.caseSheet.id === it.caseSheet.id && p.index === it.index)))
    } catch (e) {
      console.error(e)
      setError((e as any)?.message || 'Failed to approve discharge')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = (it: PendingItem) => {
    setItemToReject(it)
    setRejectNotes('')
    setShowRejectModal(true)
  }

  const handleConfirmReject = async () => {
    if (!token || !itemToReject) return
    const it = itemToReject
    setActionId(`${it.caseSheet.id}-${it.index}`)
    try {
      await apiClient.acknowledgeCaseSheetEvent(token, it.caseSheet.id, { event_index: it.index, acknowledgment_notes: rejectNotes || 'Rejected by Reception' })
      setItems(prev => prev.filter(p => !(p.caseSheet.id === it.caseSheet.id && p.index === it.index)))
      setShowRejectModal(false)
      setItemToReject(null)
      setRejectNotes('')
    } catch (e) {
      console.error(e)
      setError((e as any)?.message || 'Failed to reject request')
    } finally {
      setActionId(null)
    }
  }

  return (
    <EnterpriseDashboardLayout role="reception">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Discharge Requests</h1>
          <Link href="/dashboard/reception" className="text-sm text-primary-600 hover:underline">Back to Reception</Link>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="h-40 flex items-center justify-center text-gray-500 text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">No pending discharge requests.</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={`${it.caseSheet.id}-${it.index}`} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{it.event?.description || 'Discharge request'}</div>
                    <div className="mt-1 text-xs text-gray-600">MRN {it.caseSheet.case_number || it.event?.event_data?.mrn || '-'} • Case #{it.caseSheet.id.slice(0,8)}</div>
                    <div className="mt-1 text-xs text-gray-500 max-w-2xl">{it.event?.event_data?.discharge_summary}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button disabled={actionId === `${it.caseSheet.id}-${it.index}`}
                      onClick={() => handleApprove(it)}
                      className="px-3 py-1.5 text-xs rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 disabled:opacity-60">Approve & Discharge</button>
                    <button disabled={actionId === `${it.caseSheet.id}-${it.index}`}
                      onClick={() => handleReject(it)}
                      className="px-3 py-1.5 text-xs rounded-md bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 disabled:opacity-60">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Discharge Request Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setItemToReject(null) }}
        title="Reject Discharge Request"
        size="md"
        footer={
          <>
            <button onClick={() => { setShowRejectModal(false); setItemToReject(null) }} className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700">Cancel</button>
            <button onClick={handleConfirmReject} disabled={!rejectNotes} className="px-3 py-1.5 rounded-md bg-red-600 text-white disabled:opacity-60">Reject</button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleConfirmReject() }} className="space-y-4">
          <div className="text-sm text-gray-600">Please provide a reason for rejection. This will be recorded in the case sheet acknowledgment.</div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
            <textarea
              required
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Missing discharge summary details, pending lab results, etc."
            />
          </div>
        </form>
      </Modal>
    </EnterpriseDashboardLayout>
  )
}
