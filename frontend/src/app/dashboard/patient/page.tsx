'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { RegionalBanner } from '@/components/branding/RegionalBanner'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { BackButton } from '@/components/common/BackButton'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { infoFeedback, promiseFeedback } from '@/lib/activityFeedback'
import { apiClient, Patient, Prescription, LabTest, Appointment } from '@/lib/api'
import { HealthSummaryCard } from '@/components/patient/HealthSummaryCard'
import { LabReportsViewer } from '@/components/patient/LabReportsViewer'
import { MedicationSchedule } from '@/components/patient/MedicationSchedule'
import { AppointmentsList } from '@/components/patient/AppointmentsList'
import { QuickActionsPanel } from '@/components/patient/QuickActionsPanel'
import { HealthMetricsDashboard } from '@/components/patient/HealthMetricsDashboard'
import { PatientTopNav } from '@/components/patient/PatientTopNav'
import { MedicineBento } from '@/components/patient/MedicineBento'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import SectionHeader from '@/components/common/SectionHeader'

interface HealthSummary {
  overall_status: string
  latest_vitals?: {
    temperature?: number
    heart_rate?: number
    blood_pressure?: string
    spo2?: number
    recorded_at: string
  }
  active_conditions?: string[]
  allergies?: string
  risk_score?: number
  ai_summary?: string
  ai_approved: boolean
}

export default function PatientDashboard() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [patientRecord, setPatientRecord] = useState<Patient | null>(null)
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lightweight helpers for dose countdown in this file
  function todayKey() {
    return new Date().toISOString().slice(0, 10)
  }

  type TakenMap = Record<string, Record<string, Record<string, boolean>>>

  function readTaken(): TakenMap {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem('rx_taken') || '{}')
    } catch {
      return {}
    }
  }

  function isTaken(p: Prescription, slot: 'morning' | 'afternoon' | 'night') {
    const d = todayKey()
    const m = readTaken()
    return Boolean(m?.[d]?.[p.id]?.[slot])
  }

  function parseTimesLocal(frequency?: string) {
    const f = (frequency || '').toLowerCase()
    const buckets: Array<'morning' | 'afternoon' | 'night' | 'anytime'> = []
    if (!f) return ['anytime'] as const
    if (/(morning|breakfast|am|morn)/.test(f)) buckets.push('morning')
    if (/(noon|lunch|afternoon|midday|pm)/.test(f)) buckets.push('afternoon')
    if (/(night|bedtime|evening)/.test(f)) buckets.push('night')
    if (buckets.length === 0) {
      if (/once|od|qd|daily|1x|q24h/.test(f)) return ['anytime'] as const
      if (/twice|bd|2x|bid|q12h/.test(f)) return ['morning','night'] as const
      if (/thrice|tds|3x|tid|q8h/.test(f)) return ['morning','afternoon','night'] as const
    }
    return (buckets.length ? buckets : (['anytime'] as const))
  }

  function nextDoseAcross(rxs: Prescription[]): { mins: number; label: string } | null {
    const day = new Date()
    const now = day.getTime()
    const pref: Record<string, number> = { morning: 9, afternoon: 14, night: 21 }
    let best: number | null = null
    rxs.forEach(p => {
      const buckets = (p.times_of_day && p.times_of_day.length)
        ? (p.times_of_day.map(t => {
            const hh = Number(t.split(':')[0])
            if (isFinite(hh) && hh < 12) return 'morning'
            if (isFinite(hh) && hh < 18) return 'afternoon'
            return 'night'
          }))
        : (parseTimesLocal(p.frequency) as string[])
      const candidates: number[] = []
      ;(['morning','afternoon','night'] as const).forEach(slot => {
        if (buckets.includes(slot)) {
          // Skip slots already taken for this prescription today
          if (isTaken(p, slot)) return
          const d = new Date(day)
          d.setHours(pref[slot], slot === 'night' ? 30 : 0, 0, 0)
          candidates.push(d.getTime())
        }
      })
      const upcoming = candidates.filter(t => t >= now).sort((a,b)=>a-b)
      const target = upcoming[0]
      if (target) {
        if (best === null || target < best) best = target
      }
    })
    if (best === null) return null
    const mins = Math.max(0, Math.round((best - now)/60000))
    const h = Math.floor(mins/60); const m = mins%60
    const label = mins <= 0 ? 'now' : (h>0 ? `${h}h ${m}m` : `${m}m`)
    return { mins, label }
  }

  useEffect(() => {
    // Load when auth token and user become available
    loadPatientData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id])

  const loadPatientData = async () => {
    if (!token || !user) return

    try {
      setIsLoading(true)
      setError(null)

      // Prefer server-side mapping from authenticated user -> patient record
      let resolvedPatientId = ''
      const mePatient = await apiClient.getMyPatient(token).catch(() => null)
      if (mePatient && mePatient.id) {
        resolvedPatientId = mePatient.id
      } else if (user.email) {
        const search = await apiClient.searchPatientGlobal(user.email, 'email', token)
        if (search?.id) resolvedPatientId = search.id
      }

      const patientIdToUse = resolvedPatientId || user.id || ''

      const [patientData, prescriptionsData, labTestsData, appointmentsData] = await Promise.all([
        apiClient.getPatient(patientIdToUse, token).catch(() => null),
        apiClient.getPatientPrescriptions(patientIdToUse, token).catch(() => []),
        apiClient.getPatientLabTests(patientIdToUse, token).catch(() => []),
        apiClient.getAppointments(token, { patient_id: patientIdToUse }).catch(() => []),
      ])

      setPatientRecord(patientData)
      setPrescriptions(prescriptionsData)
      setLabTests(labTestsData)
      setAppointments(appointmentsData)

      // Do not synthesize mock summary. If backend provides computed summaries in future,
      // wire them here. For now, only show summary when we have meaningful data sources.
      setHealthSummary(null)
    } catch (err: any) {
      console.error('Failed to load patient data:', err)
      setError(err.message || 'Failed to load patient data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestReschedule = (appointmentId: string) => {
    router.push('/dashboard/patient/appointments')
  }

  const handleDownloadLabReport = async (testId: string) => {
    const test = labTests.find(t => t.id === testId)
    if (!test || !test.result_file_url) {
      return infoFeedback('No lab report available yet for this test.', 'warning')
    }
    await promiseFeedback(
      (async () => {
        // Open in a new tab/window; typically a pre-signed URL from MinIO/backend
        window.open(test.result_file_url!, '_blank', 'noopener,noreferrer')
      })(),
      {
        loading: 'Opening your report…',
        success: 'Report opened in a new tab',
        error: 'Failed to open report',
      }
    )
  }

  const handleBookAppointment = () => {
    router.push('/dashboard/patient/appointments')
  }

  const handleViewPrescriptions = () => {
    router.push('/dashboard/patient/prescriptions')
  }

  const handleViewRecords = () => {
    router.push('/dashboard/patient/records')
  }

  const handleContactDoctor = () => {
    router.push('/dashboard/messages')
  }

  if (!user || user.role_name !== 'patient') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-12 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be a patient to access this portal.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen theme-gradient-bg p-8">
        <DashboardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-12 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Data</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <FeedbackButton
            onClickAsync={loadPatientData}
            loadingText="Retrying..."
            successText="Loaded!"
            variant="primary"
          >
            Try Again
          </FeedbackButton>
        </div>
      </div>
    )
  }

  const upcomingAppointments = appointments.filter(a => a.status === 'scheduled').length
  const activeMedications = prescriptions.filter(p => p.status === 'active' || p.status === 'dispensed').length
  const nextDose = nextDoseAcross(prescriptions)

  const headerChips: { label: string; color?: 'blue' | 'gray' | 'green' | 'purple' | 'amber' | 'red' }[] = [
    ...(patientRecord?.mrn ? [{ label: `MRN: ${patientRecord.mrn}`, color: 'blue' as const }] : []),
    { label: new Date().toLocaleDateString(), color: 'gray' }
  ]

  return (
    <EnterpriseDashboardLayout role="patient">
      <div className="min-h-screen theme-gradient-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Regional Banner */}
        <RegionalBanner />

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <BackButton fallbackUrl="/dashboard/patient" />
        </motion.div>

        {/* Header */}
        <SectionHeader
          title="Patient Portal"
          subtitle={`Welcome back, ${user.first_name} ${user.last_name}`}
          chips={headerChips}
        />

        {/* Patient in-page top nav */}
        <PatientTopNav />

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-200/50"
            >
              <div className="flex-shrink-0 p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-900">{upcomingAppointments}</p>
                <p className="text-sm font-semibold text-blue-600">Upcoming Appointments</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-4 p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border border-purple-200/50"
            >
              <div className="flex-shrink-0 p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-900">{activeMedications}</p>
                <p className="text-sm font-semibold text-purple-600 flex items-center gap-2">
                  Active Medications
                  {nextDose && nextDose.mins <= 120 && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-700 border border-blue-200">
                      ⏱️ Next dose {nextDose.label}
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
        </div>

        {!patientRecord ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl shadow-soft-xl border border-gray-100 dark:border-gray-700"
          >
            <div className="max-w-md mx-auto px-6">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">No Patient Record Found</h2>
              <p className="text-gray-600 text-lg mb-8">Please contact the hospital administration to complete your profile setup.</p>
              <a
                href="mailto:support@hospital.com"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Support
              </a>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Quick Actions Panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-2"
            >
              {/* compact quick actions to save vertical space */}
              <QuickActionsPanel
                compact
                onBookAppointment={handleBookAppointment}
                onRequestPrescription={handleViewPrescriptions}
                onViewRecords={handleViewRecords}
                onContactDoctor={handleContactDoctor}
              />
            </motion.div>

            {/* New Medicine Bento (alive, not a traditional chart) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <MedicineBento prescriptions={prescriptions} />
            </motion.div>

            {/* Compact overview grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments (compact) */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                <AppointmentsList
                  appointments={appointments
                    .filter(a => new Date(a.scheduled_at).getTime() >= Date.now() && a.status === 'scheduled')
                    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                    .slice(0, 3)
                  }
                  onRequestReschedule={handleRequestReschedule}
                />
              </motion.div>

              {/* Lab reports (latest 2) */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                <LabReportsViewer labTests={[...labTests].sort((a,b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()).slice(0, 2)} />
              </motion.div>
            </div>

            {/* Vitals quick panel */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <HealthMetricsDashboard />
            </motion.div>
            
            {/* Profile link instead of full block to avoid long page */}
            <div className="text-right">
              <a href="/dashboard/patient/records" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">
                View full profile and records
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
