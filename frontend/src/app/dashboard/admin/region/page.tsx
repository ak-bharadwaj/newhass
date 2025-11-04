'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/lib/api'

export default function AdminRegion() {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [region, setRegion] = useState<any>(null)
  const [hospitals, setHospitals] = useState<any[]>([])

  useEffect(() => {
    if (!token || !user?.region_id) return
    const loadRegion = async () => {
      setLoading(true)
      setError('')
      try {
        const [regionData, hospitalsData] = await Promise.all([
          apiClient.getRegion(user.region_id!, token),
          apiClient.getHospitals(token)
        ])
        setRegion(regionData)
        // Filter hospitals by region
        const regionalHospitals = hospitalsData.filter((h: any) => h.region_id === user.region_id)
        setHospitals(regionalHospitals)
      } catch (e: any) {
        console.error('Failed to load region', e)
        setError(e?.message || 'Failed to load region data')
      } finally {
        setLoading(false)
      }
    }
    loadRegion()
  }, [token, user?.region_id])

  return (
    <EnterpriseDashboardLayout role="admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/admin" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            My Region
          </h1>
          <p className="text-gray-600">Regional overview and management</p>
        </motion.div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : region && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{region.name}</h2>
                  <p className="text-gray-600 mt-2">Code: {region.code || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { label: 'Hospitals', value: hospitals.length, icon: '🏥', color: 'from-blue-500 to-indigo-500' },
                  { label: 'Total Beds', value: hospitals.reduce((sum, h) => sum + (h.bed_capacity || 0), 0), icon: '🛏️', color: 'from-purple-500 to-pink-500' },
                  { label: 'Occupancy', value: `${hospitals.length > 0 ? Math.round((hospitals.reduce((sum, h) => sum + (h.occupied_beds || 0), 0) / hospitals.reduce((sum, h) => sum + (h.bed_capacity || 1), 1)) * 100) : 0}%`, icon: '�', color: 'from-green-500 to-emerald-500' },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-xl p-6 text-center"
                  >
                    <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-3xl mb-3`}>
                      {stat.icon}
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-xl font-bold mb-4">Regional Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Region Name</p>
                    <p className="text-lg font-bold mt-1">{region.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Region Code</p>
                    <p className="text-lg font-bold mt-1">{region.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Country</p>
                    <p className="text-lg font-bold mt-1">{region.country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Status</p>
                    <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-lg font-bold mt-1">
                      {region.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                <div className="space-y-4">
                  <button className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-left">
                    📋 View Regional Reports
                  </button>
                  <button className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-left">
                    🏥 Manage Hospitals
                  </button>
                  <button className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-left">
                    👥 View All Patients
                  </button>
                  <button className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-left">
                    ⚙️ Regional Settings
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
