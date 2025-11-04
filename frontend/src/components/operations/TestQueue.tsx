'use client'

import { motion } from 'framer-motion'
import { LabTest } from '@/lib/api'

interface TestQueueProps {
  tests: LabTest[]
  onTestClick: (test: LabTest) => void
  onAccept?: (testId: string) => void
  onComplete?: (testId: string) => void
  onViewReport?: (url: string, testType: string) => void
}

export function TestQueue({ tests, onTestClick, onAccept, onComplete, onViewReport }: TestQueueProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-100 text-warning-800 border-warning-300'
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'in_progress':
        return 'bg-primary-100 text-primary-800 border-primary-300'
      case 'completed':
        return 'bg-success-100 text-success-800 border-success-300'
      case 'cancelled':
        return 'bg-error-100 text-error-800 border-error-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'stat':
        return 'bg-error-500 text-white animate-pulse'
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
    if (type.includes('blood') || type.includes('cbc')) return '🩸'
    if (type.includes('x-ray') || type.includes('xray')) return '🔬'
    if (type.includes('mri') || type.includes('ct')) return '🏥'
    if (type.includes('urine')) return '🧪'
    return '🔬'
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

  // Sort by urgency and timestamp
  const sortedTests = [...tests].sort((a, b) => {
    const urgencyOrder = { stat: 0, urgent: 1, routine: 2 }
    const urgencyDiff = urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder]
    if (urgencyDiff !== 0) return urgencyDiff
    return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime()
  })

  if (tests.length === 0) {
    return (
      <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Queue</h3>
        <div className="text-center py-12">
          <p className="text-gray-500">No lab tests in queue</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Lab Test Queue</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1 bg-error-500 text-white rounded-full font-medium">
              STAT: {tests.filter(t => t.urgency === 'stat').length}
            </span>
            <span className="px-3 py-1 bg-warning-500 text-white rounded-full font-medium">
              Urgent: {tests.filter(t => t.urgency === 'urgent').length}
            </span>
            <span className="px-3 py-1 bg-gray-500 text-white rounded-full font-medium">
              Routine: {tests.filter(t => t.urgency === 'routine').length}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[600px] p-4 space-y-3">
        {sortedTests.map((test, index) => (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onTestClick(test)}
            className="cursor-pointer group"
          >
            <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-400 hover:shadow-md transition-all bg-white">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{getTestTypeIcon(test.test_type)}</div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{test.test_type}</h4>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${getUrgencyColor(test.urgency)}`}>
                      {test.urgency.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(test.status)}`}>
                      {test.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Patient:</span>
                      <span className="ml-2 font-medium text-gray-900">{test.patient_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">MRN:</span>
                      <span className="ml-2 font-medium text-gray-900">{test.patient_mrn}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Requested by:</span>
                      <span className="ml-2 font-medium text-gray-900">{test.requested_by_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Requested:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatTimestamp(test.requested_at)}</span>
                    </div>
                    {test.assigned_to_name && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Assigned to:</span>
                        <span className="ml-2 font-medium text-gray-900">{test.assigned_to_name}</span>
                      </div>
                    )}
                  </div>

                  {test.notes && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900 mb-3">
                      <span className="font-medium">Notes:</span> {test.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {test.status === 'pending' && onAccept && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onAccept(test.id)
                        }}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Accept Test
                      </button>
                    )}

                    {test.status === 'in_progress' && onComplete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onComplete(test.id)
                        }}
                        className="px-4 py-2 bg-success-600 text-white text-sm font-medium rounded-lg hover:bg-success-700 transition-colors"
                      >
                        Mark Completed
                      </button>
                    )}

                    {test.status === 'completed' && test.result_file_url && onViewReport && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewReport(test.result_file_url!, test.test_type)
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Report
                      </button>
                    )}

                    {test.completed_at && (
                      <span className="text-sm text-success-700">
                        ✓ Completed {formatTimestamp(test.completed_at)}
                      </span>
                    )}
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
