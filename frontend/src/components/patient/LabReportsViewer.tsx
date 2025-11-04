'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LabTest } from '@/lib/api'
import { PDFViewer } from '@/components/files/PDFViewer'

interface LabReportsViewerProps {
  labTests: LabTest[]
}

export function LabReportsViewer({ labTests }: LabReportsViewerProps) {
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [selectedPDFUrl, setSelectedPDFUrl] = useState<string>('')
  const [selectedPDFName, setSelectedPDFName] = useState<string>('')

  const openPDFViewer = (url: string, testType: string) => {
    setSelectedPDFUrl(url)
    setSelectedPDFName(`${testType} - Lab Report.pdf`)
    setShowPDFViewer(true)
  }

  const getTestTypeIcon = (testType: string) => {
    const type = testType.toLowerCase()
    if (type.includes('blood') || type.includes('cbc') || type.includes('lipid')) return '🩸'
    if (type.includes('x-ray') || type.includes('xray')) return '🦴'
    if (type.includes('mri') || type.includes('ct') || type.includes('scan')) return '🧠'
    if (type.includes('urine') || type.includes('urinalysis')) return '🧪'
    if (type.includes('culture')) return '🦠'
    if (type.includes('ecg') || type.includes('ekg')) return '💓'
    return '🔬'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800 border-success-300'
      case 'in_progress':
        return 'bg-primary-100 text-primary-800 border-primary-300'
      case 'pending':
      case 'accepted':
        return 'bg-warning-100 text-warning-800 border-warning-300'
      case 'cancelled':
        return 'bg-error-100 text-error-800 border-error-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'stat':
        return <span className="px-2 py-0.5 bg-error-600 text-white text-xs font-bold rounded">STAT</span>
      case 'urgent':
        return <span className="px-2 py-0.5 bg-warning-600 text-white text-xs font-bold rounded">URGENT</span>
      case 'routine':
        return <span className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded">Routine</span>
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Sort by requested date, most recent first
  const sortedTests = [...labTests].sort((a, b) => {
    return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
  })

  if (labTests.length === 0) {
    return (
      <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lab Reports</h3>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔬</div>
          <p className="text-gray-500">No lab reports available</p>
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
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Lab Reports</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-blue-600 text-white rounded-full font-medium">
              {labTests.length} {labTests.length === 1 ? 'report' : 'reports'}
            </span>
            <span className="px-3 py-1 bg-success-600 text-white rounded-full font-medium">
              {labTests.filter(t => t.status === 'completed').length} completed
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {sortedTests.map((test, index) => (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{getTestTypeIcon(test.test_type)}</div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">{test.test_type}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(test.status)}`}>
                    {test.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {getUrgencyBadge(test.urgency)}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Requested:</span>
                    <span className="ml-2 font-medium text-gray-900">{formatDate(test.requested_at)}</span>
                  </div>
                  {test.completed_at && (
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatDate(test.completed_at)}</span>
                    </div>
                  )}
                  {test.requested_by_name && (
                    <div>
                      <span className="text-gray-600">Requested by:</span>
                      <span className="ml-2 font-medium text-gray-900">{test.requested_by_name}</span>
                    </div>
                  )}
                  {test.assigned_to_name && (
                    <div>
                      <span className="text-gray-600">Processed by:</span>
                      <span className="ml-2 font-medium text-gray-900">{test.assigned_to_name}</span>
                    </div>
                  )}
                </div>

                {test.notes && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 mb-3">
                    <span className="font-medium">Notes:</span> {test.notes}
                  </div>
                )}

                {test.result_summary && test.status === 'completed' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                    <p className="text-sm font-medium text-green-900 mb-1">Result Summary</p>
                    <p className="text-sm text-green-800 whitespace-pre-wrap">{test.result_summary}</p>
                  </div>
                )}

                {test.result_file_url && test.status === 'completed' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openPDFViewer(test.result_file_url!, test.test_type)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Report
                    </button>
                    <a
                      href={test.result_file_url}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download PDF
                    </a>
                  </div>
                )}

                {test.status !== 'completed' && test.status !== 'cancelled' && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Test in progress...</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* PDF Viewer Modal */}
      {showPDFViewer && selectedPDFUrl && (
        <PDFViewer
          fileUrl={selectedPDFUrl}
          fileName={selectedPDFName}
          onClose={() => setShowPDFViewer(false)}
        />
      )}
    </motion.div>
  )
}
