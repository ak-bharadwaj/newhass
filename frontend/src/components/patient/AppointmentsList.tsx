'use client'

import { motion } from 'framer-motion'
import { Appointment } from '@/lib/api'

interface AppointmentsListProps {
  appointments: Appointment[]
  onRequestReschedule?: (appointmentId: string) => void
}

export function AppointmentsList({ appointments, onRequestReschedule }: AppointmentsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'checked_in':
        return 'bg-success-100 text-success-800 border-success-300'
      case 'in_progress':
        return 'bg-primary-100 text-primary-800 border-primary-300'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'cancelled':
        return 'bg-error-100 text-error-800 border-error-300'
      case 'no_show':
        return 'bg-warning-100 text-warning-800 border-warning-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getAppointmentTypeIcon = (type: string) => {
    const typeStr = type.toLowerCase()
    if (typeStr.includes('consultation')) return '👨‍⚕️'
    if (typeStr.includes('follow') || typeStr.includes('followup')) return '🔄'
    if (typeStr.includes('procedure')) return '⚕️'
    if (typeStr.includes('emergency')) return '🚨'
    if (typeStr.includes('checkup') || typeStr.includes('check-up')) return '🩺'
    return '📋'
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  }

  const getTimeUntil = (dateString: string) => {
    const now = new Date()
    const appointmentDate = new Date(dateString)
    const diffMs = appointmentDate.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffMs < 0) return null // Past appointment
    if (diffDays === 0 && diffHours < 1) return 'Less than 1 hour'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    const diffWeeks = Math.floor(diffDays / 7)
    return `In ${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'}`
  }

  const isUpcoming = (dateString: string, status: string) => {
    const now = new Date()
    const appointmentDate = new Date(dateString)
    return appointmentDate >= now && (status === 'scheduled' || status === 'checked_in')
  }

  // Separate upcoming and past appointments
  const upcomingAppointments = appointments
    .filter(apt => isUpcoming(apt.scheduled_at, apt.status))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const pastAppointments = appointments
    .filter(apt => !isUpcoming(apt.scheduled_at, apt.status))
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

  if (appointments.length === 0) {
    return (
      <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h3>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-gray-500">No appointments scheduled</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 overflow-hidden"
    >
      <div className="px-6 py-4 bg-gradient-to-r from-primary-50 to-blue-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-primary-600 text-white rounded-full font-medium">
              {upcomingAppointments.length} upcoming
            </span>
            {pastAppointments.length > 0 && (
              <span className="px-3 py-1 bg-gray-500 text-white rounded-full font-medium">
                {pastAppointments.length} past
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upcoming Appointments
            </h4>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment, index) => {
                const { date, time } = formatDateTime(appointment.scheduled_at)
                const timeUntil = getTimeUntil(appointment.scheduled_at)

                return (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-2 border-primary-200 rounded-lg p-4 bg-gradient-to-br from-white to-primary-50 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{getAppointmentTypeIcon(appointment.appointment_type)}</div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-semibold text-gray-900 text-lg capitalize">{appointment.appointment_type}</h5>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(appointment.status)}`}>
                            {appointment.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {timeUntil && (
                            <span className="px-2 py-1 bg-primary-600 text-white text-xs font-bold rounded-full animate-pulse">
                              {timeUntil}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Date:</span>
                            <span className="ml-2 font-medium text-gray-900">{date}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Time:</span>
                            <span className="ml-2 font-medium text-gray-900">{time}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Doctor:</span>
                            <span className="ml-2 font-medium text-gray-900">{appointment.doctor_name}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Duration:</span>
                            <span className="ml-2 font-medium text-gray-900">{appointment.duration_minutes} minutes</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Location:</span>
                            <span className="ml-2 font-medium text-gray-900">{appointment.hospital_name}</span>
                          </div>
                        </div>

                        {appointment.reason && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 mb-3">
                            <span className="font-medium">Reason:</span> {appointment.reason}
                          </div>
                        )}

                        {appointment.notes && (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 mb-3">
                            <span className="font-medium">Notes:</span> {appointment.notes}
                          </div>
                        )}

                        {onRequestReschedule && appointment.status === 'scheduled' && (
                          <button
                            onClick={() => onRequestReschedule(appointment.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Request Reschedule
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Past Appointments</h4>
            <div className="space-y-3">
              {pastAppointments.slice(0, 5).map((appointment, index) => {
                const { date, time } = formatDateTime(appointment.scheduled_at)

                return (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl opacity-60">{getAppointmentTypeIcon(appointment.appointment_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-700 capitalize">{appointment.appointment_type}</p>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(appointment.status)}`}>
                            {appointment.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {date} at {time} • {appointment.doctor_name}
                        </div>
                        {appointment.cancellation_reason && (
                          <div className="mt-1 text-sm text-error-700">
                            Cancelled: {appointment.cancellation_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              {pastAppointments.length > 5 && (
                <p className="text-center text-sm text-gray-500 pt-2">
                  Showing 5 of {pastAppointments.length} past appointments
                </p>
              )}
            </div>
          </div>
        )}

        {/* Contact Reminder */}
        {upcomingAppointments.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-blue-900 mb-1">Appointment Reminders</p>
                <p className="text-sm text-blue-800">
                  Please arrive 15 minutes early for your appointment. If you need to reschedule or cancel, please contact the hospital at least 24 hours in advance.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
