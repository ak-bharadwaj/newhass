'use client'

import { motion } from 'framer-motion'
import { Prescription } from '@/lib/api'

interface PrescriptionQueueProps {
  prescriptions: Prescription[]
  onPrescriptionClick: (prescription: Prescription) => void
  onDispense?: (prescriptionId: string) => void
}

export function PrescriptionQueue({ prescriptions, onPrescriptionClick, onDispense }: PrescriptionQueueProps) {
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Sort prescriptions - active ones first
  const sortedPrescriptions = [...prescriptions].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1
    if (a.status !== 'active' && b.status === 'active') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  if (prescriptions.length === 0) {
    return (
      <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescription Queue</h3>
        <div className="text-center py-12">
          <p className="text-gray-500">No prescriptions in queue</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Prescription Queue</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1 bg-primary-600 text-white rounded-full font-medium">
              Active: {prescriptions.filter(p => p.status === 'active').length}
            </span>
            <span className="px-3 py-1 bg-success-600 text-white rounded-full font-medium">
              Dispensed: {prescriptions.filter(p => p.status === 'dispensed').length}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[600px] p-4 space-y-3">
        {sortedPrescriptions.map((prescription, index) => (
          <motion.div
            key={prescription.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onPrescriptionClick(prescription)}
            className="cursor-pointer group"
          >
            <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-400 hover:shadow-md transition-all bg-white">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{getRouteIcon(prescription.route)}</div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{prescription.medication_name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(prescription.status)}`}>
                      {prescription.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Patient:</span>
                      <span className="ml-2 font-medium text-gray-900">{prescription.patient_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">MRN:</span>
                      <span className="ml-2 font-medium text-gray-900">{prescription.patient_mrn}</span>
                    </div>
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
                    <div className="col-span-2">
                      <span className="text-gray-600">Prescribed by:</span>
                      <span className="ml-2 font-medium text-gray-900">{prescription.prescribed_by_name}</span>
                    </div>
                    {prescription.dispensed_at && prescription.dispensed_by_name && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Dispensed by:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {prescription.dispensed_by_name} ({formatTimestamp(prescription.dispensed_at)})
                        </span>
                      </div>
                    )}
                  </div>

                  {prescription.instructions && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900 mb-3">
                      <span className="font-medium">Instructions:</span> {prescription.instructions}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {prescription.status === 'active' && onDispense && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDispense(prescription.id)
                        }}
                        className="px-4 py-2 bg-success-600 text-white text-sm font-medium rounded-lg hover:bg-success-700 transition-colors"
                      >
                        Mark as Dispensed
                      </button>
                    )}

                    {prescription.status === 'dispensed' && (
                      <span className="text-sm text-success-700 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Dispensed
                      </span>
                    )}

                    <span className="text-xs text-gray-500 ml-auto">
                      Prescribed {formatTimestamp(prescription.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
