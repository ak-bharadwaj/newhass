'use client'

import { useEffect, useMemo, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, GlobalMetrics, RegionWithStats } from '@/lib/api'

export default function SuperAdminGlobalAnalytics() {
  const [timeRange, setTimeRange] = useState('30d')
  const { token } = useAuth()
  const [global, setGlobal] = useState<GlobalMetrics | null>(null)
  const [regions, setRegions] = useState<RegionWithStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [g, r] = await Promise.all([
          apiClient.getGlobalMetrics(token),
          apiClient.getRegions(token),
        ])
        setGlobal(g)
        setRegions(r)
      } catch (e: any) {
        setError(e?.message || 'Failed to load global analytics')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const globalStats = useMemo(() => {
    if (!global) return [] as Array<{ label: string; value: string; icon: string }>
    return [
      { label: 'Total Regions', value: String(global.total_regions ?? 0), icon: '🌍' },
      { label: 'Total Hospitals', value: String(global.total_hospitals ?? 0), icon: '🏥' },
      { label: 'Global Staff', value: String(global.total_staff ?? 0), icon: '👥' },
      { label: 'Active Visits', value: String(global.active_visits ?? 0), icon: '🩺' },
    ]
  }, [global])

  return (
    <EnterpriseDashboardLayout role="super_admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <span>👑</span>
              <span>Global System Analytics</span>
            </h1>
            <p className="text-gray-600 mt-2">Real-time insights across all regions and hospitals worldwide</p>
          </div>
          <div className="flex items-center space-x-3">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
              <option value="1y">Last Year</option>
            </select>
            <button className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold">
              📊 Executive Report
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800">{error}</div>
        )}

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(loading && globalStats.length === 0 ? Array.from({ length: 4 }) : globalStats).map((stat: any, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1"
            >
              {loading && globalStats.length === 0 ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-7 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{stat.label}</p>
                    <div className="flex items-baseline space-x-2 mt-3">
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                  <div className={`w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
                    {stat.icon}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Regional Performance */}
        <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Regional Performance Overview</h2>
            <Link href="/dashboard/super_admin/analytics/regional" className="text-sm text-red-600 hover:text-red-700 font-semibold">
              View Detailed Analysis →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Region</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Hospitals</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Active Staff</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Active Patients</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => (
                  <tr key={region.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="font-semibold text-gray-900">{region.name}</span>
                    </td>
                    <td className="py-4 px-4 text-center text-gray-700">{region.hospitals_count}</td>
                    <td className="py-4 px-4 text-center text-gray-700">{region.total_staff}</td>
                    <td className="py-4 px-4 text-center text-gray-700">{region.total_patients}</td>
                  </tr>
                ))}
                {regions.length === 0 && !loading && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-600">No regions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard/super_admin/analytics/regional" className="glass bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="text-4xl mb-3">🗺️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Regional Analytics</h3>
            <p className="text-sm text-gray-600">Deep dive into each region</p>
          </Link>

          <Link href="/dashboard/super_admin/analytics/hospitals" className="glass bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="text-4xl mb-3">🏥</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hospital Metrics</h3>
            <p className="text-sm text-gray-600">All hospitals worldwide</p>
          </Link>

          <Link href="/dashboard/super_admin/analytics/financial" className="glass bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Financial Overview</h3>
            <p className="text-sm text-gray-600">Global revenue & forecasts</p>
          </Link>

          <Link href="/dashboard/super_admin/analytics/ai" className="glass bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 rounded-2xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Insights</h3>
            <p className="text-sm text-gray-600">ML predictions & trends</p>
          </Link>
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
