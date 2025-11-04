'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type PatientWithVitals } from '@/lib/api'

export default function ReceptionInsurancePage() {
  const { token, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Local-only verification state until real API exists
  const [insuranceStatus, setInsuranceStatus] = useState<Record<string, { verified: boolean; timestamp: string }>>({})
  const [selectedPatient, setSelectedPatient] = useState<PatientWithVitals | null>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
  // Only request hospital-scoped list for roles that are permitted server-side
  const privilegedRoles = ['super_admin', 'regional_admin', 'manager']
  const hospitalId = (privilegedRoles.includes(user?.role_name || '') ? user?.hospital_id : undefined) ?? undefined
  const data = await apiClient.getMyPatients(token, hospitalId)
        if (isMounted) setPatients(data)
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to load patients')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [token])

  const filteredPatients = patients.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.trim().toLowerCase()
    const q = searchQuery.trim().toLowerCase()
    return name.includes(q) || p.mrn.toLowerCase().includes(q)
  })

  const handleVerify = (patient: PatientWithVitals) => {
    setSelectedPatient(patient)
    setShowVerificationModal(true)
  }

  return (
    <EnterpriseDashboardLayout role="reception">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/reception" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Insurance Verification</h1>
            <p className="text-gray-600 mt-1">Search patients and manage insurance verification</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <input
            type="text"
            placeholder="🔍 Search by name or MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Patient List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-cyan-300 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white text-2xl">
                      🏛️
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{patient.first_name} {patient.last_name}</h3>
                      <p className="text-gray-600">MRN: {patient.mrn} {patient.date_of_birth ? `| DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {insuranceStatus[patient.id]?.verified ? (
                      <div className="px-6 py-3 bg-green-100 border-2 border-green-300 text-green-800 rounded-xl font-bold flex items-center gap-2">
                        ✅ Verified
                        <span className="text-xs">
                          ({new Date(insuranceStatus[patient.id].timestamp).toLocaleTimeString()})
                        </span>
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleVerify(patient)}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold shadow-lg"
                      >
                        🔍 Verify Insurance
                      </motion.button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Insurance Status</p>
                    <p className="font-bold text-gray-900">No insurance data available</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Provider</p>
                    <p className="font-bold text-gray-900">N/A</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Policy Number</p>
                    <p className="font-bold text-gray-900">N/A</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredPatients.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No patients found</p>
              </div>
            )}
          </div>
        )}

        {/* Verification Modal */}
        <AnimatePresence>
          {showVerificationModal && selectedPatient && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowVerificationModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    🔍 Verify Insurance
                  </h2>
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">Patient</p>
                      <p className="font-bold text-gray-900">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                    </div>
                    <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-800">
                      Real-time insurance verification is not integrated yet. This will update verification status locally only.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowVerificationModal(false)}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedPatient) return
                        setInsuranceStatus(prev => ({
                          ...prev,
                          [selectedPatient.id]: { verified: true, timestamp: new Date().toISOString() }
                        }))
                        setShowVerificationModal(false)
                      }}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold shadow-lg"
                    >
                      Mark as Verified
                    </button>
                  </div>
                </>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </EnterpriseDashboardLayout>
  )
}
