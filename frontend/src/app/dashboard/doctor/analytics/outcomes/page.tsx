'use client'

import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import apiClient, { type Appointment, type PatientWithVitals } from '@/lib/api'

export default function DoctorAnalyticsOutcomesPage() {
  const { token, user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token) return
      setLoading(true); setError('')
      try {
        const start = new Date(); start.setDate(1)
        const [a, p] = await Promise.all([
          apiClient.getAppointments(token, {
            hospital_id: user?.hospital_id,
            doctor_id: user?.id,
            start_date: start.toISOString(),
            end_date: new Date().toISOString(),
            limit: 200,
          }),
          apiClient.getMyPatients(token),
        ])
        if (!ignore) { setAppointments(a); setPatients(p) }
      } catch (e: any) {
        if (!ignore) setError('Failed to load outcomes')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token, user?.id, user?.hospital_id])

  const completedAppointments = useMemo(() => appointments.filter(a => (a as any).status === 'completed'), [appointments])
  const patientById = useMemo(() => {
    const m = new Map<number | string, PatientWithVitals>()
    patients.forEach(p => m.set(p.id as any, p))
    return m
  }, [patients])

  return (
    <EnterpriseDashboardLayout role="doctor">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/doctor" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Treatment Outcomes</h1>
            <p className="text-gray-600 mt-1">Track treatment success and patient recovery</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Completed Consultations', value: completedAppointments.length, icon: '🎯', color: 'from-green-500 to-emerald-500' },
              { label: 'Total Patients', value: patients.length, icon: '👥', color: 'from-blue-500 to-indigo-500' },
              { label: 'Avg Recovery', value: '—', icon: '⏱️', color: 'from-purple-500 to-pink-500' },
              { label: 'Satisfaction', value: '—', icon: '⭐', color: 'from-yellow-500 to-orange-500' }
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

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Treatment Outcomes</h3>
          {completedAppointments.length === 0 ? (
            <p className="text-gray-600">No completed consultations in the selected period.</p>
          ) : (
            <div className="space-y-3">
              {completedAppointments.slice(0, 8).map((apt) => {
                const patient = patientById.get((apt as any).patient_id)
                return (
                  <div key={apt.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}</p>
                        <p className="text-sm text-gray-600">{(apt as any).appointment_type || 'Consultation'}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Completed</span>
                        <p className="text-sm text-gray-600 mt-1">{new Date((apt as any).scheduled_at || (apt as any).created_at || '').toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
