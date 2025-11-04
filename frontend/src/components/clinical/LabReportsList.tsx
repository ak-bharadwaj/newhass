'use client'

import { motion } from 'framer-motion'
import { LabTest } from '@/lib/api'

interface LabReportsListProps {
  labTests: LabTest[]
}

export function LabReportsList({ labTests }: LabReportsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-100 text-warning-800 border-warning-200'
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress':
        return 'bg-primary-100 text-primary-800 border-primary-200'
      case 'completed':
        return 'bg-success-100 text-success-800 border-success-200'
      case 'cancelled':
        return 'bg-error-100 text-error-800 border-error-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'stat':
        return 'bg-error-500 text-white'
      case 'urgent':
        return 'bg-warning-500 text-white'
      case 'routine':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getTestTypeIcon = (testType: string) => {
    const type = testType.toLowerCase()
    if (type.includes('blood') || type.includes('cbc') || type.includes('lipid')) return '🩸'
    if (type.includes('x-ray') || type.includes('xray')) return '🔬'
    if (type.includes('mri') || type.includes('ct') || type.includes('scan')) return '🏥'
    if (type.includes('urine') || type.includes('urinalysis')) return '🧪'
    if (type.includes('culture')) return '🦠'
    return '🔬'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) {
      return diffMins < 1 ? 'Just now' : `${diffMins}m ago`
    }

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) {
      return `${diffHours}h ago`
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (labTests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lab Tests</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No lab tests found</p>
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
        <h3 className="text-lg font-semibold text-gray-900">Lab Tests & Reports</h3>
        <div className="text-sm text-gray-600">
          {labTests.length} test{labTests.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-3">
        {labTests.map((test, index) => (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getTestTypeIcon(test.test_type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{test.test_type}</h4>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${getUrgencyColor(test.urgency)}`}>
                        {test.urgency.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Requested {formatTimestamp(test.requested_at)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-3">
                  <div>
                    <span className="text-gray-600">Requested by:</span>{' '}
                    <span className="font-medium text-gray-900">{test.requested_by_name}</span>
                  </div>
                  {test.assigned_to_name && (
                    <div>
                      <span className="text-gray-600">Assigned to:</span>{' '}
                      <span className="font-medium text-gray-900">{test.assigned_to_name}</span>
                    </div>
                  )}
                  {test.accepted_at && (
                    <div>
                      <span className="text-gray-600">Accepted:</span>{' '}
                      <span className="font-medium text-gray-900">{formatTimestamp(test.accepted_at)}</span>
                    </div>
                  )}
                  {test.completed_at && (
                    <div>
                      <span className="text-gray-600">Completed:</span>{' '}
                      <span className="font-medium text-gray-900">{formatTimestamp(test.completed_at)}</span>
                    </div>
                  )}
                </div>

                {test.notes && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Notes:</span> {test.notes}
                    </p>
                  </div>
                )}

                {test.result_summary && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Summary:</span> {test.result_summary}
                    </p>
                  </div>
                )}

                {test.result_file_url && (
                  <div className="mt-3">
                    <a
                      href={test.result_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      View Report PDF
                    </a>
                  </div>
                )}
              </div>

              <div className="ml-4">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(test.status)}`}
                >
                  {test.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
