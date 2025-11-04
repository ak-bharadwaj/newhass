'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { apiClient, type Prescription } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function NurseMedicationsPage() {
  const { token, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedMed, setSelectedMed] = useState<Prescription | null>(null)
  const [verifyModal, setVerifyModal] = useState(false)
  const [dosageVerified, setDosageVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meds, setMeds] = useState<Prescription[]>([])

  useEffect(() => {
    let isActive = true
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        // Load recent prescriptions for this hospital if available; otherwise all
        const params: { hospital_id?: string; limit?: number } = {}
        if (user?.hospital_id) params.hospital_id = user.hospital_id
        params.limit = 200
        const list = await apiClient.listPrescriptions(token, params)
        if (!isActive) return
        setMeds(list)
      } catch (e: any) {
        if (!isActive) return
        setError(e?.message || 'Failed to load prescriptions')
      } finally {
        if (isActive) setLoading(false)
      }
    }
    load()
    return () => { isActive = false }
  }, [token, user?.hospital_id])

  const filteredMeds = useMemo(() => {
    return meds.filter(p => {
      const patientName = `${p.patient_name || ''}`
      const matchesSearch = patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.medication_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [meds, searchQuery, statusFilter])

  const handleAdminister = async () => {
    if (!selectedMed || !token) return
    if (!dosageVerified) return
    const params: { hospital_id?: string; limit?: number } = {}
    if (user?.hospital_id) params.hospital_id = user.hospital_id
    params.limit = 200
    try {
      // Use toast-based feedback across the action
      await (await import('@/lib/activityFeedback')).promiseFeedback(
        apiClient.administerMedication(selectedMed.id, token),
        {
          loading: 'Administering medication...',
          success: 'Medication administered successfully!',
          error: 'Failed to administer medication',
        }
      )
      const list = await apiClient.listPrescriptions(token, params)
      setMeds(list)
    } finally {
      setVerifyModal(false)
      setSelectedMed(null)
      setDosageVerified(false)
    }
  }

  const stats = useMemo(() => ({
    pending: meds.filter(p => p.status === 'pending').length,
    dispensed: meds.filter(p => p.status === 'dispensed').length,
    total: meds.length
  }), [meds])

  return (
    <EnterpriseDashboardLayout role="nurse">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/nurse" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medication Administration</h1>
            <p className="text-gray-600 mt-1">Administer and track patient medications</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Pending', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
            { label: 'Dispensed', value: stats.dispensed, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Total', value: stats.total, color: 'from-blue-500 to-indigo-500', icon: '💊' }
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

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="🔍 Search patient or medication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="dispensed">Dispensed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Medications List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Medication Orders ({filteredMeds.length})</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading medications…</div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">{error}</div>
            ) : filteredMeds.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <span className="text-6xl mb-4 block">💊</span>
                <p>No medications found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredMeds.map((med, index) => (
                  <motion.div
                    key={med.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{med.patient_name || 'Unknown Patient'}</h3>
                        <p className="text-sm text-gray-600">MRN: {med.patient_mrn || 'N/A'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        med.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        med.status === 'dispensed' ? 'bg-green-100 text-green-800' :
                        med.status === 'administered' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {med.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💊</span>
                        <div>
                          <p className="font-bold text-gray-900">{med.medication_name}</p>
                          <p className="text-sm text-gray-600">{med.dosage}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><strong>Frequency:</strong> {med.frequency}</p>
                        {med.duration_days !== undefined && (<p><strong>Duration:</strong> {med.duration_days} days</p>)}
                      </div>
                      {med.instructions && (
                        <div className="mt-2 p-2 bg-blue-100 rounded-lg">
                          <p className="text-xs text-blue-900">📝 {med.instructions}</p>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mb-3">
                      Prescribed: {new Date(med.start_date).toLocaleDateString()}
                    </div>

                    {med.status === 'dispensed' && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedMed(med)
                          setVerifyModal(true)
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
                      >
                        ✅ Administer Medication
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Verification Modal */}
        {verifyModal && selectedMed && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold">Verify Medication Administration</h2>
                <button
                  onClick={() => {
                    setVerifyModal(false)
                    setSelectedMed(null)
                    setDosageVerified(false)
                  }}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedMed.patient_name || 'Unknown Patient'}</h3>
                  <p className="text-gray-600">MRN: {selectedMed.patient_mrn || 'N/A'}</p>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                  <p className="text-yellow-900 font-bold mb-2">⚠️ Medication Details</p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Medication:</strong> {selectedMed.medication_name}</p>
                    <p><strong>Dosage:</strong> {selectedMed.dosage}</p>
                    <p><strong>Frequency:</strong> {selectedMed.frequency}</p>
                    {selectedMed.duration_days !== undefined && (
                      <p><strong>Duration:</strong> {selectedMed.duration_days} days</p>
                    )}
                    {selectedMed.instructions && (
                      <p><strong>Instructions:</strong> {selectedMed.instructions}</p>
                    )}
                  </div>
                </div>

                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dosageVerified}
                      onChange={(e) => setDosageVerified(e.target.checked)}
                      className="w-5 h-5 mt-1 accent-red-600"
                    />
                    <div>
                      <p className="font-bold text-red-900">Dosage Verification Required</p>
                      <p className="text-sm text-red-800">I have verified the medication name, dosage, and patient identity</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setVerifyModal(false)
                      setSelectedMed(null)
                      setDosageVerified(false)
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdminister}
                    disabled={!dosageVerified}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                      dosageVerified
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    ✅ Confirm Administration
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
