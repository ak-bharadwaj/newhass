'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import Link from 'next/link'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type Appointment as ApiAppointment } from '@/lib/api'
import { Modal } from '@/components/dashboard/Modal'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { promiseFeedback } from '@/lib/activityFeedback'

export default function ReceptionAppointments() {
  const { token, user } = useAuth()
  const [appointments, setAppointments] = useState<ApiAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [appointmentToCancel, setAppointmentToCancel] = useState<ApiAppointment | null>(null)

  useEffect(() => {
    const loadAppointments = async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const res = await apiClient.getAppointments(token, {
          hospital_id: user?.hospital_id,
          limit: 100,
        })
        setAppointments(res)
      } catch (e: any) {
        console.error('Failed to load appointments', e)
        setError(e?.message || 'Failed to load appointments')
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }
    loadAppointments()
  }, [token, user?.hospital_id])

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = 
      (apt.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.doctor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.hospital_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    // Normalize UI filter values to backend status keys
    const normalizedFilter =
      statusFilter === 'confirmed' ? 'checked_in' :
      statusFilter === 'in-progress' ? 'in_progress' :
      statusFilter
    const matchesStatus = normalizedFilter === 'all' || apt.status === normalizedFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    confirmed: appointments.filter(a => a.status === 'checked_in').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    inProgress: appointments.filter(a => a.status === 'in_progress').length
  }

  const getStatusColor = (status: string) => {
    // Accept both UI-friendly and backend keys
    const s = status.replace('_', '-')
    switch (s) {
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'confirmed': // maps to checked_in
      case 'checked-in': return 'bg-green-100 text-green-800 border-green-300'
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation': return '👨‍⚕️'
      case 'follow-up': return '🔄'
      case 'emergency': return '🚨'
      default: return '📋'
    }
  }

  const openCancelModal = (apt: ApiAppointment) => {
    setAppointmentToCancel(apt)
    setCancelReason('')
    setShowCancelModal(true)
  }

  const confirmCancelAppointment = async () => {
    if (!token || !appointmentToCancel) return
    const id = appointmentToCancel.id
    await promiseFeedback(
      apiClient.cancelAppointment(id, { cancellation_reason: cancelReason || 'Cancelled by reception' }, token),
      {
        loading: 'Cancelling appointment...',
        success: 'Appointment cancelled',
        error: 'Failed to cancel appointment',
      }
    )
    setAppointments(prev => prev.filter(a => a.id !== id))
    setShowCancelModal(false)
    setAppointmentToCancel(null)
    setCancelReason('')
  }

  return (
    <EnterpriseDashboardLayout role="reception">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/reception" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Appointment Management
          </h1>
          <p className="text-gray-600">Schedule and manage patient appointments</p>
        </motion.div>

  {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'from-cyan-500 to-blue-500', icon: '📅' },
            { label: 'Scheduled', value: stats.scheduled, color: 'from-yellow-500 to-orange-500', icon: '⏰' },
            { label: 'Confirmed', value: stats.confirmed, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'In Progress', value: stats.inProgress, color: 'from-blue-500 to-indigo-500', icon: '⚕️' },
            { label: 'Completed', value: stats.completed, color: 'from-gray-500 to-slate-500', icon: '✔️' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl mb-3`}>
                  {stat.icon}
                </div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <Link
            href="/dashboard/reception/appointments/new"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-cyan-600 text-white font-semibold shadow hover:bg-cyan-700 transition-colors"
          >
            + New Appointment
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error}</div>
        )}
        {/* Appointments List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            {filteredAppointments.map((apt, index) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md p-6 border-2 border-gray-100 hover:border-cyan-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="text-5xl">
                      {getTypeIcon(apt.appointment_type)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{apt.patient_name}</h3>
                      <p className="text-gray-600">MRN: {apt.patient_mrn}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">📅 {new Date(apt.scheduled_at).toLocaleDateString()}</span>
                        <span className="text-sm text-gray-500">🕐 {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-sm text-gray-500">👨‍⚕️ {apt.doctor_name}</span>
                        <span className="text-sm text-gray-500">🏥 {apt.hospital_name}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(apt.status)}`}>
                          {apt.status.replace('_',' ').toUpperCase()}
                        </span>
                      </div>
                      {apt.notes && (
                        <p className="text-sm text-gray-500 mt-2">📝 {apt.notes}</p>
                      )}
                    </div>
                  </div>
                  {apt.status === 'scheduled' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openCancelModal(apt)}
                      className="px-6 py-3 bg-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      Cancel
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}

            {filteredAppointments.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No appointments found</p>
              </div>
            )}
          </motion.div>
        )}

        {/* New Appointment creation now available via 
            /dashboard/reception/appointments/new */}
      </div>

      {/* Cancel Appointment Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setAppointmentToCancel(null) }}
        title="Cancel Appointment"
        size="md"
        footer={
          <>
            <FeedbackButton onClick={() => { setShowCancelModal(false); setAppointmentToCancel(null) }} variant="ghost">Close</FeedbackButton>
            <FeedbackButton
              onClickAsync={confirmCancelAppointment}
              loadingText="Cancelling..."
              successText="Cancelled!"
              variant="primary"
              disabled={!cancelReason}
            >
              Confirm Cancel
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); confirmCancelAppointment() }} className="space-y-4">
          <div className="text-sm text-gray-600">Provide a reason to cancel this appointment.</div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Reason *</label>
            <textarea
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Patient requested cancellation, scheduling conflict, etc."
            />
          </div>
        </form>
      </Modal>
    </EnterpriseDashboardLayout>
  )
}
