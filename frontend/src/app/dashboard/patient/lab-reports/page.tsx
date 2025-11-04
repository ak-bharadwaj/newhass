'use client'

import { useEffect, useMemo, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type LabTest, type Patient } from '@/lib/api'

export default function PatientLabReports() {
  const { user, token } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<LabTest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token || !user) return
      setLoading(true); setError('')
      try {
        let patientId = user.id
        if (user.email) {
          const search = await apiClient.searchPatientGlobal(user.email, 'email', token).catch(() => null)
          if (search?.id) patientId = search.id
        }
        const [p, tests] = await Promise.all([
          apiClient.getPatient(patientId, token).catch(() => null),
          apiClient.getPatientLabTests(patientId, token).catch(() => []),
        ])
        if (!ignore) { setPatient(p); setLabTests(tests) }
      } catch (e: any) {
        if (!ignore) setError('Failed to load your lab reports')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token, user?.id, user?.email])

  const filteredReports = useMemo(() => {
    if (filterStatus === 'all') return labTests
    return labTests.filter(test => test.status === filterStatus)
  }, [labTests, filterStatus])

  const stats = useMemo(() => ({
    pending: labTests.filter(t => t.status === 'requested' || t.status === 'pending' || t.status === 'accepted').length,
    completed: labTests.filter(t => t.status === 'completed').length,
    total: labTests.length
  }), [labTests])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
      case 'pending':
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch ((category || '').toLowerCase()) {
      case 'blood': return '🩸'
      case 'urine': return '💧'
      case 'imaging': return '📷'
      case 'biopsy': return '🔬'
      default: return '🧪'
    }
  }

  return (
    <EnterpriseDashboardLayout role="patient">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/patient" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lab Reports</h1>
            <p className="text-gray-600 mt-1">View your laboratory test results</p>
          </div>
        </div>

        {/* Patient Info Banner */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h2 className="text-2xl font-bold">{patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}</h2>
              <p className="text-white/80">{patient ? `MRN: ${patient.mrn}` : '—'}</p>
            </div>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
          </div>
        ) : (
        <>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Pending', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
            { label: 'Completed', value: stats.completed, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Total Tests', value: stats.total, color: 'from-teal-500 to-cyan-500', icon: '🧪' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">{stat.label}</p>
                  <p className="text-4xl font-bold">{stat.value}</p>
                </div>
                <span className="text-5xl opacity-20">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full md:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none"
          >
            <option value="all">All Reports</option>
            <option value="requested">Requested</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Lab Reports List */}
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <span className="text-6xl mb-4 block">🧪</span>
              <p className="text-gray-500">No lab reports found</p>
            </div>
          ) : (
            filteredReports.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedReport(test)}
                className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-teal-300 hover:shadow-xl transition-all p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-3xl">
                      {getCategoryIcon(test.test_type)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{test.test_type}</h3>
                      <p className="text-gray-600">{test.urgency || '—'}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-xs font-bold ${getStatusColor(test.status)}`}>
                    {test.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">📅 Ordered Date</p>
                    <p className="font-bold text-gray-900">{new Date(test.requested_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">👨‍⚕️ Ordered By</p>
                    <p className="font-bold text-gray-900">{test.requested_by_name}</p>
                  </div>
                  {test.completed_at && (
                    <div>
                      <p className="text-gray-500 mb-1">✅ Completed</p>
                      <p className="font-bold text-gray-900">{new Date(test.completed_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {test.status === 'completed' && (
                  <div className="mt-4">
                    {test.result_file_url ? (
                      <a
                        href={test.result_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold hover:from-teal-700 hover:to-cyan-700 transition-all"
                      >
                        📄 View Full Report
                      </a>
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-center text-gray-600">
                        Report file is not available
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Lab Report Details Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold">Lab Report Details</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-3xl">
                    {getCategoryIcon(selectedReport.test_type)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedReport.test_type}</h3>
                    <p className="text-gray-600">{selectedReport.urgency || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">📅 Ordered Date</p>
                    <p className="font-bold text-gray-900">{new Date(selectedReport.requested_at).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">👨‍⚕️ Ordered By</p>
                    <p className="font-bold text-gray-900">{selectedReport.requested_by_name}</p>
                  </div>
                  {selectedReport.completed_at && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-gray-600 text-sm mb-1">✅ Completed Date</p>
                      <p className="font-bold text-gray-900">{new Date(selectedReport.completed_at).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">📊 Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {selectedReport.status === 'completed' && (
                  <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                    <h4 className="font-bold text-gray-900 mb-3">📊 Test Results</h4>
                    <p className="text-gray-700">{selectedReport.result_summary || 'Results are available. Please consult with your physician for detailed interpretation.'}</p>
                    {selectedReport.result_file_url && (
                      <a
                        href={selectedReport.result_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 block text-center w-full px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                      >
                        📥 Download PDF Report
                      </a>
                    )}
                  </div>
                )}

                {(selectedReport.status === 'pending' || selectedReport.status === 'requested' || selectedReport.status === 'accepted') && (
                  <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                    <p className="text-yellow-900 font-bold">⏳ Test is pending. Results will be available soon.</p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
