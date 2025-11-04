'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { apiClient, type Appointment } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function ManagerAppointmentsPage() {
  const { token, user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    let isActive = true
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const start = new Date(selectedDate + 'T00:00:00')
        const end = new Date(selectedDate + 'T23:59:59')
        const params: any = {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          limit: 500,
        }
        if (user?.hospital_id) params.hospital_id = user.hospital_id
        const data = await apiClient.getAppointments(token, params)
        if (!isActive) return
        setAppointments(data)
      } catch (e: any) {
        if (!isActive) return
        setError(e?.message || 'Failed to load appointments')
      } finally {
        if (isActive) setLoading(false)
      }
    }
    load()
    return () => { isActive = false }
  }, [token, user?.hospital_id, selectedDate])

  // Group appointments by time slot
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + i
    return `${hour.toString().padStart(2, '0')}:00`
  })

  const getAppointmentsByTimeSlot = (time: string) => {
    const hour = parseInt(time.split(':')[0], 10)
    return appointments.filter(apt => new Date(apt.scheduled_at).getHours() === hour)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300'
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const stats = useMemo(() => ({
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length
  }), [appointments])

  return (
    <EnterpriseDashboardLayout role="manager">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/manager" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
            <p className="text-gray-600 mt-1">Overview of all appointments</p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg font-bold"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total', value: stats.total, color: 'from-blue-500 to-indigo-500', icon: '📅' },
            { label: 'Scheduled', value: stats.scheduled, color: 'from-purple-500 to-pink-500', icon: '⏰' },
            { label: 'Completed', value: stats.completed, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Cancelled', value: stats.cancelled, color: 'from-red-500 to-rose-500', icon: '❌' }
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

        {/* Timeline View */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📅 Daily Schedule</h2>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading schedule…</div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : (
          <div className="space-y-2">
            {timeSlots.map((time, index) => {
              const appointments = getAppointmentsByTimeSlot(time)
              return (
                <motion.div
                  key={time}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-xl border-2 ${
                    appointments.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 text-center">
                      <p className="text-lg font-bold text-gray-900">{time}</p>
                    </div>
                    <div className="flex-1">
                      {appointments.length === 0 ? (
                        <p className="text-gray-400 italic">No appointments</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {appointments.map((apt) => (
                            <div
                              key={apt.id}
                              className={`p-3 rounded-lg border-2 ${getStatusColor(apt.status)}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-bold">{apt.patient_name}</p>
                                  <p className="text-sm">Dr. {apt.doctor_name}</p>
                                  <p className="text-xs mt-1">{apt.appointment_type}</p>
                                </div>
                                <span className="text-2xl">
                                  {apt.status === 'completed' ? '✅' : apt.status === 'cancelled' ? '❌' : '⏰'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
          )}
        </div>

        {/* Doctor Workload */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">👨‍⚕️ Doctor Workload</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from(new Set(appointments.map(a => a.doctor_name))).slice(0, 6).map((doctor, index) => {
              const doctorApts = appointments.filter(a => a.doctor_name === doctor)
              return (
                <div key={index} className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                  <p className="font-bold text-gray-900">{doctor}</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{doctorApts.length}</p>
                  <p className="text-sm text-gray-600">appointments</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
