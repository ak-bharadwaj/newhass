'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient, { type PatientWithVitals, type Appointment, type Prescription } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function DoctorAnalytics() {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('month')
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [recentPrescriptions, setRecentPrescriptions] = useState<Prescription[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token) return
      setLoading(true); setError('')
      try {
        const start = new Date()
        if (timeframe === 'month') {
          start.setDate(1)
        } else if (timeframe === 'week') {
          const day = start.getDay()
          const diff = (day + 6) % 7 // make Monday start
          start.setDate(start.getDate() - diff)
        } else if (timeframe === 'quarter') {
          const month = start.getMonth()
          const qStart = month - (month % 3)
          start.setMonth(qStart, 1)
        } else if (timeframe === 'year') {
          start.setMonth(0, 1)
        }
        const start_date = start.toISOString()
        const end_date = new Date().toISOString()

        const [p, a, rx] = await Promise.all([
          apiClient.getMyPatients(token),
          apiClient.getAppointments(token, {
            hospital_id: user?.hospital_id,
            doctor_id: user?.id,
            start_date,
            end_date,
            limit: 200,
          }),
          apiClient.listPrescriptions(token, { hospital_id: user?.hospital_id, limit: 200 }),
        ])
        if (!ignore) {
          setPatients(p)
          setAppointments(a)
          setRecentPrescriptions(rx)
        }
      } catch (e: any) {
        if (!ignore) setError('Failed to load analytics')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token, user?.id, user?.hospital_id, timeframe])

  const metrics = useMemo(() => {
    const totalPatients = patients.length
    const activePatients = patients.filter(p => p.active_visit_id).length
    const totalConsultations = appointments.length
    const avgDuration = (() => {
      const withDur = appointments.map(a => a.duration_minutes).filter((n): n is number => typeof n === 'number')
      if (!withDur.length) return null
      return Math.round(withDur.reduce((s, n) => s + n, 0) / withDur.length)
    })()
    return {
      totalPatients,
      activePatients,
      totalConsultations,
      prescriptionsRecent: recentPrescriptions.length,
      avgConsultationTime: avgDuration,
    }
  }, [patients, appointments, recentPrescriptions])

  // No series endpoints yet – show honest empty states for charts

  return (
    <EnterpriseDashboardLayout role="doctor">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/doctor" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Your Analytics
              </h1>
              <p className="text-gray-600">Performance metrics and patient outcomes</p>
            </div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
            )}
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
              {[
                { label: 'Total Patients', value: metrics.totalPatients, color: 'from-blue-500 to-indigo-500', icon: '👥' },
                { label: 'Active Patients', value: metrics.activePatients, color: 'from-green-500 to-emerald-500', icon: '🩺' },
                { label: 'Consultations', value: metrics.totalConsultations, color: 'from-purple-500 to-pink-500', icon: '📋' },
                { label: 'Recent Prescriptions', value: metrics.prescriptionsRecent, color: 'from-orange-500 to-red-500', icon: '💊' },
                { label: 'Avg Time', value: metrics.avgConsultationTime ? `${metrics.avgConsultationTime} min` : '—', color: 'from-yellow-500 to-orange-500', icon: '⏱️' },
                { label: 'Satisfaction', value: '—', color: 'from-teal-500 to-cyan-500', icon: '😊' }
              ].map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
                >
                  <div className="text-center">
                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center text-2xl mb-3`}>
                      {metric.icon}
                    </div>
                    <p className="text-gray-600 text-xs font-medium mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Weekly Consultation Stats - no series data available */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-2xl font-bold mb-2">Weekly Consultations</h2>
                <p className="text-gray-600">No time-series analytics available yet.</p>
              </div>

              {/* Top Diagnoses - not available */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-2xl font-bold mb-2">Top Diagnoses</h2>
                <p className="text-gray-600">This insight requires diagnosis coding data. Not available yet.</p>
              </div>
            </div>

            {/* Patient Outcomes - not available */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-2">Patient Outcomes</h2>
              <p className="text-gray-600">Outcome analytics aren’t available yet.</p>
            </div>
          </>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
