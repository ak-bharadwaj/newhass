'use client'

import { useEffect, useMemo, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type PatientWithVitals } from '@/lib/api'

export default function DoctorPatientAnalytics() {
  const { token } = useAuth()
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token) return
      setLoading(true); setError('')
      try {
        const p = await apiClient.getMyPatients(token)
        if (!ignore) setPatients(p)
      } catch (e: any) {
        if (!ignore) setError('Failed to load patients')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token])

  const totals = useMemo(() => {
    const total = patients.length
    const active = patients.filter(p => p.active_visit_id).length
    return { total, active }
  }, [patients])

  const patientsByAgeGroup = useMemo(() => {
    const groups = [
      { range: '0-18', count: 0 },
      { range: '19-35', count: 0 },
      { range: '36-50', count: 0 },
      { range: '51-65', count: 0 },
      { range: '65+', count: 0 },
    ]
    const calcAge = (dob: string) => {
      const d = new Date(dob); const now = new Date()
      let age = now.getFullYear() - d.getFullYear()
      const m = now.getMonth() - d.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
      return age
    }
    patients.forEach(p => {
      if (!p.date_of_birth) return
      const age = calcAge(p.date_of_birth)
      if (age <= 18) groups[0].count++
      else if (age <= 35) groups[1].count++
      else if (age <= 50) groups[2].count++
      else if (age <= 65) groups[3].count++
      else groups[4].count++
    })
    const total = patients.length || 1
    return groups.map(g => ({ ...g, percentage: Math.round((g.count / total) * 100) }))
  }, [patients])

  return (
    <EnterpriseDashboardLayout role="doctor">
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Analytics</h1>
            <p className="text-gray-600 mt-2">Comprehensive insights into your patient population</p>
          </div>
          {/* No filters yet */}
        </div>

        {/* Stats Grid */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Patients', value: totals.total, icon: '👥', color: 'from-blue-500 to-indigo-500' },
              { label: 'Active Cases', value: totals.active, icon: '📋', color: 'from-green-500 to-emerald-500' },
              { label: 'Avg Recovery Time', value: '—', icon: '⏱️', color: 'from-purple-500 to-pink-500' },
              { label: 'Patient Satisfaction', value: '—', icon: '⭐', color: 'from-yellow-500 to-orange-500' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br rounded-2xl p-6 text-white shadow-lg"
                style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">{stat.label}</p>
                    <div className="flex items-baseline space-x-2 mt-3">
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    {stat.icon}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Age Distribution */}
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Patient Age Distribution</h2>
              <span className="text-sm text-gray-500">Total: {totals.total} patients</span>
            </div>
            <div className="space-y-4">
              {patientsByAgeGroup.map((group) => (
                <div key={group.range} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-700">{group.range} years</span>
                    <span className="text-gray-600">{group.count} ({group.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${group.percentage}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Conditions */}
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Top Conditions</h2>
              <span className="text-sm text-gray-500">No diagnosis data available</span>
            </div>
            <p className="text-gray-600">This insight requires diagnosis coding data. Not available yet.</p>
          </div>
        </div>

        {/* Additional insights not available */}
      </div>
    </EnterpriseDashboardLayout>
  )
}
