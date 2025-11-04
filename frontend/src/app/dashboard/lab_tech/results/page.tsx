'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient, { type LabTest } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function LabTechResults() {
  const { token, user } = useAuth()
  const [tests, setTests] = useState<LabTest[]>([])
  const [error, setError] = useState('')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadedMap, setUploadedMap] = useState<Record<string, string>>({})

  const testsQuery = useQuery({
    queryKey: ['lab-tests', user?.hospital_id, 'in_progress', token],
    queryFn: async () => {
      if (!token) return [] as LabTest[]
      setError('')
      const list = await apiClient.listLabTests(token, {
        hospital_id: user?.hospital_id,
        status: 'in_progress',
      })
      return list || []
    },
    enabled: !!token,
    refetchInterval: 20000,
  })

  // keep local state in sync for existing rendering logic
  if (testsQuery.data && tests !== testsQuery.data) {
    // shallow compare by length to avoid re-renders; fine for our case
    if (tests.length !== testsQuery.data.length) setTests(testsQuery.data)
  }

  const onUploadFile = async (test: LabTest, file: File) => {
    if (!token) return
    try {
      setUploadingId(test.id)
      const res = await apiClient.uploadLabReport(test.id, file, token)
      setUploadedMap(prev => ({ ...prev, [test.id]: res.result_file_url }))
      // refresh list after successful upload
      testsQuery.refetch()
    } catch (e: any) {
      setError('Failed to upload report')
    } finally {
      setUploadingId(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'STAT': return 'bg-red-100 text-red-800 border-red-300'
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'routine': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <EnterpriseDashboardLayout role="lab_tech">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/lab_tech" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">
            Enter Test Results
          </h1>
          <p className="text-gray-600">Record laboratory test results</p>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Tests Awaiting Results</p>
              <p className="text-4xl font-bold mt-2">{tests.length}</p>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-4xl">
              📝
            </div>
          </div>
        </motion.div>

        {/* Tests List */}
        {testsQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
            )}
            {tests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md p-6 border-2 border-gray-100 hover:border-yellow-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-2xl">
                      🔬
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{test.test_type}</h3>
                      <p className="text-gray-600">{test.patient_name} {test.patient_mrn ? `(MRN: ${test.patient_mrn})` : ''}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">📅 Requested: {new Date(test.requested_at).toLocaleString()}</span>
                        {test.requested_by_name && (
                          <span className="text-sm text-gray-500">👨‍⚕️ {test.requested_by_name}</span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getPriorityColor(String(test.urgency || ''))}`}>
                          {String(test.urgency || '').toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border-2 border-yellow-300">
                          IN PROGRESS
                        </span>
                      </div>
                      {test.notes && (
                        <p className="text-sm text-gray-500 mt-2">📝 {test.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {uploadedMap[test.id] ? (
                      <a href={uploadedMap[test.id]} target="_blank" rel="noreferrer" className="text-green-700 font-semibold underline">View Uploaded Report</a>
                    ) : null}
                    <label className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer">
                      {uploadingId === test.id ? 'Uploading…' : 'Upload Report'}
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onUploadFile(test, file)
                          e.currentTarget.value = ''
                        }}
                        disabled={uploadingId === test.id}
                      />
                    </label>
                  </div>
                </div>
              </motion.div>
            ))}

            {tests.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No tests awaiting results</p>
                <p className="text-gray-400 text-sm mt-2">All tests have been completed or are pending</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Removed text-only result modal. Real flow: upload report file using backend endpoint. */}
      </div>
    </EnterpriseDashboardLayout>
  )
}
