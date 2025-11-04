'use client'

import { useEffect, useMemo, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type Appointment, type Prescription, type LabTest, type Patient } from '@/lib/api'

export default function PatientRecordsPage() {
  const { user, token } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedVisit, setSelectedVisit] = useState<Appointment | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'prescriptions' | 'labs'>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token || !user) return
      setLoading(true); setError('')
      try {
        let patientId = user.id
        if (user.email) {
          const search = await apiClient.searchPatientGlobal(user.email, 'email', token).catch(() => null)
          if (search?.id) patientId = search.id
        }
        const [p, rx, tests, appts] = await Promise.all([
          apiClient.getPatient(patientId, token).catch(() => null),
          apiClient.getPatientPrescriptions(patientId, token).catch(() => []),
          apiClient.getPatientLabTests(patientId, token).catch(() => []),
          apiClient.getAppointments(token, { patient_id: patientId }).catch(() => []),
        ])
        if (!ignore) { setPatient(p); setPrescriptions(rx); setLabTests(tests); setAppointments(appts) }
      } catch (e: any) {
        if (!ignore) setError('Failed to load your medical records')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token, user?.id, user?.email])

  const stats = useMemo(() => ({
    visits: appointments.length,
    rx: prescriptions.length,
    labs: labTests.length,
    allergies: patient?.allergies ? patient.allergies.length : 0,
  }), [appointments, prescriptions, labTests, patient?.allergies])

  return (
    <EnterpriseDashboardLayout role="patient">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/patient" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
            <p className="text-gray-600 mt-1">Your complete medical history</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
          <div className="flex gap-2">
            {[{ id: 'overview', label: '📋 Overview' }, { id: 'visits', label: '🏥 Visits' }, { id: 'prescriptions', label: '💊 Rx' }, { id: 'labs', label: '🔬 Labs' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'}`}>{tab.label}</button>
            ))}
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
          </div>
        ) : (
        <>
        {activeTab === 'overview' && (<>
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">👤</div>
              <div>
                <h2 className="text-2xl font-bold">{patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}</h2>
                <p className="text-white/80">{patient ? `MRN: ${patient.mrn}` : '—'}</p>
                <div className="flex gap-4 mt-2 text-sm"><span>DOB: {patient ? new Date(patient.date_of_birth).toLocaleDateString() : '—'}</span><span>Gender: {patient?.gender || '—'}</span><span>Blood: {patient?.blood_group || '—'}</span></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[{ label: 'Visits', value: stats.visits, icon: '📅', color: 'from-blue-500 to-indigo-500' }, { label: 'Prescriptions', value: stats.rx, icon: '💊', color: 'from-purple-500 to-pink-500' }, { label: 'Lab Tests', value: stats.labs, icon: '🔬', color: 'from-teal-500 to-cyan-500' }, { label: 'Allergies', value: stats.allergies, icon: '⚠️', color: 'from-red-500 to-rose-500' }].map((stat, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}>
                <div className="flex items-center justify-between"><div><p className="text-white/80 text-sm mb-1">{stat.label}</p><p className="text-4xl font-bold">{stat.value}</p></div><span className="text-5xl opacity-20">{stat.icon}</span></div>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Full Name</span><span className="font-bold text-gray-900">{patient ? `${patient.first_name} ${patient.last_name}` : '—'}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Date of Birth</span><span className="font-bold text-gray-900">{patient ? new Date(patient.date_of_birth).toLocaleDateString() : '—'}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Gender</span><span className="font-bold text-gray-900">{patient?.gender || '—'}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Blood Group</span><span className="font-bold text-gray-900">{patient?.blood_group || '—'}</span></div>
                <div className="flex justify-between py-2"><span className="text-gray-600">Contact</span><span className="font-bold text-gray-900">{patient?.phone || patient?.contact_number || '—'}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Emergency Contact</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Name</span><span className="font-bold text-gray-900">{patient?.emergency_contact_name || '—'}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Phone</span><span className="font-bold text-gray-900">{patient?.emergency_contact_phone || '—'}</span></div>
              </div>
            </div>
          </div>
          {patient?.allergies && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-red-900 mb-4">⚠️ Known Allergies</h3>
              <div className="flex flex-wrap gap-3">{Array.isArray(patient.allergies) ? (patient.allergies as any[]).map((allergy: any, index: number) => (<span key={index} className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-bold">{String(allergy)}</span>)) : <span className="text-red-800">{String(patient.allergies)}</span>}</div>
            </div>
          )}
        </>)}

        {activeTab === 'visits' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Visit History</h3>
            <div className="space-y-3">
              {appointments.map((apt) => (
                <motion.div key={apt.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer" onClick={() => setSelectedVisit(apt)} whileHover={{ scale: 1.02 }}>
                  <div className="flex justify-between items-center"><div><p className="font-bold text-gray-900">{apt.doctor_name}</p><p className="text-sm text-gray-600">{apt.appointment_type}</p></div><div className="text-right"><p className="font-bold text-gray-900">{new Date(apt.scheduled_at).toLocaleDateString()}</p><p className="text-sm text-gray-600">{new Date(apt.scheduled_at).toLocaleTimeString()}</p></div></div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h4 className="font-bold text-lg text-gray-900">{rx.medication_name}</h4>
                <p className="text-gray-600 text-sm mb-4">{rx.prescribed_by_name ? `Dr. ${rx.prescribed_by_name}` : ''}</p>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Dosage:</span><span className="font-bold">{rx.dosage}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Frequency:</span><span className="font-bold">{rx.frequency}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Duration (days):</span><span className="font-bold">{rx.duration_days ?? '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Prescribed:</span><span className="font-bold">{new Date(rx.start_date).toLocaleDateString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'labs' && (
          <div className="space-y-4">
            {labTests.map((test) => (
              <div key={test.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div><h4 className="font-bold text-lg text-gray-900">{test.test_type}</h4><p className="text-gray-600 text-sm">Ordered by: {test.requested_by_name}</p></div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${test.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{test.status.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-gray-600">Ordered Date</p><p className="font-bold">{new Date(test.requested_at).toLocaleDateString()}</p></div>
                  {test.completed_at && (<div><p className="text-sm text-gray-600">Result Date</p><p className="font-bold">{new Date(test.completed_at).toLocaleDateString()}</p></div>)}
                </div>
                {test.result_summary && (<div className="mt-4 p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-600 mb-1">Result</p><p className="font-bold text-gray-900">{test.result_summary}</p></div>)}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {selectedVisit && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedVisit(null)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Visit Details</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-600">Doctor</p><p className="font-bold text-gray-900">{selectedVisit.doctor_name}</p></div>
                  <div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-600">Visit Type</p><p className="font-bold text-gray-900">{selectedVisit.appointment_type}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-600">Date</p><p className="font-bold text-gray-900">{new Date(selectedVisit.scheduled_at).toLocaleDateString()}</p></div>
                    <div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-600">Time</p><p className="font-bold text-gray-900">{new Date(selectedVisit.scheduled_at).toLocaleTimeString()}</p></div>
                  </div>
                  <button onClick={() => setSelectedVisit(null)} className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold shadow-lg">Close</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
