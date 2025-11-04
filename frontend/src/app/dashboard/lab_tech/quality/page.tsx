'use client'

import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient, { type LabTest } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'

export default function LabTechQualityPage() {
  const { token, user } = useAuth()
  const [tests, setTests] = useState<LabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!token) return
      setLoading(true); setError('')
      try {
        const now = new Date()
        const start = new Date(now)
        start.setMonth(now.getMonth() - 1)
        const list = await apiClient.listLabTests(token, {
          hospital_id: user?.hospital_id,
          start_date: start.toISOString(),
          end_date: now.toISOString(),
          limit: 200,
        })
        setTests(list || [])
      } catch (e: any) {
        setError('Failed to load lab quality metrics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const metrics = useMemo(() => {
    const total = tests.length
    const byStatus = tests.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    }, {})
    const byUrgency = tests.reduce<Record<string, number>>((acc, t) => {
      const u = String(t.urgency || 'unknown').toLowerCase()
      acc[u] = (acc[u] || 0) + 1
      return acc
    }, {})
    return { total, byStatus, byUrgency }
  }, [tests])

  return (
    <EnterpriseDashboardLayout role="lab_tech">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/lab_tech" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quality Control</h1>
            <p className="text-gray-600 mt-1">Monitor equipment and test quality</p>
          </div>
        </div>

        {/* Stats derived from real tests */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[ 
              { label: 'Total Tests (30d)', value: metrics.total, color: 'from-blue-500 to-indigo-500', icon: '🧪' },
              { label: 'Completed', value: metrics.byStatus['completed'] || 0, color: 'from-green-500 to-emerald-500', icon: '✅' },
              { label: 'In Progress', value: metrics.byStatus['in_progress'] || 0, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
              { label: 'Pending', value: metrics.byStatus['pending'] || 0, color: 'from-sky-500 to-blue-600', icon: '📋' },
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
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        {/* Recent Test Metrics */}
        <div className="space-y-4">
          {tests.slice(0, 10).map((t, index) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-blue-300 p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{t.test_type}</h3>
                  <p className="text-gray-600">{t.patient_name} {t.patient_mrn ? `| MRN: ${t.patient_mrn}` : ''}</p>
                </div>
                <span className={`px-4 py-2 rounded-xl text-xs font-bold ${getStatusColor(t.status)}`}>
                  {t.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>Urgency: <span className="font-semibold">{String(t.urgency || '').toUpperCase() || 'N/A'}</span></div>
                <div>Requested: {new Date(t.requested_at).toLocaleString()}</div>
              </div>
            </motion.div>
          ))}
          {tests.length === 0 && !loading && (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-lg">No lab tests found for the last 30 days</p>
            </div>
          )}
        </div>

        {/* Removed mock QC widgets; using real lab test data only */}
      </div>
    </EnterpriseDashboardLayout>
  )
}
