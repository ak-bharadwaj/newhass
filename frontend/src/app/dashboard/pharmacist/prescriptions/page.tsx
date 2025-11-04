'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type Prescription } from '@/lib/api'
import { useSocket } from '@/components/providers/SocketProvider'
import { Button } from '@/components/ui/Button'

export default function PharmacistPrescriptions() {
  const { token, user, hasRole } = useAuth()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [filterStatus, setFilterStatus] = useState('pending')
  const [error, setError] = useState<string | null>(null)

  const prescriptionsQuery = useQuery({
    queryKey: ['pharmacy-prescriptions', user?.hospital_id, filterStatus, token],
    queryFn: async () => {
      if (!token) return [] as Prescription[]
      setError(null)
      const params: Record<string, any> = { hospital_id: user?.hospital_id, limit: 200 }
      if (filterStatus !== 'all') params.status = filterStatus
      const list = await apiClient.listPrescriptions(token, params)
      return Array.isArray(list) ? list : []
    },
    enabled: !!token,
    refetchInterval: 20000,
  })

  if (prescriptionsQuery.data && prescriptions !== prescriptionsQuery.data) {
    if (prescriptions.length !== prescriptionsQuery.data.length) setPrescriptions(prescriptionsQuery.data)
  }

  // Socket pilot: refetch on hospital prescriptions updates
  const { connected, subscribe } = useSocket()
  React.useEffect(() => {
    if (!connected || !user?.hospital_id) return
    const unsub = subscribe(`hospital:${user.hospital_id}:prescriptions`, () => {
      prescriptionsQuery.refetch()
    })
    return () => unsub()
  }, [connected, user?.hospital_id, subscribe])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'dispensed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const filteredPrescriptions = prescriptions.filter(p => filterStatus === 'all' || p.status === filterStatus)

  const stats = {
    pending: prescriptions.filter(p => p.status === 'pending').length,
    dispensed: prescriptions.filter(p => p.status === 'dispensed' || !!p.dispensed_at).length,
    urgent: prescriptions.filter(p => p.status === 'urgent').length,
  }

  const handleDispense = async (id: string) => {
    if (!token) return
    setError(null)
    try {
      // Note: the clinical "administer" endpoint is restricted to nursing staff.
      // Pharmacists should not call the nurse-administer endpoint. We keep this
      // handler for environments where the current user has the nurse role.
      await apiClient.administerMedication(id, token)
      await prescriptionsQuery.refetch()
    } catch (e: any) {
      console.error('Failed to mark prescription as dispensed', e)
      // Surface a friendly message instead of a raw alert for manual QA
      setError(e?.message || 'Failed to mark as dispensed; this action may require nurse privileges')
    }
  }

  return (
    <EnterpriseDashboardLayout role="pharmacist">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/pharmacist" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prescriptions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and fulfill prescription orders</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Pending</p>
                <p className="text-3xl font-bold mt-1">{stats.pending}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Dispensed</p>
                <p className="text-3xl font-bold mt-1">{stats.dispensed}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Urgent</p>
                <p className="text-3xl font-bold mt-1">{stats.urgent}</p>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'pending', 'dispensed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                filterStatus === status
                  ? 'bg-pink-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Prescriptions List */}
        {prescriptionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPrescriptions.map((prescription, index) => (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 ${
                  prescription.status === 'urgent' ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{prescription.medication_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>{prescription.status}</span>
                      {prescription.status === 'urgent' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">🚨 URGENT</span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Patient: {prescription.patient_name} {prescription.patient_mrn ? `(MRN: ${prescription.patient_mrn})` : ''}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Dosage</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{prescription.dosage}</p>
                  </div>
                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Frequency</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{prescription.frequency}</p>
                  </div>
                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Prescribed By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{prescription.prescribed_by_name || prescription.prescribed_by_id}</p>
                  </div>
                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Prescribed Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(prescription.start_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div />
                  {prescription.status === 'pending' && (
                        <div className="flex gap-2">
                          {hasRole('nurse') ? (
                            <Button onClick={() => handleDispense(prescription.id)} className="bg-pink-600 hover:bg-pink-700">Mark as Dispensed</Button>
                          ) : (
                            <Button disabled title="This action requires a nurse. Coordinate with nursing staff to complete administration." className="bg-pink-300 cursor-not-allowed" aria-disabled>
                              Mark as Dispensed
                            </Button>
                          )}
                          <Button variant="secondary">Print Label</Button>
                        </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredPrescriptions.length === 0 && !prescriptionsQuery.isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">No prescriptions found</p>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
