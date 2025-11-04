'use client'

import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import apiClient, { type Prescription } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function DoctorAnalyticsPrescriptionsPage() {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token) return
      setLoading(true); setError('')
      try {
        const rx = await apiClient.listPrescriptions(token, { hospital_id: user?.hospital_id, limit: 500 })
        if (!ignore) setPrescriptions(rx)
      } catch (e: any) {
        if (!ignore) setError('Failed to load prescriptions analytics')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token, user?.hospital_id])

  const prescriptionsByMedication = useMemo(() => {
    return prescriptions.reduce((acc, rx) => {
      const key = (rx as any).medication_name || (rx as any).medication || 'Unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [prescriptions])

  const topMedications = useMemo(() => Object.entries(prescriptionsByMedication)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10), [prescriptionsByMedication])

  const uniquePatientsWithRx = useMemo(() => {
    const ids = new Set<string | number>()
    prescriptions.forEach((rx: any) => {
      if (rx.patient_id != null) ids.add(rx.patient_id)
    })
    return ids.size
  }, [prescriptions])

  return (
    <EnterpriseDashboardLayout role="doctor">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/doctor" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prescription Trends</h1>
            <p className="text-gray-600 mt-1">Analyze prescription patterns and medication usage</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Recent Prescriptions', value: prescriptions.length, icon: '💊', color: 'from-purple-500 to-pink-500' },
                { label: 'Unique Medications', value: Object.keys(prescriptionsByMedication).length, icon: '💉', color: 'from-blue-500 to-indigo-500' },
                { label: 'Avg per Patient', value: uniquePatientsWithRx ? (prescriptions.length / uniquePatientsWithRx).toFixed(1) : '—', icon: '📊', color: 'from-green-500 to-emerald-500' }
              ].map((stat, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                  className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}>
                  <div className="flex items-center justify-between">
                    <div><p className="text-white/80 text-sm mb-1">{stat.label}</p><p className="text-4xl font-bold">{stat.value}</p></div>
                    <span className="text-5xl opacity-20">{stat.icon}</span>
                  </div>
                </motion.div>
              ))}
            </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top Prescribed Medications</h3>
          {topMedications.length === 0 ? (
            <p className="text-gray-600">No prescriptions found.</p>
          ) : (
            <div className="space-y-3">
              {topMedications.map(([medication, count], index) => (
                <div key={medication} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">{index + 1}</span>
                      <p className="font-bold text-gray-900">{medication}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{count}</p>
                      <p className="text-sm text-gray-600">prescriptions</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
