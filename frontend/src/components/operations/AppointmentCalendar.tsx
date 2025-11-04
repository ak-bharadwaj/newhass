'use client'

import { motion } from 'framer-motion'
import { Appointment } from '@/lib/api'

interface AppointmentCalendarProps {
  appointments: Appointment[]
  selectedDate: Date
  onAppointmentClick: (appointment: Appointment) => void
  onCheckIn?: (appointmentId: string) => void
}

export function AppointmentCalendar({
  appointments,
  selectedDate,
  onAppointmentClick,
  onCheckIn,
}: AppointmentCalendarProps) {
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Group appointments by hour
  const groupedAppointments = appointments.reduce((groups, appointment) => {
    const hour = new Date(appointment.scheduled_at).getHours()
    if (!groups[hour]) {
      groups[hour] = []
    }
    groups[hour].push(appointment)
    return groups
  }, {} as Record<number, Appointment[]>)

  // Generate time slots (9 AM to 5 PM)
  const timeSlots = Array.from({ length: 9 }, (_, i) => i + 9)

  if (appointments.length === 0) {
    return (
      <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Appointments - {selectedDate.toLocaleDateString()}
        </h3>
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-500">No appointments scheduled for this date</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Appointments - {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-sm font-medium bg-primary-600 text-white rounded-full">
              {appointments.length} total
            </span>
            {isToday(selectedDate) && (
              <span className="px-3 py-1 text-sm font-medium bg-success-600 text-white rounded-full animate-pulse">
                Today
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[600px]">
        {timeSlots.map((hour) => {
          const hourAppointments = groupedAppointments[hour] || []
          return (
            <div key={hour} className="border-b border-gray-100 last:border-b-0">
              <div className="flex">
                {/* Time column */}
                <div className="w-24 flex-shrink-0 p-4 bg-gray-50 border-r border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </p>
                </div>

                {/* Appointments column */}
                <div className="flex-1 p-4">
                  {hourAppointments.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No appointments</p>
                  ) : (
                    <div className="space-y-3">
                      {hourAppointments.map((appointment, index) => (
                        <motion.div
                          key={appointment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => onAppointmentClick(appointment)}
                          className="cursor-pointer group"
                        >
                          <div className="border-2 border-gray-200 rounded-lg p-3 hover:border-primary-400 hover:shadow-md transition-all bg-white">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-semibold text-primary-600">
                                    {formatTime(appointment.scheduled_at)}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    ({appointment.duration_minutes} min)
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
                                      appointment.status
                                    )}`}
                                  >
                                    {appointment.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>

                                <p className="font-semibold text-gray-900 mb-1">
                                  {appointment.patient_name}
                                </p>

                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  <span>MRN: {appointment.patient_mrn}</span>
                                  <span>•</span>
                                  <span>{appointment.doctor_name}</span>
                                  <span>•</span>
                                  <span className="capitalize">{appointment.appointment_type}</span>
                                </div>

                                {appointment.reason && (
                                  <p className="mt-2 text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                    {appointment.reason}
                                  </p>
                                )}
                              </div>

                              {appointment.status === 'scheduled' && onCheckIn && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onCheckIn(appointment.id)
                                  }}
                                  className="ml-4 px-4 py-2 bg-success-600 text-white text-sm font-medium rounded-lg hover:bg-success-700 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  Check In
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
