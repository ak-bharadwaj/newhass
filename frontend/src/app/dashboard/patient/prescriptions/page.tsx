'use client'

import { useEffect, useMemo, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type Prescription, type Patient } from '@/lib/api'

export default function PatientPrescriptions() {
  const { user, token } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
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
        const [p, rx] = await Promise.all([
          apiClient.getPatient(patientId, token).catch(() => null),
          apiClient.getPatientPrescriptions(patientId, token).catch(() => []),
        ])
        if (!ignore) { setPatient(p); setPrescriptions(rx) }
      } catch (e: any) {
        if (!ignore) setError('Failed to load your prescriptions')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token, user?.id, user?.email])

  const filteredPrescriptions = useMemo(() => {
    if (filterStatus === 'all') return prescriptions
    return prescriptions.filter(p => p.status === filterStatus)
  }, [prescriptions, filterStatus])

  const stats = useMemo(() => ({
    pending: prescriptions.filter(p => p.status !== 'dispensed' && p.status !== 'cancelled').length,
    dispensed: prescriptions.filter(p => p.status === 'dispensed' || !!p.dispensed_at).length,
    total: prescriptions.length
  }), [prescriptions])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'active':
        return 'bg-yellow-100 text-yellow-800'
      case 'dispensed':
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <EnterpriseDashboardLayout role="patient">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/patient" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Prescriptions</h1>
            <p className="text-gray-600 mt-1">View your prescribed medications</p>
          </div>
        </div>

        {/* Patient Info Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-6 shadow-lg">
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
          </div>
        ) : (
        <>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Pending', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
            { label: 'Dispensed', value: stats.dispensed, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Total', value: stats.total, color: 'from-purple-500 to-pink-500', icon: '💊' }
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
                  <p className="text-4xl font-bold">{stat.value}</p>
                </div>
                <span className="text-5xl opacity-20">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full md:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Prescriptions</option>
            <option value="pending">Pending</option>
            <option value="dispensed">Dispensed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Prescriptions List */}
        <div className="space-y-4">
          {filteredPrescriptions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <span className="text-6xl mb-4 block">💊</span>
              <p className="text-gray-500">No prescriptions found</p>
            </div>
          ) : (
            filteredPrescriptions.map((prescription, index) => (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedPrescription(prescription)}
                className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-purple-300 hover:shadow-xl transition-all p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{prescription.medication_name}</h3>
                    <p className="text-gray-600">Prescribed: {new Date(prescription.start_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-xs font-bold ${getStatusColor(prescription.status)}`}>
                    {prescription.status.toUpperCase()}
                  </span>
                </div>

                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">💊 Dosage</p>
                      <p className="font-bold text-gray-900">{prescription.dosage}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">⏰ Frequency</p>
                      <p className="font-bold text-gray-900">{prescription.frequency}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">📅 Duration (days)</p>
                      <p className="font-bold text-gray-900">{prescription.duration_days ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">🧪 Route</p>
                      <p className="font-bold text-gray-900">{prescription.route}</p>
                    </div>
                  </div>
                  {prescription.instructions && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">📝 {prescription.instructions}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Prescription Details Modal */}
        {selectedPrescription && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold">Prescription Details</h2>
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedPrescription.medication_name}</h3>
                  <p className="text-gray-600">Dosage: {selectedPrescription.dosage}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">⏰ Frequency</p>
                    <p className="font-bold text-gray-900">{selectedPrescription.frequency}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">📅 Duration (days)</p>
                    <p className="font-bold text-gray-900">{selectedPrescription.duration_days ?? '—'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">🧪 Route</p>
                    <p className="font-bold text-gray-900">{selectedPrescription.route}</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-gray-600 text-sm mb-1">📅 Prescribed Date</p>
                  <p className="font-bold text-gray-900">{new Date(selectedPrescription.start_date).toLocaleDateString()}</p>
                </div>

                {selectedPrescription.instructions && (
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">📝 Instructions</p>
                    <p className="text-gray-900">{selectedPrescription.instructions}</p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
