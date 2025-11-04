'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { RegionalBanner } from '@/components/branding/RegionalBanner'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { promiseFeedback } from '@/lib/activityFeedback'
import { apiClient, Appointment, Patient, CreateAppointmentData } from '@/lib/api'
import { PatientSearch } from '@/components/operations/PatientSearch'
import { AppointmentCalendar } from '@/components/operations/AppointmentCalendar'
import { Modal } from '@/components/dashboard/Modal'
import { QRScanner } from '@/components/qr/QRScanner'
import { QRGenerator } from '@/components/qr/QRGenerator'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { useTheme } from '@/lib/themeUtils'
import SectionHeader from '@/components/common/SectionHeader'

export default function ReceptionDashboard() {
  const { user, token } = useAuth()
  const { isDark } = useTheme()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [doctors, setDoctors] = useState<any[]>([])
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    appointment_type: 'consultation' as 'consultation' | 'follow_up' | 'procedure' | 'emergency',
    notes: '',
  })

  useEffect(() => {
    // Load appointments and doctors in parallel for better performance
    const loadData = async () => {
      if (!token || !user?.hospital_id) return
      try {
        setIsLoading(true)
        setError(null)

        // Load appointments and doctors in parallel
        await Promise.all([
          loadAppointments(),
          loadDoctors()
        ])
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [selectedDate])

  const loadAppointments = async () => {
    if (!token || !user?.hospital_id) return
    try {
      setIsLoading(true)
      setError(null)
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)
      const data = await apiClient.getAppointments(token, {
        hospital_id: user.hospital_id,
        start_date: startOfDay.toISOString(),
        end_date: endOfDay.toISOString(),
      })
      setAppointments(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments')
    } finally {
      setIsLoading(false)
    }
  }

  const loadDoctors = async () => {
    if (!token || !user?.hospital_id) return
    try {
      const response = await fetch(`${apiClient['baseURL']}/api/v1/users?hospital_id=${user.hospital_id}&role=doctor`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to load doctors')
      const data = await response.json()
      setDoctors(data)
    } catch (err) {
      console.error('Failed to load doctors:', err)
    }
  }

  const handleBookAppointment = async () => {
    if (!token || !user?.hospital_id) return

    await promiseFeedback(
      (async () => {
        const appointmentDateTime = `${appointmentForm.appointment_date}T${appointmentForm.appointment_time}:00`
  const response = await fetch(`${apiClient['baseURL']}/api/v1/appointments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patient_id: selectedPatient?.id || appointmentForm.patient_id,
            hospital_id: user.hospital_id,
            doctor_id: appointmentForm.doctor_id || null,
            appointment_date: appointmentDateTime,
            appointment_type: appointmentForm.appointment_type,
            notes: appointmentForm.notes,
          }),
        })
        if (!response.ok) throw new Error('Failed to book appointment')
        return response.json()
      })(),
      {
        loading: 'Booking appointment...',
        success: 'Appointment booked successfully!',
        error: 'Failed to book appointment',
      }
    )

    setIsBookingModalOpen(false)
    setSelectedPatient(null)
    setAppointmentForm({
      patient_id: '',
      doctor_id: '',
      appointment_date: '',
      appointment_time: '',
      appointment_type: 'consultation',
      notes: '',
    })
    await loadAppointments()
  }

  const handlePatientSearch = async (query: string): Promise<Patient[]> => {
    if (!token || !user?.hospital_id) return []
    try {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/patients/search?q=${encodeURIComponent(query)}&hospital_id=${user.hospital_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Search failed')
      return await response.json()
    } catch (err) {
      console.error('Search error:', err)
      return []
    }
  }

  const handleCheckIn = async (appointmentId: string) => {
    if (!token) return

    await promiseFeedback(
      apiClient.checkInAppointment(appointmentId, token),
      {
        loading: 'Checking in...',
        success: 'Patient checked in successfully!',
        error: 'Failed to check in',
      }
    )

    await loadAppointments()
  }

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const handleQRScanSuccess = async (result: any) => {
    // Handle successful QR scan - check in patient
    await promiseFeedback(
      (async () => {
        // In real implementation, this would validate and check in the patient
    // console.log('QR Scan result:', result)
        return result
      })(),
      {
        loading: 'Processing check-in...',
        success: 'Patient checked in successfully!',
        error: 'Failed to process check-in',
      }
    )
    setShowQRScanner(false)
    await loadAppointments()
  }

  const handleQRScanError = (error: string) => {
    console.error('QR Scan error:', error)
  }

  if (!user || user.role_name !== 'reception') {
    return (
      <div className="min-h-screen flex items-center justify-center theme-gradient-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 theme-text-primary">Access Denied</h1>
          <p className="theme-text-secondary">You must be reception staff to access this dashboard.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 theme-gradient-bg">
        <DashboardSkeleton />
      </div>
    )
  }

  const todayStats = {
    total: appointments.length,
    checkedIn: appointments.filter(a => ['checked_in', 'in_progress'].includes(a.status)).length,
    pending: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  }

  return (
    <EnterpriseDashboardLayout role="reception">
      <div className="min-h-screen theme-gradient-bg">
      {/* Regional Banner */}
      <RegionalBanner />

      {/* Header */}
      <SectionHeader
        title="Reception Dashboard"
        subtitle={`Welcome, ${user.first_name} ${user.last_name}`}
        chips={[{ label: 'Live', color: 'blue' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
      />

      {/* Actions */}
            {/* Filter bar */}
      <div className="glass backdrop-blur-xl border shadow-lg rounded-2xl p-4 mx-6 theme-glass">
        <div className="container mx-auto px-2">
          <div className="flex items-center gap-3 flex-wrap">
            <FeedbackButton
              onClick={() => setShowQRScanner(true)}
              variant="secondary"
              className="shadow-xl theme-btn-accent px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR Check-in
            </FeedbackButton>
            <FeedbackButton
              onClick={() => setIsBookingModalOpen(true)}
              variant="primary"
              className="shadow-xl theme-btn-primary px-6 py-3 rounded-xl font-semibold"
            >
              + Book Appointment
            </FeedbackButton>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          {[
            { label: 'Total Appointments', value: todayStats.total, color: 'from-blue-500 to-blue-600' },
            { label: 'Checked In', value: todayStats.checkedIn, color: 'from-success-500 to-success-600' },
            { label: 'Pending', value: todayStats.pending, color: 'from-warning-500 to-warning-600' },
            { label: 'Completed', value: todayStats.completed, color: 'from-purple-500 to-purple-600' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              whileHover={{ y: -4, shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
              className={`glass bg-gradient-to-br ${stat.color} backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white`}
            >
              <p className="text-white/80 text-sm font-medium mb-2">{stat.label}</p>
              <p className="text-4xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Appointment Calendar</h2>
                <div className="flex items-center gap-3">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <FeedbackButton
                      onClick={() => handleDateChange(-1)}
                      variant="ghost"
                      className="!p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </FeedbackButton>
                  </motion.div>
                  <div className="text-center min-w-[220px] glass bg-white/50 backdrop-blur-sm rounded-xl px-4 py-2">
                    <p className="text-lg font-bold text-gray-900">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <FeedbackButton
                      onClick={() => handleDateChange(1)}
                      variant="ghost"
                      className="!p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </FeedbackButton>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <FeedbackButton
                      onClick={() => setSelectedDate(new Date())}
                      variant="ghost"
                      className="border border-primary-300 text-primary-600 hover:bg-primary-50 rounded-lg px-4 py-2 font-medium"
                    >
                      Today
                    </FeedbackButton>
                  </motion.div>
                </div>
              </div>
              <AppointmentCalendar
                appointments={appointments}
                selectedDate={selectedDate}
                onAppointmentClick={setSelectedAppointment}
                onCheckIn={handleCheckIn}
              />
            </motion.div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-6 mb-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Search</h3>
              <PatientSearch
                onSelect={(patient) => {
                  setSelectedPatient(patient)
                  setIsBookingModalOpen(true)
                }}
                onSearch={handlePatientSearch}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Today's Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total', value: todayStats.total, color: 'blue' },
                  { label: 'Checked In', value: todayStats.checkedIn, color: 'success' },
                  { label: 'Pending', value: todayStats.pending, color: 'warning' },
                  { label: 'Completed', value: todayStats.completed, color: 'purple' },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.05 }}
                    whileHover={{ x: 4 }}
                    className={`flex items-center justify-between p-4 bg-${stat.color}-50 border border-${stat.color}-200 rounded-xl shadow-sm hover:shadow-md transition-all`}
                  >
                    <span className={`text-sm font-semibold text-${stat.color}-900`}>{stat.label}</span>
                    <span className={`text-2xl font-bold text-${stat.color}-900`}>{stat.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Book Appointment Modal */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsBookingModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl border border-white/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                    Book Appointment
                  </h2>
                  <button
                    onClick={() => setIsBookingModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-5">
                  {/* Patient Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Patient
                    </label>
                    {selectedPatient ? (
                      <div className="glass bg-success-50/80 backdrop-blur-sm border border-success-300 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-success-900">
                            {selectedPatient.first_name} {selectedPatient.last_name}
                          </p>
                          <p className="text-sm text-success-700">
                            {selectedPatient.email} • {selectedPatient.phone}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedPatient(null)}
                          className="text-success-600 hover:text-success-800 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <PatientSearch
                        onSelect={setSelectedPatient}
                        onSearch={handlePatientSearch}
                      />
                    )}
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={appointmentForm.appointment_date}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_date: e.target.value })}
                        className="w-full px-4 py-3 glass bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Time</label>
                      <input
                        type="time"
                        value={appointmentForm.appointment_time}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_time: e.target.value })}
                        className="w-full px-4 py-3 glass bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Doctor Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor (Optional)</label>
                    <select
                      value={appointmentForm.doctor_id}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, doctor_id: e.target.value })}
                      className="w-full px-4 py-3 glass bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="">-- Select Doctor --</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          Dr. {doc.first_name} {doc.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Appointment Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Appointment Type</label>
                    <select
                      value={appointmentForm.appointment_type}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_type: e.target.value as any })}
                      className="w-full px-4 py-3 glass bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="consultation">Consultation</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="procedure">Procedure</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={appointmentForm.notes}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 glass bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                      placeholder="Additional notes or special instructions..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200/50 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsBookingModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <FeedbackButton
                    onClickAsync={handleBookAppointment}
                    loadingText="Booking..."
                    successText="Booked!"
                    errorText="Failed"
                    className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg"
                    disabled={!selectedPatient || !appointmentForm.appointment_date || !appointmentForm.appointment_time}
                  >
                    Book Appointment
                  </FeedbackButton>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onError={handleQRScanError}
          onClose={() => setShowQRScanner(false)}
        />
      )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
