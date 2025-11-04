'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { RegionalBanner } from '@/components/branding/RegionalBanner'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { promiseFeedback } from '@/lib/activityFeedback'
import { apiClient, LabTest } from '@/lib/api'
import { TestQueue } from '@/components/operations/TestQueue'
import { Modal } from '@/components/dashboard/Modal'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import SectionHeader from '@/components/common/SectionHeader'
import { PDFViewer } from '@/components/files/PDFViewer'

export default function LabTechDashboard() {
  const { user, token } = useAuth()
  const [tests, setTests] = useState<LabTest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [selectedPDFUrl, setSelectedPDFUrl] = useState<string>('')
  const [selectedPDFName, setSelectedPDFName] = useState<string>('')

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    results: '',
    notes: '',
  })

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    if (!token || !user?.hospital_id) return
    try {
      setIsLoading(true)
      setError(null)
  const response = await fetch(`${apiClient['baseURL']}/api/v1/patients/search?hospital_id=${user.hospital_id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to load tests')
      const patients = await response.json()
      const allTests: LabTest[] = []
      for (const patient of patients.slice(0, 20)) {
        try {
          const patientTests = await apiClient.getPatientLabTests(patient.id, token)
          allTests.push(...patientTests)
        } catch (err) {
          console.error(`Failed to load tests for patient ${patient.id}`)
        }
      }
      setTests(allTests)
    } catch (err: any) {
      setError(err.message || 'Failed to load tests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptTest = async (testId: string) => {
    if (!token) return

    await promiseFeedback(
      (async () => {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/clinical/lab-tests/${testId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'in_progress' }),
        })
        if (!response.ok) throw new Error('Failed to accept test')
        return response
      })(),
      {
        loading: 'Accepting test...',
        success: 'Test accepted!',
        error: 'Failed to accept test',
      }
    )

    await loadTests()
  }

  const handleCompleteTest = async (testId: string) => {
    if (!token) return

    await promiseFeedback(
      (async () => {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/clinical/lab-tests/${testId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'completed' }),
        })
        if (!response.ok) throw new Error('Failed to complete test')
        return response
      })(),
      {
        loading: 'Completing test...',
        success: 'Test completed!',
        error: 'Failed to complete test',
      }
    )

    await loadTests()
  }

  const handleUploadResults = async () => {
    if (!token || !selectedTest) return

    await promiseFeedback(
      (async () => {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/clinical/lab-tests/${selectedTest.id}/results`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(uploadForm),
        })
        if (!response.ok) throw new Error('Failed to upload results')
        return response
      })(),
      {
        loading: 'Uploading results...',
        success: 'Results uploaded successfully!',
        error: 'Failed to upload results',
      }
    )

    setShowUploadModal(false)
    setUploadForm({ results: '', notes: '' })
    setSelectedTest(null)
    await loadTests()
  }

  const openUploadModal = (test: LabTest) => {
    setSelectedTest(test)
    setShowUploadModal(true)
  }

  const openPDFViewer = (url: string, testType: string) => {
    setSelectedPDFUrl(url)
    setSelectedPDFName(`${testType} - Lab Report.pdf`)
    setShowPDFViewer(true)
  }

  const filteredTests = filterStatus === 'all' ? tests : tests.filter(t => t.status === filterStatus)

  if (!user || user.role_name !== 'lab_tech') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be a lab tech to access this dashboard.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <EnterpriseDashboardLayout role="lab_tech">
      {/* Regional Banner */}
      <RegionalBanner />

      {/* Header */}
      <SectionHeader
        title="Lab Tech Dashboard"
        subtitle={`Welcome, ${user.first_name} ${user.last_name}`}
        chips={[{ label: 'Live', color: 'blue' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
      />

      <div className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
              <FeedbackButton
                onClick={() => setFilterStatus('all')}
                variant={filterStatus === 'all' ? 'primary' : 'ghost'}
                className={`${filterStatus === 'all' ? 'shadow-md' : 'bg-white hover:bg-gray-100 shadow-sm'} transition-all`}
                size="sm"
              >
                All
              </FeedbackButton>
              <FeedbackButton
                onClick={() => setFilterStatus('pending')}
                variant={filterStatus === 'pending' ? 'warning' : 'ghost'}
                className={`${filterStatus === 'pending' ? 'shadow-md' : 'bg-white hover:bg-gray-100 shadow-sm'} transition-all`}
                size="sm"
              >
                Pending
              </FeedbackButton>
              <FeedbackButton
                onClick={() => setFilterStatus('in_progress')}
                variant={filterStatus === 'in_progress' ? 'secondary' : 'ghost'}
                className={`${filterStatus === 'in_progress' ? 'shadow-md' : 'bg-white hover:bg-gray-100 shadow-sm'} transition-all`}
                size="sm"
              >
                In Progress
              </FeedbackButton>
              <FeedbackButton
                onClick={() => setFilterStatus('completed')}
                variant={filterStatus === 'completed' ? 'success' : 'ghost'}
                className={`${filterStatus === 'completed' ? 'shadow-md' : 'bg-white hover:bg-gray-100 shadow-sm'} transition-all`}
                size="sm"
              >
                Completed
              </FeedbackButton>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mb-6 p-4 bg-error-50 border-l-4 border-error-500 text-error-700 rounded-lg shadow-md"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass bg-gradient-to-br from-primary-500 to-primary-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-medium">Total</span>
              </div>
              <p className="text-4xl font-bold mb-1">{tests.length}</p>
              <p className="text-white/90 text-sm">Lab Tests</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="glass bg-gradient-to-br from-warning-500 to-warning-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-medium">Waiting</span>
              </div>
              <p className="text-4xl font-bold mb-1">{tests.filter(t => t.status === 'pending').length}</p>
              <p className="text-white/90 text-sm">Pending Tests</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="glass bg-gradient-to-br from-secondary-500 to-secondary-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-medium">Active</span>
              </div>
              <p className="text-4xl font-bold mb-1">{tests.filter(t => t.status === 'in_progress').length}</p>
              <p className="text-white/90 text-sm">In Progress</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="glass bg-gradient-to-br from-success-500 to-success-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-medium">Today</span>
              </div>
              <p className="text-4xl font-bold mb-1">
                {tests.filter(t => t.status === 'completed' && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()).length}
              </p>
              <p className="text-white/90 text-sm">Completed Today</p>
            </div>
          </motion.div>
        </div>

        {/* Test Queue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <TestQueue
            tests={filteredTests}
            onTestClick={setSelectedTest}
            onAccept={handleAcceptTest}
            onComplete={handleCompleteTest}
            onViewReport={openPDFViewer}
          />
        </motion.div>
      </div>

      {/* Upload Results Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false)
          setSelectedTest(null)
        }}
        title="Upload Lab Results"
        size="md"
        footer={
          <>
            <FeedbackButton
              onClick={() => {
                setShowUploadModal(false)
                setSelectedTest(null)
              }}
              variant="ghost"
            >
              Cancel
            </FeedbackButton>
            <FeedbackButton
              onClickAsync={handleUploadResults}
              loadingText="Uploading..."
              successText="Uploaded!"
              variant="primary"
              disabled={!uploadForm.results}
            >
              Upload Results
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleUploadResults(); }} className="space-y-4">
          {selectedTest && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-primary-900">
                <strong>Test Type:</strong> {selectedTest.test_type}
              </p>
              <p className="text-sm text-primary-700">
                Urgency: <span className="capitalize">{selectedTest.urgency}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lab Results *</label>
            <textarea
              required
              value={uploadForm.results}
              onChange={(e) => setUploadForm({ ...uploadForm, results: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter detailed lab results, measurements, observations, and findings..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              value={uploadForm.notes}
              onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Any additional notes, quality control remarks, or special observations..."
            />
          </div>
        </form>
      </Modal>

      {/* PDF Viewer */}
      {showPDFViewer && selectedPDFUrl && (
        <PDFViewer
          fileUrl={selectedPDFUrl}
          fileName={selectedPDFName}
          onClose={() => setShowPDFViewer(false)}
        />
      )}
    </EnterpriseDashboardLayout>
  )
}
