'use client'

import { motion } from 'framer-motion'
import { Prescription } from '@/lib/api'

interface MedicationScheduleProps {
  prescriptions: Prescription[]
}

export function MedicationSchedule({ prescriptions }: MedicationScheduleProps) {
  const getRouteIcon = (route: string) => {
    switch (route.toLowerCase()) {
      case 'oral':
        return '💊'
      case 'iv':
        return '💉'
      case 'im':
      case 'subcutaneous':
        return '🩹'
      case 'topical':
        return '🧴'
      case 'inhalation':
        return '🌬️'
      default:
        return '💊'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary-100 text-primary-800 border-primary-300'
      case 'dispensed':
        return 'bg-success-100 text-success-800 border-success-300'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'discontinued':
        return 'bg-warning-100 text-warning-800 border-warning-300'
      case 'cancelled':
        return 'bg-error-100 text-error-800 border-error-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getDaysRemaining = (endDate: string | undefined) => {
    if (!endDate) return null
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Completed'
    if (diffDays === 0) return 'Last day'
    if (diffDays === 1) return '1 day remaining'
    return `${diffDays} days remaining`
  }

  // Show only active and dispensed prescriptions
  const activeMedications = prescriptions.filter(
    p => p.status === 'active' || p.status === 'dispensed'
  )

  const completedMedications = prescriptions.filter(
    p => p.status === 'completed' || p.status === 'discontinued'
  )

  if (prescriptions.length === 0) {
    return (
      <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Medication Schedule</h3>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💊</div>
          <p className="text-gray-500">No medications prescribed</p>
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
      <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Medication Schedule</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-primary-600 text-white rounded-full font-medium">
              {activeMedications.length} active
            </span>
            {completedMedications.length > 0 && (
              <span className="px-3 py-1 bg-gray-500 text-white rounded-full font-medium">
                {completedMedications.length} completed
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Active Medications */}
        {activeMedications.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></span>
              Active Medications
            </h4>
            <div className="space-y-4">
              {activeMedications.map((prescription, index) => (
                <motion.div
                  key={prescription.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{getRouteIcon(prescription.route)}</div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold text-gray-900 text-lg">{prescription.medication_name}</h5>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(prescription.status)}`}>
                          {prescription.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Dosage:</span>
                          <span className="ml-2 font-medium text-gray-900">{prescription.dosage}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Frequency:</span>
                          <span className="ml-2 font-medium text-gray-900">{prescription.frequency}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Route:</span>
                          <span className="ml-2 font-medium text-gray-900 capitalize">{prescription.route}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Duration:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {prescription.duration_days ? `${prescription.duration_days} days` : 'Ongoing'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Start Date:</span>
                          <span className="ml-2 font-medium text-gray-900">{formatDate(prescription.start_date)}</span>
                        </div>
                        {prescription.end_date && (
                          <div>
                            <span className="text-gray-600">End Date:</span>
                            <span className="ml-2 font-medium text-gray-900">{formatDate(prescription.end_date)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Prescribed by:</span>
                          <span className="ml-2 font-medium text-gray-900">{prescription.prescribed_by_name}</span>
                        </div>
                        {prescription.dispensed_by_name && (
                          <div>
                            <span className="text-gray-600">Dispensed by:</span>
                            <span className="ml-2 font-medium text-gray-900">{prescription.dispensed_by_name}</span>
                          </div>
                        )}
                      </div>

                      {prescription.instructions && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 mb-3">
                          <span className="font-medium">Instructions:</span> {prescription.instructions}
                        </div>
                      )}

                      {prescription.end_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-primary-700 font-medium">{getDaysRemaining(prescription.end_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Medications */}
        {completedMedications.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Completed Medications</h4>
            <div className="space-y-3">
              {completedMedications.map((prescription, index) => (
                <motion.div
                  key={prescription.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl opacity-60">{getRouteIcon(prescription.route)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-700">{prescription.medication_name}</p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(prescription.status)}`}>
                          {prescription.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {prescription.dosage} • {prescription.frequency} • {formatDate(prescription.start_date)}
                        {prescription.end_date && ` - ${formatDate(prescription.end_date)}`}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Reminder Notice */}
        {activeMedications.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-blue-900 mb-1">Medication Reminders</p>
                <p className="text-sm text-blue-800">
                  Take your medications as prescribed. If you have any questions or experience side effects, please contact your healthcare provider.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
