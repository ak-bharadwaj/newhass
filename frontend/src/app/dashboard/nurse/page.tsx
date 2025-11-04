'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { StandardDashboardLayout, StandardCard, StandardGridLayout } from '@/components/dashboard/StandardGridLayout'
import { RegionalBanner } from '@/components/branding/RegionalBanner'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { promiseFeedback } from '@/lib/activityFeedback'
import { apiClient, PatientWithVitals, Prescription, CreateVitalsData } from '@/lib/api'
import { PatientCard } from '@/components/clinical/PatientCard'
import { VitalsEntryModal } from '@/components/clinical/VitalsEntryModal'
import { PrescriptionsList } from '@/components/clinical/PrescriptionsList'
import { TaskTimeline, generateTasksFromPrescriptions } from '@/components/clinical/TaskTimeline'
import { RealTimeAlerts, SSEConnectionStatus } from '@/components/common/RealTimeAlerts'
import { useEmergencyAlerts } from '@/hooks/useSSE'
import { Modal } from '@/components/dashboard/Modal'
import { VoiceVitalsInput } from '@/components/clinical/VoiceVitalsInput'
import { useTheme } from '@/lib/themeUtils'
import Link from 'next/link'
import SectionHeader from '@/components/common/SectionHeader'

export default function NurseDashboard() {
  const { user, token } = useAuth()
  const { isDark } = useTheme()
  const { isConnected } = useEmergencyAlerts()
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientWithVitals | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false)
  const [showNurseLogModal, setShowNurseLogModal] = useState(false)
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const [visitId, setVisitId] = useState<string>('')

  // Nurse log form
  const [nurseLogForm, setNurseLogForm] = useState({
    log_type: 'general_observation',
    content: '',
  })

  useEffect(() => {
    loadPatients()
  }, [])

  useEffect(() => {
    if (selectedPatient) {
      loadPatientPrescriptions(selectedPatient.id)
    }
  }, [selectedPatient])

  const loadPatients = async () => {
    if (!token) return
    try {
      setIsLoading(true)
      setError(null)
      const data = await apiClient.getNursePatients(token)
      setPatients(data)
      if (data.length > 0 && !selectedPatient) {
        setSelectedPatient(data[0])
      }

      // Load all prescriptions for task timeline
      const allPres = await Promise.all(
        data.map(p => apiClient.getPatientPrescriptions(p.id, token))
      )
      setAllPrescriptions(allPres.flat())
    } catch (err: any) {
      setError(err.message || 'Failed to load patients')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPatientPrescriptions = async (patientId: string) => {
    if (!token) return
    try {
      const data = await apiClient.getPatientPrescriptions(patientId, token)
      setPrescriptions(data)
    } catch (err: any) {
      console.error('Failed to load prescriptions:', err)
    }
  }

  const handleRecordVitals = async (data: CreateVitalsData) => {
    if (!token) return

    await promiseFeedback(
      apiClient.recordVitals(data, token),
      {
        loading: 'Recording vitals...',
        success: 'Vitals recorded successfully!',
        error: 'Failed to record vitals',
      }
    )

    await loadPatients()
  }

  const handleAdministerMedication = async (prescriptionId: string) => {
    if (!token) return

    await promiseFeedback(
      apiClient.administerMedication(prescriptionId, token),
      {
        loading: 'Administering medication...',
        success: 'Medication administered!',
        error: 'Failed to administer medication',
      }
    )

    if (selectedPatient) {
      await loadPatientPrescriptions(selectedPatient.id)
    }
    await loadPatients()
  }

  const handleTaskComplete = async (taskId: string) => {
    const prescriptionId = taskId.split('-')[0]
    await handleAdministerMedication(prescriptionId)
  }

  const openVitalsModal = (patient: PatientWithVitals) => {
    setSelectedPatient(patient)
    // Prefer the patient's active_visit_id if available; otherwise leave blank and let the user select
    setVisitId(patient.active_visit_id || '')
    setIsVitalsModalOpen(true)
  }

  const handleVoiceVitalsParsed = async (vitals: any) => {
    if (!selectedPatient || !token) return

    // Automatically record the parsed vitals
    const vitalsData: CreateVitalsData = {
      patient_id: selectedPatient.id,
      visit_id: selectedPatient.active_visit_id || visitId,
      ...vitals,
    }

    await handleRecordVitals(vitalsData)
  }

  const handleAddNurseLog = async () => {
    if (!token || !selectedPatient) return

    await promiseFeedback(
      apiClient.createNurseLog({
        patient_id: selectedPatient.id,
        visit_id: selectedPatient.active_visit_id || visitId,
        ...nurseLogForm,
      }, token),
      {
        loading: 'Adding nurse log...',
        success: 'Nurse log added successfully!',
        error: 'Failed to add nurse log',
      }
    )

    setShowNurseLogModal(false)
    setNurseLogForm({
      log_type: 'general_observation',
      content: '',
    })
  }

  if (!user || user.role_name !== 'nurse') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be a nurse to access this dashboard.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 theme-gradient-bg">
        <DashboardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-gradient-bg">
        <div className={`text-center glass backdrop-blur-xl border shadow-2xl rounded-2xl p-8 ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}>
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-error-400' : 'text-error-600'}`}>Error</h1>
          <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <FeedbackButton
            onClickAsync={loadPatients}
            loadingText="Retrying..."
            successText="Loaded!"
            variant="primary"
            className="shadow-lg hover:shadow-xl"
          >
            Try Again
          </FeedbackButton>
        </div>
      </div>
    )
  }

  const tasks = generateTasksFromPrescriptions(allPrescriptions, patients)
  return (
    <EnterpriseDashboardLayout role="nurse">
      {/* Regional Banner */}
      <RegionalBanner />

      {/* Real-time emergency alert system */}
      <RealTimeAlerts />
      <SSEConnectionStatus isConnected={isConnected} />

      <StandardDashboardLayout
        title="Nurse Dashboard"
        subtitle={`Welcome, Nurse ${user.first_name} ${user.last_name}`}
        chips={[
          { label: 'Live', color: 'blue' },
          { label: new Date().toLocaleDateString() }
        ]}
        actions={
          <>
            <FeedbackButton
              onClick={() => selectedPatient && openVitalsModal(selectedPatient)}
              disabled={!selectedPatient || isLoading}
              variant="primary"
              className="shadow-sm"
            >
              📊 Record Vitals
            </FeedbackButton>
            <FeedbackButton
              onClick={() => setShowVoiceInput(true)}
              disabled={!selectedPatient || isLoading}
              variant="primary"
              className="shadow-sm theme-btn-accent"
            >
              🎤 Voice Input
            </FeedbackButton>
            <FeedbackButton
              onClick={() => setShowNurseLogModal(true)}
              disabled={!selectedPatient || isLoading}
              variant="secondary"
              className="shadow-sm"
            >
              📝 Add Log
            </FeedbackButton>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/dashboard/nurse/case-sheets" className="px-3 py-2 text-sm rounded-lg theme-card theme-text-primary hover:theme-btn-primary hover:text-white transition-colors">Case Sheets</Link>
              <Link href="/dashboard/nurse/tasks" className="px-3 py-2 text-sm rounded-lg theme-card theme-text-primary hover:theme-btn-primary hover:text-white transition-colors">Tasks</Link>
              <Link href="/dashboard/nurse/vitals" className="px-3 py-2 text-sm rounded-lg theme-card theme-text-primary hover:theme-btn-primary hover:text-white transition-colors">Vitals</Link>
            </div>
          </>
        }
        showStats={true}
        stats={
          <>
            <StandardCard hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="theme-text-secondary">Patients Assigned</p>
                  <p className="text-3xl font-bold theme-text-primary">{patients.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl theme-gradient-success-subtle theme-text-primary">👥</div>
              </div>
            </StandardCard>
            <StandardCard hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="theme-text-secondary">Pending Tasks</p>
                  <p className="text-3xl font-bold theme-text-primary">{tasks.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl theme-gradient-primary-subtle theme-text-primary">📋</div>
              </div>
            </StandardCard>
            <StandardCard hover>
              <Link href="/dashboard/nurse/case-sheets" className="block">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="theme-text-secondary">Case Sheets</p>
                    <p className="text-3xl font-bold theme-text-primary">View</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl theme-gradient-accent-subtle theme-text-primary">📄</div>
                </div>
              </Link>
            </StandardCard>
            <StandardCard hover>
              <button
                onClick={() => setShowVoiceInput(true)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="theme-text-secondary">Voice Input</p>
                    <p className="text-xl font-bold theme-text-primary">🎤</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl theme-gradient-warning-subtle theme-text-primary">🎤</div>
                </div>
              </button>
            </StandardCard>
          </>
        }
      >

      {/* Main Content */}
      {patients.length === 0 ? (
        <StandardCard className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 theme-gradient-primary-subtle">
              <svg className="w-10 h-10 theme-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2 theme-text-primary">No Patients</h2>
            <p className="theme-text-secondary">There are no patients in your hospital with active visits.</p>
          </div>
        </StandardCard>
      ) : (
        <StandardGridLayout
          sidebarPosition="right"
          sidebarWidth="medium"
          sidebar={
            <div className="space-y-4">
              {/* Task Timeline */}
              <TaskTimeline tasks={tasks} onTaskComplete={handleTaskComplete} />
            </div>
          }
        >
          {/* Patients Grid */}
          <StandardCard
            title="My Patients"
            actions={
              <div className="flex gap-2 flex-wrap">
                <FeedbackButton
                  onClick={() => selectedPatient && openVitalsModal(selectedPatient)}
                  disabled={!selectedPatient || isLoading}
                  variant="primary"
                  size="sm"
                >
                  📊 Record Vitals
                </FeedbackButton>
                <FeedbackButton
                  onClick={() => setShowVoiceInput(true)}
                  disabled={!selectedPatient || isLoading}
                  variant="primary"
                  size="sm"
                  className="theme-btn-accent"
                >
                  🎤 Voice Input
                </FeedbackButton>
                <FeedbackButton
                  onClick={() => setShowNurseLogModal(true)}
                  disabled={!selectedPatient || isLoading}
                  variant="secondary"
                  size="sm"
                >
                  📝 Add Log
                </FeedbackButton>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PatientCard
                    patient={patient}
                    onClick={() => setSelectedPatient(patient)}
                    isSelected={selectedPatient?.id === patient.id}
                  />
                </motion.div>
              ))}
            </div>
          </StandardCard>

          {/* Prescriptions/Medications */}
          {selectedPatient && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <PrescriptionsList
                prescriptions={prescriptions}
                onAdminister={handleAdministerMedication}
                canAdminister={true}
              />
            </motion.div>
          )}
        </StandardGridLayout>
      )}

      {/* Vitals Entry Modal */}
      {selectedPatient && (
        <VitalsEntryModal
          isOpen={isVitalsModalOpen}
          onClose={() => setIsVitalsModalOpen(false)}
          patientId={selectedPatient.id}
          visitId={visitId}
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          onSubmit={handleRecordVitals}
        />
      )}

      {/* Add Nurse Log Modal */}
      <Modal
        isOpen={showNurseLogModal}
        onClose={() => setShowNurseLogModal(false)}
        title="Add Nurse Log"
        size="md"
        footer={
          <>
            <FeedbackButton onClick={() => setShowNurseLogModal(false)} variant="ghost">Cancel</FeedbackButton>
            <FeedbackButton
              onClickAsync={handleAddNurseLog}
              loadingText="Adding..."
              successText="Added!"
              variant="primary"
              disabled={!nurseLogForm.content}
            >
              Add Log
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAddNurseLog(); }} className="space-y-4">
          {selectedPatient && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm text-primary-900">
                <strong>Patient:</strong> {selectedPatient.first_name} {selectedPatient.last_name}
              </p>
              <p className="text-sm text-primary-700">MRN: {selectedPatient.mrn}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Log Type *</label>
            <select
              value={nurseLogForm.log_type}
              onChange={(e) => setNurseLogForm({ ...nurseLogForm, log_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="general_observation">General Observation</option>
              <option value="pain_assessment">Pain Assessment</option>
              <option value="wound_care">Wound Care</option>
              <option value="medication_note">Medication Note</option>
              <option value="patient_education">Patient Education</option>
              <option value="discharge_planning">Discharge Planning</option>
              <option value="incident_report">Incident Report</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes *</label>
            <textarea
              required
              value={nurseLogForm.content}
              onChange={(e) => setNurseLogForm({ ...nurseLogForm, content: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter detailed nursing observations, patient status, interventions performed, patient response, etc..."
            />
          </div>
        </form>
      </Modal>

      {/* Voice Vitals Input */}
      {showVoiceInput && selectedPatient && (
        <VoiceVitalsInput
          onVitalsParsed={handleVoiceVitalsParsed}
          onClose={() => setShowVoiceInput(false)}
        />
      )}
    </EnterpriseDashboardLayout>
  )
}
