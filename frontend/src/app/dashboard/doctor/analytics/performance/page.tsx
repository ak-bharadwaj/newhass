'use client'

import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import apiClient, { type Appointment } from '@/lib/api'

export default function DoctorAnalyticsPerformancePage() {
  const { token, user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token) return
      setLoading(true); setError('')
      try {
        const start = new Date(); start.setDate(1)
        const a = await apiClient.getAppointments(token, {
          hospital_id: user?.hospital_id,
          doctor_id: user?.id,
          start_date: start.toISOString(),
          end_date: new Date().toISOString(),
          limit: 200,
        })
        if (!ignore) setAppointments(a)
      } catch (e: any) {
        if (!ignore) setError('Failed to load performance metrics')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token, user?.id, user?.hospital_id])

  const { totalAppointments, completionRate, avgDuration } = useMemo(() => {
    const total = appointments.length
    const completed = appointments.filter(a => (a as any).status === 'completed').length
    const rate = total ? ((completed / total) * 100) : null
    const durations = appointments.map(a => a.duration_minutes).filter((n): n is number => typeof n === 'number')
    const avg = durations.length ? Math.round(durations.reduce((s, n) => s + n, 0) / durations.length) : null
    return { totalAppointments: total, completionRate: rate, avgDuration: avg }
  }, [appointments])

  return (
    <EnterpriseDashboardLayout role="doctor">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/doctor" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Metrics</h1>
            <p className="text-gray-600 mt-1">Track your professional performance indicators</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Appointments', value: totalAppointments, icon: '📅', color: 'from-blue-500 to-indigo-500' },
              { label: 'Completion Rate', value: completionRate != null ? `${completionRate.toFixed(1)}%` : '—', icon: '✅', color: 'from-green-500 to-emerald-500' },
              { label: 'Avg Duration', value: avgDuration != null ? `${avgDuration} min` : '—', icon: '⏱️', color: 'from-purple-500 to-pink-500' },
              { label: 'Patient Rating', value: '—', icon: '⭐', color: 'from-yellow-500 to-orange-500' }
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
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Monthly Performance</h3>
            <p className="text-gray-600">No time-series analytics available yet.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Key Achievements</h3>
            <p className="text-gray-600">No achievements data available.</p>
          </div>
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
