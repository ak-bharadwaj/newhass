'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { Appointment, Patient } from '@/lib/api'

interface TimeSlot {
  time: string
  hour: number
  appointment?: Appointment | null
}

export default function DoctorAppointmentsPage() {
  const { token, user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Record<string, Patient>>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [view, setView] = useState<'timeline' | 'list'>('timeline')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate time slots from 8 AM to 6 PM
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []
    for (let hour = 8; hour <= 18; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      const dayAppointments = appointments.filter(apt => {
        const aptDate = apt.scheduled_at.split('T')[0]
        const aptTime = new Date(apt.scheduled_at).getHours()
        return aptDate === selectedDate && aptTime === hour
      })
      slots.push({
        time,
        hour,
        appointment: dayAppointments[0] ?? null
      })
    }
    return slots
  }

  const timeSlots = generateTimeSlots()
  const todayAppointments = useMemo(() => appointments.filter(apt => apt.scheduled_at.split('T')[0] === selectedDate), [appointments, selectedDate])

  const stats = useMemo(() => ({
    total: todayAppointments.length,
    scheduled: todayAppointments.filter(a => a.status === 'scheduled').length,
    confirmed: todayAppointments.filter(a => a.status === 'confirmed').length,
    completed: todayAppointments.filter(a => a.status === 'completed').length
  }), [todayAppointments])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-300'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPatientName = (patientId: string) => {
    const p = patients[patientId]
    if (!p) return 'Unknown Patient'
    return `${p.first_name} ${p.last_name}`
  }

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const params: any = { hospital_id: user?.hospital_id }
        // doctor filter if user is a doctor
        if (user?.role_name === 'doctor') params.doctor_id = user.id
        const appts = await apiClient.getAppointments(token, params)
        if (cancelled) return
        setAppointments(appts)

        // Collect unique patient ids and fetch their brief info via getPatient
        const unique = Array.from(new Set(appts.map(a => a.patient_id))).slice(0, 50)
        const map: Record<string, Patient> = {}
        await Promise.all(unique.map(async (id) => {
          try {
            const p = await apiClient.getPatient(id, token)
            map[id] = p
          } catch { /* ignore individual failures */ }
        }))
        if (!cancelled) setPatients(map)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load appointments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [token, user])

  return (
    <EnterpriseDashboardLayout role="doctor">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/doctor" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            📅 My Appointments
          </h1>
          <p className="text-gray-600">Manage your daily schedule with time slot view</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Today', value: stats.total, color: 'from-blue-500 to-indigo-500', icon: '📋' },
            { label: 'Scheduled', value: stats.scheduled, color: 'from-purple-500 to-pink-500', icon: '🕐' },
            { label: 'Confirmed', value: stats.confirmed, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Completed', value: stats.completed, color: 'from-gray-500 to-slate-500', icon: '✔️' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-3xl`}>
                  {stat.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6 items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setView('timeline')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                view === 'timeline' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
              }`}
            >
              📊 Timeline View
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                view === 'list' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
              }`}
            >
              📋 List View
            </button>
          </div>
        </div>

        {/* Timeline View */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800">{error}</div>
        )}
        {view === 'timeline' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold mb-6">🕐 Time Slot Schedule</h3>
            <div className="space-y-3">
              {timeSlots.map((slot, index) => (
                <motion.div
                  key={slot.time}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center p-4 rounded-xl border-2 transition-all ${
                    slot.appointment
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:shadow-md cursor-pointer'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => slot.appointment && setSelectedAppointment(slot.appointment)}
                >
                  <div className="w-24 flex-shrink-0">
                    <span className="text-lg font-bold text-gray-700">{slot.time}</span>
                  </div>
                  <div className="w-2 h-12 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mx-4"></div>
                  {slot.appointment ? (
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          👤 {getPatientName(slot.appointment.patient_id)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Type: {slot.appointment.appointment_type} | Duration: {slot.appointment.duration_minutes} mins
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${getStatusColor(slot.appointment.status)}`}>
                        {slot.appointment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 text-gray-400 italic">
                      Available slot
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Patient</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Duration</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAppointments.map((appointment, index) => (
                  <motion.tr
                    key={appointment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedAppointment(appointment)}
                  >
                    <td className="px-6 py-4 font-mono text-sm">{new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-4 font-semibold">{getPatientName(appointment.patient_id)}</td>
                    <td className="px-6 py-4 capitalize">{appointment.appointment_type}</td>
                    <td className="px-6 py-4">{appointment.duration_minutes} mins</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(appointment.status)}`}>
                        {appointment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Appointment Details Modal */}
        {selectedAppointment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAppointment(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6">Appointment Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Patient</p>
                  <p className="text-lg font-bold">{getPatientName(selectedAppointment.patient_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Date & Time</p>
                  <p className="text-lg font-bold">{new Date(selectedAppointment.scheduled_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Type</p>
                  <p className="text-lg font-bold capitalize">{selectedAppointment.appointment_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Duration</p>
                  <p className="text-lg font-bold">{selectedAppointment.duration_minutes} minutes</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Status</p>
                  <span className={`inline-block px-4 py-2 rounded-xl text-sm font-bold border-2 ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
