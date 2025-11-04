'use client'

import { useEffect, useMemo, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type Appointment, type Patient } from '@/lib/api'

export default function PatientAppointments() {
  const { user, token } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token || !user) return
      setLoading(true); setError('')
      try {
        // Resolve patient id via email if possible, fallback to user.id
        let patientId = user.id
        if (user.email) {
          const search = await apiClient.searchPatientGlobal(user.email, 'email', token).catch(() => null)
          if (search?.id) patientId = search.id
        }
        const [p, a] = await Promise.all([
          apiClient.getPatient(patientId, token).catch(() => null),
          apiClient.getAppointments(token, { patient_id: patientId }).catch(() => []),
        ])
        if (!ignore) { setPatient(p); setAppointments(a) }
      } catch (e: any) {
        if (!ignore) setError('Failed to load your appointments')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token, user?.id, user?.email])

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => filterStatus === 'all' ? true : apt.status === filterStatus)
  }, [appointments, filterStatus])

  const stats = useMemo(() => ({
    upcoming: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    total: appointments.length,
  }), [appointments])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'checked_in': return 'bg-indigo-100 text-indigo-800'
      case 'in_progress': return 'bg-purple-100 text-purple-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'no_show': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <EnterpriseDashboardLayout role="patient">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallbackUrl="/dashboard/patient" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
              <p className="text-gray-600 mt-1">View and manage your appointments</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg"
          >
            📅 Book New Appointment
          </motion.button>
        </div>

        {/* Patient Info Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 shadow-lg">
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
  ) : (
  <>
  {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Upcoming', value: stats.upcoming, color: 'from-blue-500 to-indigo-500', icon: '📅' },
            { label: 'Completed', value: stats.completed, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Total', value: stats.total, color: 'from-purple-500 to-pink-500', icon: '📊' }
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
            className="w-full md:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Appointments</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="checked_in">Checked In</option>
            <option value="in_progress">In Progress</option>
            <option value="no_show">No Show</option>
          </select>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <span className="text-6xl mb-4 block">📅</span>
              <p className="text-gray-500">No appointments found</p>
            </div>
          ) : (
            filteredAppointments.map((apt, index) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedAppointment(apt)}
                className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-2xl">
                      👨‍⚕️
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{apt.doctor_name}</h3>
                      <p className="text-gray-600">{apt.appointment_type}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-xs font-bold ${getStatusColor(apt.status)}`}>
                    {apt.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">📅 Date</p>
                    <p className="font-bold text-gray-900">{new Date(apt.scheduled_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">🕐 Time</p>
                    <p className="font-bold text-gray-900">{new Date(apt.scheduled_at).toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">📍 Location</p>
                    <p className="font-bold text-gray-900">{apt.hospital_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">⏱️ Duration</p>
                    <p className="font-bold text-gray-900">{apt.duration_minutes} min</p>
                  </div>
                </div>

                {(apt as any).notes && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">📝 {(apt as any).notes}</p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

  {/* Appointment Details Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold">Appointment Details</h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-3xl">
                    👨‍⚕️
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedAppointment.doctor_name}</h3>
                    <p className="text-gray-600">{selectedAppointment.appointment_type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-500 mb-1">📅 Date & Time</p>
                    <p className="font-bold text-gray-900">{new Date(selectedAppointment.scheduled_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">⏱️ Duration</p>
                    <p className="font-bold text-gray-900">{selectedAppointment.duration_minutes} min</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">🏥 Hospital</p>
                    <p className="font-bold text-gray-900">{selectedAppointment.hospital_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">📄 Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {(selectedAppointment as any).notes && (
                  <div>
                    <p className="text-gray-500 mb-1">📝 Notes</p>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">{(selectedAppointment as any).notes}</div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    Close
                  </button>
                </div>
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
