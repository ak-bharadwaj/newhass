'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/lib/api'

export default function AdminHospitals() {
  const { token, user } = useAuth()
  const [hospitals, setHospitals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!token) return
    const loadHospitals = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await apiClient.getHospitals(token)
        // Filter by region on client side if needed
        const filtered = user?.region_id 
          ? data.filter((h: any) => h.region_id === user.region_id)
          : data
        setHospitals(filtered || [])
      } catch (e: any) {
        console.error('Failed to load hospitals', e)
        setError(e?.message || 'Failed to load hospitals')
        setHospitals([])
      } finally {
        setLoading(false)
      }
    }
    loadHospitals()
  }, [token, user?.region_id])

  const filteredHospitals = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return hospitals
    return hospitals.filter(h =>
      (h.name?.toLowerCase() || '').includes(q) ||
      (h.code?.toLowerCase() || '').includes(q) ||
      (h.address?.toLowerCase() || '').includes(q)
    )
  }, [hospitals, searchQuery])

  const stats = useMemo(() => ({
    total: hospitals.length,
    totalBeds: hospitals.reduce((sum, h) => sum + (h.bed_capacity || 0), 0),
    occupiedBeds: hospitals.reduce((sum, h) => sum + (h.occupied_beds || 0), 0),
    avgOccupancy: hospitals.length > 0 && hospitals.reduce((sum, h) => sum + (h.bed_capacity || 0), 0) > 0
      ? Math.round((hospitals.reduce((sum, h) => sum + (h.occupied_beds || 0), 0) / hospitals.reduce((sum, h) => sum + (h.bed_capacity || 0), 0)) * 100)
      : 0
  }), [hospitals])

  return (
    <EnterpriseDashboardLayout role="admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/admin" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Regional Hospitals
          </h1>
          <p className="text-gray-600">Manage hospitals in your region</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Hospitals', value: stats.total, color: 'from-blue-500 to-indigo-500', icon: '🏥' },
            { label: 'Total Beds', value: stats.totalBeds, color: 'from-purple-500 to-pink-500', icon: '🛏️' },
            { label: 'Occupied Beds', value: stats.occupiedBeds, color: 'from-orange-500 to-red-500', icon: '👥' },
            { label: 'Avg Occupancy', value: `${stats.avgOccupancy}%`, color: 'from-yellow-500 to-orange-500', icon: '📊' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl mb-3`}>
                  {stat.icon}
                </div>
                <p className="text-gray-600 text-xs font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">{searchQuery ? 'No hospitals match your search' : 'No hospitals found in your region'}</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4">
            {filteredHospitals.map((hospital, index) => (
              <motion.div
                key={hospital.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md p-6 border-2 border-gray-100 hover:border-purple-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
                      🏥
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{hospital.name}</h3>
                      <p className="text-gray-600">{hospital.address || hospital.code}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">🛏️ {hospital.occupied_beds || 0}/{hospital.bed_capacity || 0} beds</span>
                        <span className="text-sm text-gray-500">� {hospital.region_name || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    View Details
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
