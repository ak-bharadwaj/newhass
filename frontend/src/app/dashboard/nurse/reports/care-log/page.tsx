'use client'

import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { apiClient, type NurseLog, type PatientWithVitals } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function NurseReportsCareLogPage() {
  const { token } = useAuth()
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [logs, setLogs] = useState<Array<NurseLog & { patient_name?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const nursePatients = await apiClient.getNursePatients(token)
        if (!isActive) return
        setPatients(nursePatients)
        // limit to first 8 patients to avoid too many requests
        const subset = nursePatients.slice(0, 8)
        const results = await Promise.all(
          subset.map(async (p) => {
            try {
              const plogs = await apiClient.getPatientNurseLogs(p.id, token, 5)
              return plogs.map(l => ({ ...l, patient_name: `${p.first_name} ${p.last_name}` }))
            } catch {
              return [] as Array<NurseLog & { patient_name?: string }>
            }
          })
        )
        if (!isActive) return
        setLogs(results.flat().sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()))
      } catch (e: any) {
        if (!isActive) return
        setError(e?.message || 'Failed to load care logs')
      } finally {
        if (isActive) setLoading(false)
      }
    }
    load()
    return () => { isActive = false }
  }, [token])

  const stats = useMemo(() => ({
    total: logs.length,
  }), [logs])

  return (
    <EnterpriseDashboardLayout role="nurse">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/nurse" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Care Log</h1>
            <p className="text-gray-600 mt-1">Detailed record of patient care activities</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Care Activities', value: stats.total, icon: '📝', color: 'from-blue-500 to-indigo-500' },
          ].map((stat, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}>
              <div className="flex items-center justify-between">
                <div><p className="text-white/80 text-sm mb-1">{stat.label}</p><p className="text-4xl font-bold">{stat.value}</p></div>
                <span className="text-5xl opacity-20">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Care Activities</h3>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading care logs…</div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No care activities found</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <motion.div key={`${log.id}-${index}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.02 }}
                  className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{log.patient_name || log.patient_id}</p>
                      <p className="text-sm text-gray-600 mt-1">{log.log_type}</p>
                      <p className="text-xs text-gray-500 mt-2">{log.content}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{new Date(log.logged_at).toLocaleTimeString()}</p>
                      <p className="text-xs text-gray-600">{new Date(log.logged_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
