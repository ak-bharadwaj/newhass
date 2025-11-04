'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { StandardDashboardLayout, StandardCard, StandardGridLayout } from '@/components/dashboard/StandardGridLayout'
import { RegionalBanner } from '@/components/branding/RegionalBanner'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { DashboardSkeleton, SkeletonCard } from '@/components/common/LoadingSkeletons'
import { promiseFeedback } from '@/lib/activityFeedback'
import { apiClient, PatientWithVitals, Vitals, Prescription, NurseLog, LabTest, Appointment } from '@/lib/api'
import { PatientCard } from '@/components/clinical/PatientCard'
const VitalsChart = dynamic(() => import('@/components/clinical/VitalsChart').then(mod => mod.VitalsChart), { ssr: false })
const DoctorCharts = dynamic(() => import('@/components/doctor/DoctorCharts'), { ssr: false })
import { PrescriptionsList } from '@/components/clinical/PrescriptionsList'
import { NurseLogFeed } from '@/components/clinical/NurseLogFeed'
import { LabReportsList } from '@/components/clinical/LabReportsList'
import { RealTimeAlerts, SSEConnectionStatus } from '@/components/common/RealTimeAlerts'
import { AIDraftsQueue } from '@/components/doctor/AIDraftsQueue'
import DayScheduleChart from '@/components/doctor/DayScheduleChart'
import { useDoctorNotifications } from '@/hooks/useSSE'
import { Modal } from '@/components/dashboard/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { motion as m } from 'framer-motion'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { useTheme } from '@/lib/themeUtils'
import Link from 'next/link'

export default function DoctorDashboard() {
  const { user, token } = useAuth()
  const { isDark } = useTheme()
  const { isConnected } = useDoctorNotifications()
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientWithVitals | null>(null)
  const [vitals, setVitals] = useState<Vitals[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [nurseLogs, setNurseLogs] = useState<NurseLog[]>([])
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [dischargePending, setDischargePending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeMetric, setActiveMetric] = useState<'temperature' | 'heart_rate' | 'blood_pressure' | 'spo2'>(
    'temperature'
  )
  // Today's schedule
  const [schedule, setSchedule] = useState<Appointment[]>([])
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleActionId, setScheduleActionId] = useState<string | null>(null)

  // Modal states
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [showLabTestModal, setShowLabTestModal] = useState(false)
  const [showDischargeModal, setShowDischargeModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null)

  // Form states
  const [prescriptionForm, setPrescriptionForm] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    route: 'oral',
    duration_days: 7,
    instructions: '',
  })

  const [labTestForm, setLabTestForm] = useState({
    test_type: '',
    urgency: 'routine',
    notes: '',
  })

  const [dischargeForm, setDischargeForm] = useState({
    diagnosis: '',
    discharge_summary: '',
  })

  const [notesForm, setNotesForm] = useState({
    notes: '',
  })

  useEffect(() => {
    loadPatients()
  }, [])

  const todayDateStr = () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const loadTodaySchedule = async () => {
    if (!token || !user?.id) return
    try {
      setIsLoadingSchedule(true)
      setScheduleError(null)
      const appts = await apiClient.getAppointments(token, {
        doctor_id: user.id,
        start_date: todayDateStr(),
        end_date: todayDateStr(),
        limit: 100,
      })
      appts.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      setSchedule(appts)
    } catch (e: any) {
      setScheduleError(e?.message || 'Unable to load today\'s schedule')
    } finally {
      setIsLoadingSchedule(false)
    }
  }

  useEffect(() => { loadTodaySchedule() }, [token, user?.id])

  // Inline appointment action handlers
  const handleCheckIn = async (appt: Appointment) => {
    if (!token) return
    setScheduleActionId(appt.id)
    await promiseFeedback(apiClient.checkInAppointment(appt.id, token), {
      loading: 'Checking in...',
      success: 'Checked in',
      error: 'Failed to check in',
    })
    setScheduleActionId(null)
    await loadTodaySchedule()
  }

  const handleStart = async (appt: Appointment) => {
    if (!token) return
    setScheduleActionId(appt.id)
    await promiseFeedback(apiClient.updateAppointment(appt.id, { status: 'in_progress' }, token), {
      loading: 'Starting visit...',
      success: 'Visit started',
      error: 'Failed to start',
    })
    setScheduleActionId(null)
    await loadTodaySchedule()
  }

  const handleComplete = async (appt: Appointment) => {
    if (!token) return
    setScheduleActionId(appt.id)
    await promiseFeedback(apiClient.updateAppointment(appt.id, { status: 'completed' }, token), {
      loading: 'Completing visit...',
      success: 'Visit completed',
      error: 'Failed to complete',
    })
    setScheduleActionId(null)
    await loadTodaySchedule()
  }

  const handleCancel = (appt: Appointment) => {
    setAppointmentToCancel(appt)
    setCancelReason('')
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async () => {
    if (!token || !appointmentToCancel) return
    const appt = appointmentToCancel
    setScheduleActionId(appt.id)
    await promiseFeedback(
      apiClient.cancelAppointment(appt.id, { cancellation_reason: cancelReason || 'Cancelled by doctor' }, token),
      {
        loading: 'Cancelling...',
        success: 'Appointment cancelled',
        error: 'Failed to cancel',
      }
    )
    setScheduleActionId(null)
    setShowCancelModal(false)
    setAppointmentToCancel(null)
    setCancelReason('')
    await loadTodaySchedule()
  }

  useEffect(() => {
    if (selectedPatient) {
      loadPatientData(selectedPatient.id)
    }
  }, [selectedPatient])

  // Check if discharge request is pending for current visit
  useEffect(() => {
    const run = async () => {
      if (!token || !selectedPatient?.active_visit_id) { setDischargePending(false); return }
      try {
        const cs = await apiClient.getCaseSheetByVisit(token, selectedPatient.active_visit_id)
        const p = await apiClient.getPendingAcknowledgments(token, cs.id)
        const pending = (p?.pending_events || []).some((pe: any) => pe?.event?.event_type === 'discharge_request')
        setDischargePending(pending)
      } catch {
        setDischargePending(false)
      }
    }
    run()
  }, [token, selectedPatient?.active_visit_id])

  const loadPatients = async () => {
    if (!token) return
    try {
      setIsLoading(true)
      setError(null)
      const data = await apiClient.getMyPatients(token)
      setPatients(data)
      if (data.length > 0 && !selectedPatient) {
        setSelectedPatient(data[0])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load patients')
    } finally {
      setIsLoading(false)
    }
  }

  // Derived analytics for charts
  const rxTrend = useMemo(() => {
    // last 7 days inclusive
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().split('T')[0]
      return { key, label: `${d.getMonth() + 1}/${d.getDate()}`, pending: 0, dispensed: 0 }
    })
    const map = new Map(days.map(d => [d.key, d]))
    for (const rx of prescriptions) {
      const dateKey = (rx.start_date || rx.created_at || '').slice(0, 10)
      const entry = map.get(dateKey)
      if (entry) {
        if (rx.status === 'dispensed' || rx.dispensed_at) entry.dispensed += 1
        else entry.pending += 1
      }
    }
    return days
  }, [prescriptions])

  const vitalsSpark = useMemo(() => {
    // compact sparkline for active metric over last 20 vitals
    const last = vitals.slice(-20)
    return last.map(v => ({
      t: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hr: v.heart_rate ?? null,
      temp: v.temperature ?? null,
      spo2: v.spo2 ?? null,
      bp: v.blood_pressure_systolic ?? null,
    }))
  }, [vitals])

  const loadPatientData = async (patientId: string) => {
    if (!token) return
    try {
      setIsLoadingPatientData(true)
      const [vitalsData, prescriptionsData, nurseLogsData, labTestsData] = await Promise.all([
        apiClient.getPatientVitals(patientId, token, 50),
        apiClient.getPatientPrescriptions(patientId, token),
        apiClient.getPatientNurseLogs(patientId, token, 50),
        apiClient.getPatientLabTests(patientId, token),
      ])
      setVitals(vitalsData)
      setPrescriptions(prescriptionsData)
      setNurseLogs(nurseLogsData)
      setLabTests(labTestsData)
    } catch (err: any) {
      console.error('Failed to load patient data:', err)
    } finally {
      setIsLoadingPatientData(false)
    }
  }

  const handleCreatePrescription = async () => {
    if (!token || !selectedPatient || !selectedPatient.active_visit_id) return

    await promiseFeedback(
      apiClient.createPrescription({
        patient_id: selectedPatient.id,
        visit_id: selectedPatient.active_visit_id,
        start_date: new Date().toISOString().split('T')[0],
        ...prescriptionForm,
      }, token),
      {
        loading: 'Creating prescription...',
        success: 'Prescription created successfully!',
        error: 'Failed to create prescription',
      }
    )

    setShowPrescriptionModal(false)
    setPrescriptionForm({
      medication_name: '',
      dosage: '',
      frequency: '',
      route: 'oral',
      duration_days: 7,
      instructions: '',
    })
    await loadPatientData(selectedPatient.id)
  }

  const handleOrderLabTest = async () => {
    if (!token || !selectedPatient || !selectedPatient.active_visit_id) return

    await promiseFeedback(
      apiClient.orderLabTest({
        patient_id: selectedPatient.id,
        visit_id: selectedPatient.active_visit_id,
        ...labTestForm,
      }, token),
      {
        loading: 'Ordering lab test...',
        success: 'Lab test ordered successfully!',
        error: 'Failed to order lab test',
      }
    )

    setShowLabTestModal(false)
    setLabTestForm({
      test_type: '',
      urgency: 'routine',
      notes: '',
    })
    await loadPatientData(selectedPatient.id)
  }

  const handleRequestDischarge = async () => {
    if (!token || !selectedPatient || !selectedPatient.active_visit_id) return

    await promiseFeedback(
      (async () => {
        // Find case sheet for current visit
        let caseSheetId: string | null = null
        try {
          const cs = await apiClient.getCaseSheetByVisit(token, selectedPatient.active_visit_id!)
          caseSheetId = cs.id
        } catch (e) {
          throw new Error('No case sheet found for this visit. Please ensure the case sheet is created before requesting discharge.')
        }
        // Post discharge request event requiring acknowledgment by reception
        if (!caseSheetId) throw new Error('Unable to locate case sheet for this visit')
        await apiClient.addCaseSheetEvent(token, caseSheetId, {
          event_type: 'discharge_request',
          description: `Requesting discharge for patient ${selectedPatient.first_name} ${selectedPatient.last_name}. Diagnosis: ${dischargeForm.diagnosis}.`,
          event_data: {
            discharge_summary: dischargeForm.discharge_summary,
            diagnosis: dischargeForm.diagnosis,
            visit_id: selectedPatient.active_visit_id,
            patient_id: selectedPatient.id,
            mrn: selectedPatient.mrn,
          },
          requires_acknowledgment: true,
        })
        return { ok: true }
      })(),
      {
        loading: 'Submitting discharge request...',
        success: 'Discharge request sent to Reception ✅',
        error: 'Failed to submit discharge request',
      }
    )

    setShowDischargeModal(false)
    setDischargeForm({ diagnosis: '', discharge_summary: '' })
  }

  const handleAddNotes = async () => {
    if (!token || !selectedPatient || !selectedPatient.active_visit_id) return

    await promiseFeedback(
      (async () => {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/visits/${selectedPatient.active_visit_id}/notes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notesForm),
        })
        if (!response.ok) throw new Error('Failed to add notes')
        return response
      })(),
      {
        loading: 'Adding clinical notes...',
        success: 'Notes added successfully! 📝',
        error: 'Failed to add notes',
      }
    )

    setShowNotesModal(false)
    setNotesForm({ notes: '' })
    await loadPatientData(selectedPatient.id)
  }

  if (!user || user.role_name !== 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be a doctor to access this dashboard.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen p-8 theme-gradient-bg`}>
        <DashboardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center theme-gradient-bg`}>
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

  return (
    <EnterpriseDashboardLayout role="doctor">
      {/* Regional Banner */}
      <RegionalBanner />

      {/* Real-time alert system */}
      <RealTimeAlerts />
      <SSEConnectionStatus isConnected={isConnected} />

      <StandardDashboardLayout
        title="Doctor Dashboard"
        subtitle={`Welcome, Dr. ${user.first_name} ${user.last_name}`}
        chips={[
          { label: 'Live', color: 'blue' },
          { label: new Date().toLocaleDateString() }
        ]}
        actions={
          <>
            <FeedbackButton onClick={() => setShowPrescriptionModal(true)} variant="primary" className="shadow-sm">
              💊 Create Prescription
            </FeedbackButton>
            <FeedbackButton onClick={() => setShowLabTestModal(true)} variant="secondary" className="shadow-sm">
              🔬 Order Lab Test
            </FeedbackButton>
            <FeedbackButton onClick={() => setShowNotesModal(true)} variant="ghost" className="shadow-sm bg-white">
              📝 Add Notes
            </FeedbackButton>
            <FeedbackButton onClick={() => setShowDischargeModal(true)} variant="ghost" className="shadow-sm theme-btn-success">
              🚪 Discharge Patient
            </FeedbackButton>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/dashboard/doctor/patients" className="px-3 py-2 text-sm rounded-lg theme-card theme-text-primary hover:theme-btn-primary hover:text-white transition-colors">Patients</Link>
              <Link href="/dashboard/doctor/appointments" className="px-3 py-2 text-sm rounded-lg theme-card theme-text-primary hover:theme-btn-primary hover:text-white transition-colors">Appointments</Link>
              <Link href="/dashboard/doctor/prescriptions" className="px-3 py-2 text-sm rounded-lg theme-card theme-text-primary hover:theme-btn-primary hover:text-white transition-colors">Prescriptions</Link>
            </div>
          </>
        }
        showStats={true}
        stats={
          <>
            <StandardCard hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="theme-text-secondary">Patients Under Care</p>
                  <AnimatedNumber value={patients.length} className="text-3xl font-bold theme-text-primary" />
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl theme-gradient-primary-subtle theme-text-primary">👩‍⚕️</div>
              </div>
            </StandardCard>
            <StandardCard hover>
              <Link href="/dashboard/doctor/case-sheets" className="block">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="theme-text-secondary">Case Sheets</p>
                    <p className="text-3xl font-bold theme-text-primary">View</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl theme-gradient-success-subtle theme-text-primary">📄</div>
                </div>
              </Link>
            </StandardCard>
            <StandardCard hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="theme-text-secondary">Pending Rx (Selected)</p>
                  <AnimatedNumber value={prescriptions.filter(p => p.status === 'pending').length} className="text-3xl font-bold theme-text-primary" />
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl theme-gradient-accent-subtle theme-text-primary">💊</div>
              </div>
            </StandardCard>
          </>
        }
      >

      {/* Main Content */}
      {patients.length === 0 ? (
        <StandardCard className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 theme-gradient-primary-subtle`}>
              <svg className="w-10 h-10 theme-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2 theme-text-primary">No Patients Assigned</h2>
            <p className="theme-text-secondary">You currently have no patients assigned to you.</p>
          </div>
        </StandardCard>
      ) : (
        <StandardGridLayout
          sidebarPosition="left"
          sidebarWidth="medium"
          sidebar={
            <div className="space-y-4">
              {/* Today's Schedule */}
              <StandardCard
                title="Today's Schedule"
                actions={
                  <Link href="/dashboard/doctor/appointments" className="text-xs font-semibold text-primary-600 hover:underline">
                    View all
                  </Link>
                }
                  {isLoadingSchedule ? (
                  <div className="h-24 flex items-center justify-center text-sm theme-text-secondary">Loading...</div>
                ) : scheduleError ? (
                  <div className="text-sm text-error-600">{scheduleError}</div>
                ) : schedule.length === 0 ? (
                  <div className="text-sm theme-text-secondary">No appointments scheduled for today.</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {schedule.map((appt) => {
                      const start = new Date(appt.scheduled_at)
                      const end = new Date(start.getTime() + (Math.max(appt.duration_minutes || 30, 5) * 60000))
                      const time = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      const status = (appt.status || 'scheduled').toLowerCase()
                      const statusClass = status === 'completed'
                        ? 'theme-btn-success'
                        : status === 'in_progress'
                        ? 'theme-btn-primary'
                        : status === 'checked_in'
                        ? 'theme-btn-warning'
                        : status === 'cancelled' || status === 'no_show'
                        ? 'theme-btn-error'
                        : 'theme-card'
                      return (
                        <div key={appt.id} className="rounded-xl border theme-border p-3 hover:bg-gray-50/60">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold theme-text-primary flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold theme-card border theme-border">{time}</span>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold theme-btn-primary">{appt.appointment_type}</span>
                              </div>
                              <div className="mt-1 text-sm theme-text-secondary">
                                {appt.patient_name} <span className="text-gray-400">•</span> MRN {appt.patient_mrn}
                              </div>
                              {appt.reason && (
                                <div className="text-xs theme-text-muted mt-0.5 truncate">{appt.reason}</div>
                              )}
                              {/* Inline actions */}
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                {status === 'scheduled' && (
                                  <>
                                    <button disabled={scheduleActionId === appt.id} onClick={() => handleCheckIn(appt)} className="text-xs px-2 py-1 rounded-md theme-btn-warning disabled:opacity-60">Check-in</button>
                                    <button disabled={scheduleActionId === appt.id} onClick={() => handleCancel(appt)} className="text-xs px-2 py-1 rounded-md theme-btn-error disabled:opacity-60">Cancel</button>
                                  </>
                                )}
                                {status === 'checked_in' && (
                                  <>
                                    <button disabled={scheduleActionId === appt.id} onClick={() => handleStart(appt)} className="text-xs px-2 py-1 rounded-md theme-btn-primary disabled:opacity-60">Start</button>
                                    <button disabled={scheduleActionId === appt.id} onClick={() => handleCancel(appt)} className="text-xs px-2 py-1 rounded-md theme-btn-error disabled:opacity-60">Cancel</button>
                                  </>
                                )}
                                {status === 'in_progress' && (
                                  <>
                                    <button disabled={scheduleActionId === appt.id} onClick={() => handleComplete(appt)} className="text-xs px-2 py-1 rounded-md theme-btn-success disabled:opacity-60">Complete</button>
                                    <button disabled={scheduleActionId === appt.id} onClick={() => handleCancel(appt)} className="text-xs px-2 py-1 rounded-md theme-btn-error disabled:opacity-60">Cancel</button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>{status.replace('_',' ')}</span>
                              <Link href={`/dashboard/doctor/patients/${appt.patient_id}`} className="text-xs font-semibold theme-btn-primary hover:underline">Open</Link>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </StandardCard>

              {/* 30-min Day Chart */}
              <StandardCard>
                <DayScheduleChart appointments={schedule} />
              </StandardCard>

              <StandardCard title="My Patients">
                <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-2">
                  {patients.map((patient, index) => (
                    <motion.div
                      key={patient.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
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

              {/* AI Drafts Queue */}
              <AIDraftsQueue />
            </div>
          }
              <AnimatePresence mode="wait">
                {selectedPatient ? (
                  <motion.div
                    key={selectedPatient.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Patient Header */}
                    <div className={`glass backdrop-blur-xl rounded-2xl shadow-xl p-6 border ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h2 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${isDark ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white' : 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'}`}>
                              {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                            </div>
                            {selectedPatient.first_name} {selectedPatient.last_name}
                          </h2>
                          <div className={`flex items-center gap-4 mt-3 text-sm flex-wrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className={`px-3 py-1 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>MRN: {selectedPatient.mrn}</span>
                            <span className={`px-3 py-1 rounded-full capitalize ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>{selectedPatient.gender}</span>
                            <span className={`px-3 py-1 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>DOB: {new Date(selectedPatient.date_of_birth).toLocaleDateString()}</span>
                            {selectedPatient.blood_group && (
                              <span className="px-3 py-1 bg-error-50 text-error-700 rounded-full font-medium">Blood: {selectedPatient.blood_group}</span>
                            )}
                            {dischargePending && (
                              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-semibold">Discharge request pending</span>
                            )}
                          </div>
                          {selectedPatient.allergies && (
                            <div className="mt-3 px-4 py-2 bg-error-50 border-l-4 border-error-500 rounded-lg inline-block">
                              <p className="text-sm font-medium text-error-700">⚠️ Allergies: {selectedPatient.allergies}</p>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <Link href={`/dashboard/doctor/patients/${selectedPatient.id}`} className="px-4 py-2 rounded-xl bg-white border border-white/60 shadow hover:shadow-md text-primary-700 font-medium">
                            View Full Record
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex gap-3 flex-wrap"
                    >
                      <FeedbackButton
                        onClick={() => setShowPrescriptionModal(true)}
                        variant="primary"
                        className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Create Prescription
                      </FeedbackButton>
                      <FeedbackButton
                        onClick={() => setShowLabTestModal(true)}
                        variant="secondary"
                        className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        Order Lab Test
                      </FeedbackButton>
                      <FeedbackButton
                        onClick={() => setShowNotesModal(true)}
                        variant="ghost"
                        className="shadow-md hover:shadow-lg bg-white"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Add Notes
                      </FeedbackButton>
                      <FeedbackButton
                        onClick={() => setShowDischargeModal(true)}
                        variant="ghost"
                        className="shadow-md hover:shadow-lg bg-gradient-to-br from-success-50 to-success-100 text-success-700 hover:text-success-800"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Discharge Patient
                      </FeedbackButton>
                    </motion.div>
                    {/* Mobile Floating Action Button */}
                    <div className="md:hidden">
                      <button
                        aria-label="Open quick actions"
                        onClick={() => setShowActionsSheet(true)}
                        className="fixed bottom-24 right-6 z-30 rounded-full shadow-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-14 h-14 flex items-center justify-center text-2xl"
                      >
                        +
                      </button>
                    </div>

                    {isLoadingPatientData ? (
                      <div className="space-y-4">
                        <SkeletonCard className="h-64" />
                        <SkeletonCard className="h-48" />
                        <SkeletonCard className="h-48" />
                      </div>
                    ) : (
                      <>
                        {/* Vitals Chart */
                        }
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div className={`glass backdrop-blur-xl rounded-2xl shadow-xl p-6 border ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}>
                            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              <svg className={`w-5 h-5 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Vital Signs Monitoring
                            </h3>
                            <div className="flex gap-2 mb-4 flex-wrap">
                              {(['temperature', 'heart_rate', 'blood_pressure', 'spo2'] as const).map((metric) => (
                                <FeedbackButton
                                  key={metric}
                                  onClick={() => setActiveMetric(metric)}
                                  variant={activeMetric === metric ? 'primary' : 'ghost'}
                                  className={`${activeMetric === metric ? 'shadow-md' : 'bg-white hover:bg-gray-100 shadow-sm'} transition-all`}
                                  size="sm"
                                >
                                  {metric.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                </FeedbackButton>
                              ))}
                            </div>
                            <VitalsChart vitals={vitals} metric={activeMetric} />
                          </div>
                        </motion.div>

                        {/* Analytics: Prescriptions Trend & Sparkline */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
                        >
                          <div className={`glass backdrop-blur-xl rounded-2xl shadow-xl p-6 border ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}>
                            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Prescriptions (7 days)</h3>
                            <div className="w-full h-64">
                              <DoctorCharts rxTrend={rxTrend} vitalsSpark={vitalsSpark} />
                            </div>
                          </div>
                          <div className={`glass backdrop-blur-xl rounded-2xl shadow-xl p-6 border ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}>
                            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Vitals Sparkline</h3>
                            {/* Charts are lazily loaded via DoctorCharts to reduce initial bundle size */}
                            <div className="w-full h-64">
                              <DoctorCharts rxTrend={rxTrend} vitalsSpark={vitalsSpark} />
                            </div>
                          </div>
                        </motion.div>

                        {/* Clinical Data Grid */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="grid grid-cols-1 gap-6"
                        >
                          <PrescriptionsList prescriptions={prescriptions} />
                          <LabReportsList labTests={labTests} />
                        </motion.div>

                        {/* Nurse Logs */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <NurseLogFeed logs={nurseLogs} />
                        </motion.div>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <div className={`glass backdrop-blur-xl rounded-2xl shadow-xl p-12 border text-center ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}>
                    <svg className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Select a patient to view details</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

      {/* Create Prescription Modal */}
      <Modal
        isOpen={showPrescriptionModal}
        onClose={() => setShowPrescriptionModal(false)}
        title="Create Prescription"
        size="lg"
        footer={
          <>
            <FeedbackButton onClick={() => setShowPrescriptionModal(false)} variant="ghost">Cancel</FeedbackButton>
            <FeedbackButton
              onClickAsync={handleCreatePrescription}
              loadingText="Creating..."
              successText="Created!"
              variant="primary"
              disabled={!prescriptionForm.medication_name || !prescriptionForm.dosage || !prescriptionForm.frequency}
            >
              Create Prescription
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreatePrescription(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name *</label>
            <input type="text" required value={prescriptionForm.medication_name} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medication_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="e.g., Amoxicillin" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
              <input type="text" required value={prescriptionForm.dosage} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="e.g., 500mg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
              <input type="text" required value={prescriptionForm.frequency} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="e.g., Twice daily" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route *</label>
              <select value={prescriptionForm.route} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, route: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="oral">Oral</option>
                <option value="IV">IV</option>
                <option value="IM">IM</option>
                <option value="subcutaneous">Subcutaneous</option>
                <option value="topical">Topical</option>
                <option value="inhalation">Inhalation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
              <input type="number" min="1" value={prescriptionForm.duration_days} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration_days: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea value={prescriptionForm.instructions} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Additional instructions for the patient..." />
          </div>
        </form>
      </Modal>

      {/* Order Lab Test Modal */}
      <Modal
        isOpen={showLabTestModal}
        onClose={() => setShowLabTestModal(false)}
        title="Order Lab Test"
        size="md"
        footer={
          <>
            <FeedbackButton onClick={() => setShowLabTestModal(false)} variant="ghost">Cancel</FeedbackButton>
            <FeedbackButton
              onClickAsync={handleOrderLabTest}
              loadingText="Ordering..."
              successText="Ordered!"
              variant="primary"
              disabled={!labTestForm.test_type}
            >
              Order Lab Test
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleOrderLabTest(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
            <input type="text" required value={labTestForm.test_type} onChange={(e) => setLabTestForm({ ...labTestForm, test_type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="e.g., CBC, Lipid Panel, X-Ray" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency *</label>
            <select value={labTestForm.urgency} onChange={(e) => setLabTestForm({ ...labTestForm, urgency: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={labTestForm.notes} onChange={(e) => setLabTestForm({ ...labTestForm, notes: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Additional notes or special instructions..." />
          </div>
        </form>
      </Modal>

      {/* Discharge Patient Modal */}
      <Modal
        isOpen={showDischargeModal}
        onClose={() => setShowDischargeModal(false)}
  title="Request Discharge"
        size="lg"
        footer={
          <>
            <FeedbackButton onClick={() => setShowDischargeModal(false)} variant="ghost">Cancel</FeedbackButton>
            <FeedbackButton
              onClickAsync={handleRequestDischarge}
              loadingText="Sending..."
              successText="Sent!"
              variant="primary"
              disabled={!dischargeForm.diagnosis || !dischargeForm.discharge_summary}
            >
              Send Request
            </FeedbackButton>
          </>
        }
      >
  <form onSubmit={(e) => { e.preventDefault(); handleRequestDischarge(); }} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              This will send a discharge request to Reception. They will finalize the discharge and move records to global summaries.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Final Diagnosis *</label>
            <input type="text" required value={dischargeForm.diagnosis} onChange={(e) => setDischargeForm({ ...dischargeForm, diagnosis: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Enter the final diagnosis" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Summary *</label>
            <textarea required value={dischargeForm.discharge_summary} onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_summary: e.target.value })} rows={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Include treatment provided, patient condition, follow-up instructions, and any other relevant information..." />
          </div>
        </form>
      </Modal>

      {/* Add Clinical Notes Modal */}
      <Modal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        title="Add Clinical Notes"
        size="md"
        footer={
          <>
            <FeedbackButton onClick={() => setShowNotesModal(false)} variant="ghost">Cancel</FeedbackButton>
            <FeedbackButton
              onClickAsync={handleAddNotes}
              loadingText="Adding..."
              successText="Added!"
              variant="primary"
              disabled={!notesForm.notes}
            >
              Add Notes
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAddNotes(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes *</label>
            <textarea required value={notesForm.notes} onChange={(e) => setNotesForm({ ...notesForm, notes: e.target.value })} rows={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Enter your clinical observations, progress notes, or treatment updates..." />
          </div>
        </form>
      </Modal>

      {/* Cancel Appointment Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setAppointmentToCancel(null) }}
        title="Cancel Appointment"
        size="md"
        footer={
          <>
            <FeedbackButton onClick={() => { setShowCancelModal(false); setAppointmentToCancel(null) }} variant="ghost">Close</FeedbackButton>
            <FeedbackButton
              onClickAsync={handleConfirmCancel}
              loadingText="Cancelling..."
              successText="Cancelled!"
              variant="primary"
              disabled={!cancelReason}
            >
              Confirm Cancel
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleConfirmCancel() }} className="space-y-4">
          <div className="text-sm text-gray-600">
            Please provide a reason for cancelling this appointment.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Reason *</label>
            <textarea
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Patient unavailable, scheduling conflict, etc."
            />
          </div>
        </form>
      </Modal>

      {/* Mobile Actions Sheet */}
      <Modal
        isOpen={showActionsSheet}
        onClose={() => setShowActionsSheet(false)}
        title="Quick Actions"
        size="sm"
        footer={null}
      >
        <div className="grid gap-3">
          <button
            onClick={() => { setShowActionsSheet(false); setShowPrescriptionModal(true) }}
            className="w-full px-4 py-3 rounded-xl border text-left hover:bg-gray-50"
          >
            💊 Create Prescription
          </button>
          <button
            onClick={() => { setShowActionsSheet(false); setShowLabTestModal(true) }}
            className="w-full px-4 py-3 rounded-xl border text-left hover:bg-gray-50"
          >
            🔬 Order Lab Test
          </button>
          <button
            onClick={() => { setShowActionsSheet(false); setShowNotesModal(true) }}
            className="w-full px-4 py-3 rounded-xl border text-left hover:bg-gray-50"
          >
            📝 Add Notes
          </button>
          <button
            onClick={() => { setShowActionsSheet(false); setShowDischargeModal(true) }}
            className="w-full px-4 py-3 rounded-xl border text-left hover:bg-gray-50"
          >
            🚪 Discharge Patient
          </button>
        </div>
      </Modal>
    </EnterpriseDashboardLayout>
  )
}

// removed local AnimatedNumber; using shared component
