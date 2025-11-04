'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type CaseSheetResponse } from '@/lib/api'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { FeedbackButton } from '@/components/common/FeedbackButton'

export default function DoctorCaseSheetsPage() {
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

  if (!user || user.role_name !== 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be a doctor to access case sheets.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
        <DashboardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-error-600 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard/doctor">
            <FeedbackButton variant="primary">Back to Dashboard</FeedbackButton>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="glass bg-white/80 backdrop-blur-xl border-b border-white/50 sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Case Sheets</h1>
            <p className="text-sm text-gray-600 mt-1">Comprehensive inpatient case sheets</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/doctor">
              <FeedbackButton variant="ghost">Doctor Home</FeedbackButton>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {caseSheets.length === 0 ? (
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-12 border border-white/50 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Case Sheets</h2>
            <p className="text-gray-600">No inpatient case sheets found.</p>
          </div>
        ) : (
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
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
                      <td className="px-4 py-3 font-medium text-gray-900">{cs.case_number}</td>
                      <td className="px-4 py-3 text-gray-700">{cs.patient_id}</td>
                      <td className="px-4 py-3 text-gray-700">{new Date(cs.admission_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-700 truncate max-w-[300px]">{cs.chief_complaint}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/doctor/case-sheets/${cs.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
