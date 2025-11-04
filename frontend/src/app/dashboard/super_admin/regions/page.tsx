'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient, { type RegionWithStats } from '@/lib/api'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function SuperAdminRegions() {
  const { token } = useAuth()
  const [regions, setRegions] = useState<RegionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!token) return
      setLoading(true); setError('')
      try {
        const list = await apiClient.getRegions(token)
        setRegions(list || [])
      } catch (e: any) {
        setError('Failed to load regions')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredRegions = regions.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: regions.length,
    active: regions.filter(r => r.is_active).length,
    hospitals: regions.reduce((sum, r) => sum + (r.hospitals_count || 0), 0),
    patients: regions.reduce((sum, r) => sum + (r.total_patients || 0), 0)
  }

  return (
    <EnterpriseDashboardLayout role="super_admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/super_admin" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
            All Regions
          </h1>
          <p className="text-gray-600">Manage all regions in the healthcare system</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Regions', value: stats.total, color: 'from-red-500 to-pink-500', icon: '🌍' },
            { label: 'Active', value: stats.active, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Total Hospitals', value: stats.hospitals, color: 'from-blue-500 to-indigo-500', icon: '🏥' },
            { label: 'Total Patients', value: stats.patients, color: 'from-purple-500 to-pink-500', icon: '👥' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-3xl`}>
                  {stat.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search regions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
            )}
            {filteredRegions.map((region, index) => (
              <motion.div
                key={region.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md p-6 border-2 border-gray-100 hover:border-red-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
                      🌍
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{region.name}</h3>
                      <p className="text-gray-600">{region.code}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">🏥 {region.hospitals_count ?? 0} hospitals</span>
                        <span className="text-sm text-gray-500">👥 {region.total_patients ?? 0} patients</span>
                        <span className="text-sm text-gray-500">👨‍⚕️ {region.total_staff ?? 0} staff</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${region.is_active ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {region.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/dashboard/super_admin/regions/${region.id}`} className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Manage
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
