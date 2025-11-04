'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { RegionalBanner } from '@/components/branding/RegionalBanner'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { promiseFeedback } from '@/lib/activityFeedback'
import { apiClient, Bed, PatientWithVitals, BedAvailability, Appointment, Patient } from '@/lib/api'
import { BedBoard } from '@/components/operations/BedBoard'
import { KPICard } from '@/components/dashboard/KPICard'
import { OperationalIntelligence } from '@/components/intelligence/OperationalIntelligence'
import { Modal } from '@/components/dashboard/Modal'
import { AppointmentCalendar } from '@/components/operations/AppointmentCalendar'
import { PatientSearch } from '@/components/operations/PatientSearch'
import { QRScanner } from '@/components/qr/QRScanner'
import { QRGenerator } from '@/components/qr/QRGenerator'
import { DragDropBedAssignment } from '@/components/beds/DragDropBedAssignment'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { useSocket } from '@/components/providers/SocketProvider'
import { useTheme } from '@/lib/themeUtils'
import SectionHeader from '@/components/common/SectionHeader'
const ManagerCharts = dynamic(() => import('@/components/manager/ManagerCharts'), { ssr: false })

export default function ManagerDashboard() {
  const { user, token } = useAuth()
  const { isDark } = useTheme()
  const [beds, setBeds] = useState<Bed[]>([])
  const [bedStats, setBedStats] = useState<BedAvailability | null>(null)
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'overview' | 'beds' | 'appointments' | 'patients' | 'intelligence'>('overview')
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const { subscribe } = useSocket()

  // Modal states
  const [showAdmitModal, setShowAdmitModal] = useState(false)
  const [showAssignBedModal, setShowAssignBedModal] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [qrPatientId, setQrPatientId] = useState<string>('')
  const [qrPatientName, setQrPatientName] = useState<string>('')
  const [useDragDropBeds, setUseDragDropBeds] = useState(true)

  // Form states
  const [admitForm, setAdmitForm] = useState({
    // Patient info
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
    blood_group: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    allergies: '',
    // Visit info
    reason_for_visit: '',
    visit_type: 'inpatient',
  })

  const [assignBedForm, setAssignBedForm] = useState({
    patient_id: '',
    bed_id: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  // Load today's appointments for overview analytics
  useEffect(() => {
    if (activeTab === 'overview') {
      const today = new Date()
      const startOfDay = new Date(today)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)
      ;(async () => {
        if (!token || !user?.hospital_id) return
        try {
          const data = await apiClient.getAppointments(token, {
            hospital_id: user.hospital_id,
            start_date: startOfDay.toISOString(),
            end_date: endOfDay.toISOString(),
          })
          setTodayAppointments(data)
        } catch (err) {
          // non-blocking
          console.warn('Failed to load today appointments for overview')
        }
      })()
    }
  }, [activeTab, token, user?.hospital_id])

  // Live updates via sockets (if enabled)
  useEffect(() => {
    if (!user?.hospital_id) return
    // Refetch when beds or appointments update at hospital level
    const unsubBeds = subscribe(`hospital:${user.hospital_id}:beds`, () => {
      loadData()
    })
    const unsubAppts = subscribe(`hospital:${user.hospital_id}:appointments`, () => {
      // refresh today's appointments dataset
      if (activeTab === 'overview') {
        const today = new Date()
        const startOfDay = new Date(today)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(today)
        endOfDay.setHours(23, 59, 59, 999)
        if (token) {
          apiClient.getAppointments(token, {
            hospital_id: user.hospital_id!,
            start_date: startOfDay.toISOString(),
            end_date: endOfDay.toISOString(),
          }).then(setTodayAppointments).catch(() => {})
        }
      }
      if (activeTab === 'appointments') {
        loadAppointments()
      }
    })
    return () => {
      unsubBeds()
      unsubAppts()
    }
  }, [user?.hospital_id, token, activeTab])

  useEffect(() => {
    if (activeTab === 'appointments') {
      loadAppointments()
    }
  }, [selectedDate, activeTab])

  const loadData = async () => {
    if (!token || !user?.hospital_id) return
    try {
      setIsLoading(true)
      setError(null)
      const [bedsData, statsData, patientsData, allPatientsData] = await Promise.all([
        apiClient.getBeds(user.hospital_id, token),
        apiClient.getBedAvailability(user.hospital_id, token),
        apiClient.getNursePatients(token),
        loadAllPatients(),
      ])
      setBeds(bedsData)
      setBedStats(statsData)
      setPatients(patientsData)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllPatients = async () => {
    if (!token || !user?.hospital_id) return []
    try {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/patients/search?hospital_id=${user.hospital_id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to load patients')
      const data = await response.json()
      setAllPatients(data)
      return data
    } catch (err) {
      console.error('Failed to load all patients:', err)
      return []
    }
  }

  const loadAppointments = async () => {
    if (!token || !user?.hospital_id) return
    try {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)
      const data = await apiClient.getAppointments(token, {
        hospital_id: user.hospital_id,
        start_date: startOfDay.toISOString(),
        end_date: endOfDay.toISOString(),
      })
      setAppointments(data)
    } catch (err: any) {
      console.error('Failed to load appointments:', err)
    }
  }

  const handlePatientSearch = async (query: string): Promise<Patient[]> => {
    if (!token || !user?.hospital_id) return []
    try {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/patients/search?q=${encodeURIComponent(query)}&hospital_id=${user.hospital_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Search failed')
      return await response.json()
    } catch (err) {
      console.error('Search error:', err)
      return []
    }
  }

  const handleCheckIn = async (appointmentId: string) => {
    if (!token) return
    await promiseFeedback(
      apiClient.checkInAppointment(appointmentId, token),
      {
        loading: 'Checking in...',
        success: 'Patient checked in successfully!',
        error: 'Failed to check in',
      }
    )
    await loadAppointments()
  }

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const handleReleaseBed = async (bedId: string) => {
    if (!token) return

    await promiseFeedback(
      apiClient.releaseBed(bedId, token),
      {
        loading: 'Releasing bed...',
        success: 'Bed released successfully!',
        error: 'Failed to release bed',
      }
    )

    await loadData()
  }

  // Derived analytics for charts
  const occupancyData = useMemo(() => {
    if (!bedStats) return [] as { name: string; value: number }[]
    return [
      { name: 'Occupied', value: bedStats.occupied || 0 },
      { name: 'Available', value: bedStats.available || 0 },
      { name: 'Maintenance', value: bedStats.maintenance || 0 },
    ]
  }, [bedStats])

  const appointmentsByHour = useMemo(() => {
    const buckets: { [hour: string]: number } = {}
    for (let i = 0; i < 24; i++) buckets[i.toString().padStart(2, '0')] = 0
    for (const appt of todayAppointments) {
      const d = appt.scheduled_at ? new Date(appt.scheduled_at) : appt.created_at ? new Date(appt.created_at) : null
      if (!d) continue
      const hour = d.getHours().toString().padStart(2, '0')
      buckets[hour] = (buckets[hour] || 0) + 1
    }
    return Object.entries(buckets).map(([hour, count]) => ({ hour, count }))
  }, [todayAppointments])

  const appointments7Day = useMemo(() => {
    // last 7 days including today
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().split('T')[0]
      return { key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 }
    })
    const map = new Map(days.map(d => [d.key, d]))
    for (const appt of todayAppointments) {
      const sched = appt.scheduled_at?.slice(0, 10)
      if (sched && map.has(sched)) {
        map.get(sched)!.count += 1
      }
    }
    return days
  }, [todayAppointments])

  const todayStatusData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of todayAppointments) {
      const s = a.status || 'scheduled'
      counts[s] = (counts[s] || 0) + 1
    }
    const order = ['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show']
    return order
      .filter(k => counts[k])
      .map(k => ({ name: k.replace(/_/g, ' '), value: counts[k] }))
  }, [todayAppointments])

  const handleAdmitPatient = async () => {
    if (!token || !user?.hospital_id) return

    await promiseFeedback(
      (async () => {
        // Create patient first
        const patientData = await apiClient.createPatient({
          hospital_id: user.hospital_id!,
          first_name: admitForm.first_name,
          last_name: admitForm.last_name,
          date_of_birth: admitForm.date_of_birth,
          gender: admitForm.gender as 'male' | 'female' | 'other',
          blood_group: admitForm.blood_group || undefined,
          phone: admitForm.phone || undefined,
          email: admitForm.email || undefined,
          address: admitForm.address || undefined,
          emergency_contact_name: admitForm.emergency_contact_name || undefined,
          emergency_contact_phone: admitForm.emergency_contact_phone || undefined,
          allergies: admitForm.allergies || undefined,
        }, token)

        // Create visit (admission)
        await apiClient.createVisit({
          patient_id: patientData.id,
          hospital_id: user.hospital_id!,
          visit_type: admitForm.visit_type as 'inpatient' | 'outpatient' | 'emergency',
          reason_for_visit: admitForm.reason_for_visit,
        }, token)

        return patientData
      })(),
      {
        loading: 'Admitting patient...',
        success: 'Patient admitted successfully!',
        error: 'Failed to admit patient',
      }
    )

    setShowAdmitModal(false)
    setAdmitForm({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'male',
      blood_group: '',
      phone: '',
      email: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      allergies: '',
      reason_for_visit: '',
      visit_type: 'inpatient',
    })
    await loadData()
  }

  const handleAssignBed = async () => {
    if (!token) return

    await promiseFeedback(
      (async () => {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/beds/${assignBedForm.bed_id}/assign`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ patient_id: assignBedForm.patient_id }),
        })
        if (!response.ok) throw new Error('Failed to assign bed')
        return response
      })(),
      {
        loading: 'Assigning bed...',
        success: 'Bed assigned successfully!',
        error: 'Failed to assign bed',
      }
    )

    setShowAssignBedModal(false)
    setAssignBedForm({ patient_id: '', bed_id: '' })
    await loadData()
  }

  const handleQRScanSuccess = async (result: any) => {
    // Handle successful QR scan - check in patient
    await promiseFeedback(
      (async () => {
        // In real implementation, this would validate and check in the patient
    // console.log('QR Scan result:', result)
        return result
      })(),
      {
        loading: 'Processing check-in...',
        success: 'Patient checked in successfully!',
        error: 'Failed to process check-in',
      }
    )
    setShowQRScanner(false)
    await loadData()
  }

  const handleQRScanError = (error: string) => {
    console.error('QR Scan error:', error)
  }

  const handleGenerateQR = (patientId: string, patientName: string) => {
    setQrPatientId(patientId)
    setQrPatientName(patientName)
    setShowQRGenerator(true)
  }

  const handleDragDropAssignBed = async (bedId: string, patientId: string) => {
    if (!token) return

    const response = await fetch(`${apiClient['baseURL']}/api/v1/beds/${bedId}/assign`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ patient_id: patientId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to assign bed')
    }

    await loadData()
  }

  if (!user || user.role_name !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be a manager to access this dashboard.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen p-8 ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
        <DashboardSkeleton />
      </div>
    )
  }

  const availableBeds = beds.filter(b => b.status === 'available')
  const unassignedPatients = patients.filter(p => !beds.some(b => b.assigned_patient_id === p.id))

  return (
    <EnterpriseDashboardLayout role="manager">
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
      {/* Regional Banner */}
      <RegionalBanner />

      {/* Header */}
      <SectionHeader
        title="Manager Dashboard"
        subtitle={`Welcome, ${user.first_name} ${user.last_name}`}
        chips={[{ label: 'Live', color: 'blue' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
      />

      {/* Tab Navigation */}
      <div className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg rounded-2xl p-4">
        <div className="container mx-auto">
          <div className="flex gap-2 flex-wrap">
              <FeedbackButton
                onClick={() => setActiveTab('overview')}
                variant={activeTab === 'overview' ? 'primary' : 'ghost'}
                className={`shadow-md hover:shadow-lg transition-all ${activeTab === 'overview' ? '' : 'bg-white hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Overview
              </FeedbackButton>
              <FeedbackButton
                onClick={() => setActiveTab('beds')}
                variant={activeTab === 'beds' ? 'primary' : 'ghost'}
                className={`shadow-md hover:shadow-lg transition-all ${activeTab === 'beds' ? '' : 'bg-white hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Beds
              </FeedbackButton>
              <FeedbackButton
                onClick={() => setActiveTab('appointments')}
                variant={activeTab === 'appointments' ? 'primary' : 'ghost'}
                className={`shadow-md hover:shadow-lg transition-all ${activeTab === 'appointments' ? '' : 'bg-white hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Appointments
              </FeedbackButton>
              <FeedbackButton
                onClick={() => setActiveTab('patients')}
                variant={activeTab === 'patients' ? 'primary' : 'ghost'}
                className={`shadow-md hover:shadow-lg transition-all ${activeTab === 'patients' ? '' : 'bg-white hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Patients
              </FeedbackButton>
              <FeedbackButton
                onClick={() => setActiveTab('intelligence')}
                variant={activeTab === 'intelligence' ? 'primary' : 'ghost'}
                className={`shadow-md hover:shadow-lg transition-all ${activeTab === 'intelligence' ? '' : 'bg-white hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Intelligence
              </FeedbackButton>
      </div>
      </div>
      </div>

      <div className="container mx-auto px-6 py-6">
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Enhanced KPI Cards */}
            {bedStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-shadow ${isDark ? 'bg-gradient-to-br from-primary-900/40 to-primary-800/40 border-primary-700/50 text-white' : 'bg-gradient-to-br from-primary-500 to-primary-600 border-primary-400/30 text-white'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-white/80'}`}>Active</span>
                    </div>
                    <p className="text-4xl font-bold mb-1"><AnimatedNumber value={patients.length} /></p>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-white/90'}`}>Patients</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-shadow ${isDark ? 'bg-gradient-to-br from-success-900/40 to-success-800/40 border-success-700/50 text-white' : 'bg-gradient-to-br from-success-500 to-success-600 border-success-400/30 text-white'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-white/80'}`}>Available</span>
                    </div>
                    <p className="text-4xl font-bold mb-1"><AnimatedNumber value={bedStats.available} /></p>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-white/90'}`}>Beds</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-shadow ${isDark ? 'bg-gradient-to-br from-warning-900/40 to-warning-800/40 border-warning-700/50 text-white' : 'bg-gradient-to-br from-warning-500 to-warning-600 border-warning-400/30 text-white'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-white/80'}`}>Rate</span>
                    </div>
                    <p className="text-4xl font-bold mb-1"><AnimatedNumber value={bedStats.occupancy_rate} />%</p>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-white/90'}`}>Occupancy</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-shadow ${isDark ? 'bg-gradient-to-br from-secondary-900/40 to-secondary-800/40 border-secondary-700/50 text-white' : 'bg-gradient-to-br from-secondary-500 to-secondary-600 border-white/30 text-white'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-white/80'}`}>Total</span>
                    </div>
                    <p className="text-4xl font-bold mb-1"><AnimatedNumber value={allPatients.length} /></p>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-white/90'}`}>Registered</p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Analytics Row (lazy-loaded charts) */}
            {bedStats && (
              <ManagerCharts occupancyData={occupancyData} appointmentsByHour={appointmentsByHour} appointments7Day={appointments7Day} todayStatusData={todayStatusData} />
            )}

            {/* Status Distribution (moved into ManagerCharts) */}

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`glass backdrop-blur-xl rounded-2xl shadow-xl p-6 border mb-6 ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}
            >
              <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <FeedbackButton
                  onClick={() => setShowAdmitModal(true)}
                  variant="primary"
                  className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all p-4 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Admit Patient
                </FeedbackButton>
                <FeedbackButton
                  onClick={() => setShowQRScanner(true)}
                  variant="primary"
                  className={`shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all p-4 flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-500 to-purple-600'}`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  QR Check-in
                </FeedbackButton>
                <FeedbackButton
                  onClick={() => setActiveTab('appointments')}
                  variant="secondary"
                  className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all p-4 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Appointments
                </FeedbackButton>
                <FeedbackButton
                  onClick={() => setActiveTab('beds')}
                  variant="ghost"
                  className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all p-4 flex items-center justify-center bg-white"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Manage Beds
                </FeedbackButton>
                <FeedbackButton
                  onClick={() => setActiveTab('patients')}
                  variant="ghost"
                  className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all p-4 flex items-center justify-center bg-white"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  View Patients
                </FeedbackButton>
              </div>
            </motion.div>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Search</h3>
              <PatientSearch
                onSelect={(patient) => {
                  // Navigate to patients tab and select patient
                  setActiveTab('patients')
                }}
                onSearch={handlePatientSearch}
              />
            </motion.div>
          </motion.div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Appointment Management</h2>
                <div className="flex items-center gap-3">
                  <FeedbackButton
                    onClick={() => handleDateChange(-1)}
                    variant="ghost"
                    className="!p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </FeedbackButton>
                  <div className="text-center min-w-[220px] glass bg-white/50 backdrop-blur-sm rounded-xl px-4 py-2">
                    <p className="text-lg font-bold text-gray-900">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <FeedbackButton
                    onClick={() => handleDateChange(1)}
                    variant="ghost"
                    className="!p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </FeedbackButton>
                  <FeedbackButton
                    onClick={() => setSelectedDate(new Date())}
                    variant="ghost"
                    className="border border-primary-300 text-primary-600 hover:bg-primary-50 rounded-lg px-4 py-2 font-medium"
                  >
                    Today
                  </FeedbackButton>
                </div>
              </div>
              <AppointmentCalendar
                appointments={appointments}
                selectedDate={selectedDate}
                onAppointmentClick={setSelectedAppointment}
                onCheckIn={handleCheckIn}
              />
            </div>
          </motion.div>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Patient Directory</h2>
              <PatientSearch
                onSelect={(patient) => {
                  // Could open a patient details modal
    // console.log('Selected patient:', patient)
                }}
                onSearch={handlePatientSearch}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPatients.slice(0, 50).map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-4 border border-white/50 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{patient.first_name} {patient.last_name}</h3>
                      <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      patient.is_active ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {patient.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    {patient.email && <p>📧 {patient.email}</p>}
                    {patient.phone && <p>📞 {patient.phone}</p>}
                    {patient.blood_group && (
                      <p className="text-error-700 font-medium">🩸 {patient.blood_group}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Intelligence Tab */}
        {activeTab === 'intelligence' && user?.hospital_id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <OperationalIntelligence hospitalId={user.hospital_id} />
          </motion.div>
        )}

        {/* Bed Management Tab */}
        {activeTab === 'beds' && (
          <>
            {/* KPI Cards */}
            {bedStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="glass bg-gradient-to-br from-primary-500 to-primary-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                      </div>
                      <span className="text-white/80 text-sm font-medium">Total</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{bedStats.total}</p>
                    <p className="text-white/90 text-sm">Total Beds</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="glass bg-gradient-to-br from-success-500 to-success-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white/80 text-sm font-medium">Ready</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{bedStats.available}</p>
                    <p className="text-white/90 text-sm">Available Beds</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="glass bg-gradient-to-br from-error-500 to-error-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white/80 text-sm font-medium">Rate</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{bedStats.occupied}</p>
                    <p className="text-white/90 text-sm">{bedStats.occupancy_rate}% Occupancy</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="glass bg-gradient-to-br from-warning-500 to-warning-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white/80 text-sm font-medium">Repair</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{bedStats.maintenance}</p>
                    <p className="text-white/90 text-sm">Under Maintenance</p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-4 mb-8 flex-wrap"
            >
              <FeedbackButton
                onClick={() => setShowAdmitModal(true)}
                variant="primary"
                className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Admit Patient
              </FeedbackButton>
              <FeedbackButton
                onClick={() => setShowAssignBedModal(true)}
                variant="secondary"
                className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                disabled={availableBeds.length === 0 || unassignedPatients.length === 0}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Assign Bed
              </FeedbackButton>
            </motion.div>

            <div className="grid grid-cols-12 gap-6">
              {/* Drag-Drop Bed Assignment */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="col-span-12"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    {useDragDropBeds ? 'Drag & Drop Bed Assignment' : 'Bed Overview'}
                  </h2>
                  <FeedbackButton
                    onClick={() => setUseDragDropBeds(!useDragDropBeds)}
                    variant="ghost"
                    className="text-sm border border-gray-300"
                  >
                    {useDragDropBeds ? 'Switch to Grid View' : 'Switch to Drag & Drop'}
                  </FeedbackButton>
                </div>
                {useDragDropBeds ? (
                  <DragDropBedAssignment
                    beds={beds}
                    waitingPatients={unassignedPatients}
                    onAssignBed={handleDragDropAssignBed}
                    onReleaseBed={handleReleaseBed}
                  />
                ) : (
                  <BedBoard beds={beds} onBedClick={setSelectedBed} onRelease={handleReleaseBed} />
                )}
              </motion.div>

              {/* Sidebar - Only show in grid view */}
              {!useDragDropBeds && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="col-span-12 lg:col-span-4"
                >
                <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Active Patients
                  </h3>
                  {patients.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No active patients</p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {patients.map((patient) => (
                        <motion.div
                          key={patient.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors hover:shadow-md"
                        >
                          <p className="font-semibold text-gray-900">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
                          {patient.has_abnormal_vitals && (
                            <div className="mt-2 px-2 py-1 bg-error-50 border border-error-200 rounded text-xs text-error-700 font-medium">
                              ⚠️ Abnormal vitals
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedBed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Bed Details
                      </h3>
                      <FeedbackButton
                        onClick={() => setSelectedBed(null)}
                        variant="ghost"
                        className="!p-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </FeedbackButton>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                        <span className="text-gray-600">Bed Number:</span>
                        <span className="ml-2 font-bold text-primary-900">{selectedBed.bed_number}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Ward:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedBed.ward}</span>
                      </div>
                      {selectedBed.floor && (
                        <div>
                          <span className="text-gray-600">Floor:</span>
                          <span className="ml-2 font-medium text-gray-900">{selectedBed.floor}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <span className="ml-2 font-medium text-gray-900 capitalize">{selectedBed.bed_type}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                          selectedBed.status === 'available' ? 'bg-success-100 text-success-800' :
                          selectedBed.status === 'occupied' ? 'bg-error-100 text-error-800' :
                          'bg-warning-100 text-warning-800'
                        }`}>
                          {selectedBed.status}
                        </span>
                      </div>
                      {selectedBed.assigned_patient_name && (
                        <>
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-gray-600 mb-2">Assigned Patient:</p>
                            <p className="font-semibold text-gray-900">{selectedBed.assigned_patient_name}</p>
                            <p className="text-gray-600">MRN: {selectedBed.assigned_patient_mrn}</p>
                          </div>
                          {selectedBed.assigned_at && (
                            <div>
                              <span className="text-gray-600">Assigned:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {new Date(selectedBed.assigned_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Admit Patient Modal */}
      <Modal
        isOpen={showAdmitModal}
        onClose={() => setShowAdmitModal(false)}
        title="Admit New Patient"
        size="lg"
        footer={
          <>
            <FeedbackButton onClick={() => setShowAdmitModal(false)} variant="ghost">Cancel</FeedbackButton>
            <FeedbackButton
              onClickAsync={handleAdmitPatient}
              loadingText="Admitting..."
              successText="Admitted!"
              variant="primary"
              disabled={!admitForm.first_name || !admitForm.last_name || !admitForm.date_of_birth || !admitForm.reason_for_visit}
            >
              Admit Patient
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAdmitPatient(); }} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-primary-900 mb-2">Patient Information</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" required value={admitForm.first_name} onChange={(e) => setAdmitForm({ ...admitForm, first_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" required value={admitForm.last_name} onChange={(e) => setAdmitForm({ ...admitForm, last_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
              <input type="date" required value={admitForm.date_of_birth} onChange={(e) => setAdmitForm({ ...admitForm, date_of_birth: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select value={admitForm.gender} onChange={(e) => setAdmitForm({ ...admitForm, gender: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <input type="text" value={admitForm.blood_group} onChange={(e) => setAdmitForm({ ...admitForm, blood_group: e.target.value })} placeholder="A+" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={admitForm.phone} onChange={(e) => setAdmitForm({ ...admitForm, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={admitForm.email} onChange={(e) => setAdmitForm({ ...admitForm, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea value={admitForm.address} onChange={(e) => setAdmitForm({ ...admitForm, address: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
              <input type="text" value={admitForm.emergency_contact_name} onChange={(e) => setAdmitForm({ ...admitForm, emergency_contact_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
              <input type="tel" value={admitForm.emergency_contact_phone} onChange={(e) => setAdmitForm({ ...admitForm, emergency_contact_phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
            <textarea value={admitForm.allergies} onChange={(e) => setAdmitForm({ ...admitForm, allergies: e.target.value })} rows={2} placeholder="List any known allergies" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>

          <div className="bg-success-50 border border-success-200 rounded-lg p-4 mt-6">
            <h4 className="font-semibold text-success-900 mb-2">Visit Information</h4>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type *</label>
            <select value={admitForm.visit_type} onChange={(e) => setAdmitForm({ ...admitForm, visit_type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="inpatient">Inpatient</option>
              <option value="outpatient">Outpatient</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit *</label>
            <textarea required value={admitForm.reason_for_visit} onChange={(e) => setAdmitForm({ ...admitForm, reason_for_visit: e.target.value })} rows={3} placeholder="Describe the reason for admission" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        </form>
      </Modal>

      {/* Assign Bed Modal */}
      <Modal
        isOpen={showAssignBedModal}
        onClose={() => setShowAssignBedModal(false)}
        title="Assign Bed to Patient"
        size="md"
        footer={
          <>
            <FeedbackButton onClick={() => setShowAssignBedModal(false)} variant="ghost">Cancel</FeedbackButton>
            <FeedbackButton
              onClickAsync={handleAssignBed}
              loadingText="Assigning..."
              successText="Assigned!"
              variant="primary"
              disabled={!assignBedForm.patient_id || !assignBedForm.bed_id}
            >
              Assign Bed
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAssignBed(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient *</label>
            <select
              required
              value={assignBedForm.patient_id}
              onChange={(e) => setAssignBedForm({ ...assignBedForm, patient_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">-- Select Patient --</option>
              {unassignedPatients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name} (MRN: {patient.mrn})
                </option>
              ))}
            </select>
            {unassignedPatients.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">All patients are already assigned to beds</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Available Bed *</label>
            <select
              required
              value={assignBedForm.bed_id}
              onChange={(e) => setAssignBedForm({ ...assignBedForm, bed_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">-- Select Bed --</option>
              {availableBeds.map(bed => (
                <option key={bed.id} value={bed.id}>
                  {bed.bed_number} - {bed.ward} ({bed.bed_type})
                </option>
              ))}
            </select>
            {availableBeds.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">No beds available at the moment</p>
            )}
          </div>
        </form>
      </Modal>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onError={handleQRScanError}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {/* QR Generator Modal */}
      {showQRGenerator && qrPatientId && (
        <QRGenerator
          patientId={qrPatientId}
          patientName={qrPatientName}
          onClose={() => {
            setShowQRGenerator(false)
            setQrPatientId('')
            setQrPatientName('')
          }}
        />
      )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
