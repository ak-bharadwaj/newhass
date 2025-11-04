'use client'

import { motion } from 'framer-motion'
import { Prescription } from '@/lib/api'

interface PrescriptionsListProps {
  prescriptions: Prescription[]
  onAdminister?: (prescriptionId: string) => void
  canAdminister?: boolean
}

export function PrescriptionsList({ prescriptions, onAdminister, canAdminister = false }: PrescriptionsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary-100 text-primary-800 border-primary-200'
      case 'dispensed':
        return 'bg-success-100 text-success-800 border-success-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'discontinued':
        return 'bg-warning-100 text-warning-800 border-warning-200'
      case 'cancelled':
        return 'bg-error-100 text-error-800 border-error-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

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

  if (prescriptions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescriptions</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No prescriptions found</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Prescriptions</h3>
        <div className="text-sm text-gray-600">
          {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-3">
        {prescriptions.map((prescription, index) => (
          <motion.div
            key={prescription.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getRouteIcon(prescription.route)}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{prescription.medication_name}</h4>
                    <p className="text-sm text-gray-600">
                      {prescription.dosage} · {prescription.frequency}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-3">
                  <div>
                    <span className="text-gray-600">Route:</span>{' '}
                    <span className="font-medium text-gray-900 capitalize">{prescription.route}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>{' '}
                    <span className="font-medium text-gray-900">
                      {prescription.duration_days ? `${prescription.duration_days} days` : 'Ongoing'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Start Date:</span>{' '}
                    <span className="font-medium text-gray-900">
                      {new Date(prescription.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  {prescription.end_date && (
                    <div>
                      <span className="text-gray-600">End Date:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {new Date(prescription.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Prescribed by:</span>{' '}
                    <span className="font-medium text-gray-900">{prescription.prescribed_by_name}</span>
                  </div>
                  {prescription.dispensed_at && prescription.dispensed_by_name && (
                    <div>
                      <span className="text-gray-600">Dispensed by:</span>{' '}
                      <span className="font-medium text-gray-900">{prescription.dispensed_by_name}</span>
                    </div>
                  )}
                </div>

                {prescription.instructions && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Instructions:</span> {prescription.instructions}
                    </p>
                  </div>
                )}

                {prescription.administered_at && prescription.administered_by_name && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-success-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      Last administered by {prescription.administered_by_name} on{' '}
                      {new Date(prescription.administered_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="ml-4 flex flex-col items-end gap-2">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                    prescription.status
                  )}`}
                >
                  {prescription.status.replace('_', ' ').toUpperCase()}
                </span>

                {canAdminister && prescription.status === 'dispensed' && onAdminister && (
                  <button
                    onClick={() => onAdminister(prescription.id)}
                    className="mt-2 px-4 py-2 bg-success-600 text-white text-sm font-medium rounded-lg hover:bg-success-700 transition-colors"
                  >
                    Mark Administered
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
