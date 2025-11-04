'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type Appointment, type Patient } from '@/lib/api'

export default function PatientBillingPage() {
  const { user, token } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

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
        const [p, appts] = await Promise.all([
          apiClient.getPatient(patientId, token).catch(() => null),
          apiClient.getAppointments(token, { patient_id: patientId }).catch(() => []),
        ])
        if (!ignore) { setPatient(p); setAppointments(appts) }
      } catch (e: any) {
        if (!ignore) setError('Failed to load billing context')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token, user?.id, user?.email])

  // No invoices endpoint available yet; display honest state and summarize recent visits
  const stats = useMemo(() => ({ total: 0, paid: 0, pending: 0, overdue: 0 }), [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <EnterpriseDashboardLayout role="patient">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/patient" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Billing & Insurance</h1>
            <p className="text-gray-600 mt-1">Manage payments and insurance claims</p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h2 className="text-2xl font-bold">{patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}</h2>
              <p className="text-white/80">{patient ? `MRN: ${patient.mrn}` : '—'}</p>
            </div>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
        <>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Billed', value: `$${stats.total}`, color: 'from-blue-500 to-indigo-500', icon: '💰' },
            { label: 'Paid', value: `$${stats.paid}`, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Pending', value: `$${stats.pending}`, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
            { label: 'Overdue', value: `$${stats.overdue}`, color: 'from-red-500 to-rose-500', icon: '⚠️' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <span className="text-5xl opacity-20">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Honest state: Billing integration */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
          Billing and insurance integration is not available in the current backend. Below is a summary of your recent visits; contact billing for invoices and payments.
        </div>

        {/* Recent Visits (as billing context) */}
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <span className="text-6xl mb-4 block">🧾</span>
              <p className="text-gray-500">No visits found to summarize billing.</p>
            </div>
          ) : (
          <>
            {appointments.map((apt, index) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-green-300 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{apt.appointment_type}</h3>
                    <p className="text-gray-600">Dr. {apt.doctor_name} • {apt.hospital_name}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-xs font-bold ${apt.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {apt.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Invoice Date</p>
                    <p className="font-bold text-gray-900">{new Date(apt.scheduled_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-bold text-gray-900">{apt.duration_minutes} min</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-bold text-gray-500 text-xl">—</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      const blob = new Blob([`Visit Summary\n\nDoctor: ${apt.doctor_name}\nType: ${apt.appointment_type}\nDate: ${new Date(apt.scheduled_at).toLocaleString()}\nHospital: ${apt.hospital_name}`], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `visit-${apt.id}.txt`; a.click(); URL.revokeObjectURL(url);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
                  >
                    📄 Download Visit Summary
                  </button>
                </div>
              </motion.div>
            ))}
          </>
          )}
        </div>

        {/* No payment modal since billing is not integrated */}
        <AnimatePresence></AnimatePresence>
        </>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
