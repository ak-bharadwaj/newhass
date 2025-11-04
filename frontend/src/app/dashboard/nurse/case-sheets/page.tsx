'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { StandardCard, StandardDashboardLayout } from '@/components/dashboard/StandardGridLayout'
import { apiClient, type CaseSheetResponse } from '@/lib/api'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { FeedbackButton } from '@/components/common/FeedbackButton'

export default function NurseCaseSheetsPage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caseSheets, setCaseSheets] = useState<CaseSheetResponse[]>([])

  useEffect(() => {
    if (!token) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiClient.getCaseSheets(token, { limit: 100 })
        setCaseSheets(data)
      } catch (e: any) {
        setError(e?.message || 'Failed to load case sheets')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

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
        <StandardDashboardLayout title="Case Sheets" subtitle="Inpatient case sheets (read-only)">
          <DashboardSkeleton />
        </StandardDashboardLayout>
      </EnterpriseDashboardLayout>
    )
  }

  if (error) {
    return (
      <EnterpriseDashboardLayout role="nurse">
        <StandardDashboardLayout title="Case Sheets">
          <StandardCard className="text-center py-12">
            <h1 className="text-2xl font-bold theme-text-error mb-2">Error</h1>
            <p className="theme-text-secondary mb-4">{error}</p>
            <Link href="/dashboard/nurse">
              <FeedbackButton variant="primary">Back to Dashboard</FeedbackButton>
            </Link>
          </StandardCard>
        </StandardDashboardLayout>
      </EnterpriseDashboardLayout>
    )
  }

  return (
    <EnterpriseDashboardLayout role="nurse">
      <StandardDashboardLayout
        title="Case Sheets"
        subtitle="Inpatient case sheets (read-only)"
        actions={
          <Link href="/dashboard/nurse">
            <FeedbackButton variant="ghost">Nurse Home</FeedbackButton>
          </Link>
        }
      >
        {caseSheets.length === 0 ? (
          <StandardCard className="text-center py-12">
            <h2 className="text-xl font-semibold theme-text-primary mb-2">No Case Sheets</h2>
            <p className="theme-text-secondary">No inpatient case sheets found.</p>
          </StandardCard>
        ) : (
          <StandardCard>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chief Complaint</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white/60 divide-y divide-gray-200">
                  {caseSheets.map((cs) => (
                    <tr key={cs.id} className="hover:bg-white/80">
                      <td className="px-4 py-3 font-medium theme-text-primary">{cs.case_number}</td>
                      <td className="px-4 py-3 theme-text-secondary">{cs.patient_id}</td>
                      <td className="px-4 py-3 theme-text-secondary">{new Date(cs.admission_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 theme-text-secondary truncate max-w-[300px]">{cs.chief_complaint}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/nurse/case-sheets/${cs.id}`} className="theme-btn-primary text-white px-3 py-1 rounded-lg text-sm font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StandardCard>
        )}
      </StandardDashboardLayout>
    </EnterpriseDashboardLayout>
  )
}
