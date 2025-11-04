'use client'

import { useEffect, useMemo, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, HospitalWithStats, RegionWithStats } from '@/lib/api'

export default function AdminAnalyticsOverview() {
  const { token, user } = useAuth()
  const [timeRange, setTimeRange] = useState('30d')
  const [regionMetrics, setRegionMetrics] = useState<any | null>(null)
  const [hospitals, setHospitals] = useState<HospitalWithStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const regionId = user?.region_id

  useEffect(() => {
    if (!token || !regionId) return
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [metrics, regionHospitals] = await Promise.all([
          apiClient.getRegionMetrics(regionId, token),
          apiClient.getRegionHospitals(regionId, token),
        ])
        setRegionMetrics(metrics)
        setHospitals(regionHospitals)
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    })()
  }, [token, regionId])

  const regionalStats = useMemo(() => {
    if (!regionMetrics) return [] as Array<{ label: string; value: string; icon: string; color: string }>
    return [
      { label: 'Total Hospitals', value: String(regionMetrics.hospitals_count ?? 0), icon: '🏥', color: 'blue' },
      { label: 'Active Staff', value: String(regionMetrics.staff_count ?? 0), icon: '👥', color: 'green' },
      { label: 'Active Patients', value: String(regionMetrics.total_patients ?? 0), icon: '🧑‍⚕️', color: 'purple' },
      { label: 'Bed Utilization', value: `${regionMetrics.bed_utilization ?? 0}%`, icon: '🛏️', color: 'yellow' },
    ]
  }, [regionMetrics])

  const hospitalPerformance = useMemo(() => {
    return hospitals.map(h => ({
      name: h.name,
      patients: h.active_patients ?? 0,
      utilization: h.bed_capacity > 0 ? Math.round(((h.occupied_beds ?? 0) / (h.bed_capacity ?? 0)) * 100) : 0,
      satisfaction: 0, // Not available yet
      status: (h.occupied_beds ?? 0) / Math.max(1, h.bed_capacity ?? 1) > 0.9 ? 'excellent' : 'good',
    }))
  }, [hospitals])

  return (
    <EnterpriseDashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Regional Analytics Overview</h1>
            <p className="text-gray-600 mt-2">Comprehensive insights across all hospitals in your region</p>
          </div>
          <div className="flex items-center space-x-3">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold">
              📊 Download Report
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800">{error}</div>
        )}

        {/* Regional Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(loading && regionalStats.length === 0 ? Array.from({ length: 4 }) : regionalStats).map((stat: any, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1"
            >
              {loading && regionalStats.length === 0 ? (
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hospital Performance - Takes 2 columns */}
          <div className="lg:col-span-2 glass bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Hospital Performance</h2>
              <Link href="/dashboard/admin/analytics/hospitals" className="text-sm text-purple-600 hover:text-purple-700 font-semibold">
                View Detailed Report →
              </Link>
            </div>
            <div className="space-y-4">
              {hospitalPerformance.length === 0 && !loading && (
                <p className="text-gray-600">No data available.</p>
              )}
              {hospitalPerformance.map((hospital) => (
                <div key={hospital.name} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{hospital.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{hospital.patients} active patients</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      hospital.status === 'excellent' ? 'bg-green-100 text-green-700' :
                      hospital.status === 'good' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {hospital.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Bed Utilization</p>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full" style={{width: `${hospital.utilization}%`}}></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{hospital.utilization}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Patient Satisfaction</p>
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm font-semibold text-gray-900">{hospital.satisfaction}/5.0</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities - hidden until wired */}
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Recent Activities</h2>
            <p className="text-gray-600">No activity feed connected yet.</p>
          </div>
        </div>

        {/* Quick Metrics Grid - hidden until wired */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 0 }).map((_, i) => (
            <div key={i} className="glass bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg" />
          ))}
        </div>

        {/* Analytics Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/dashboard/admin/analytics/hospitals" className="glass bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 rounded-2xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="text-4xl mb-3">🏥</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hospital Analytics</h3>
            <p className="text-sm text-gray-600">Detailed performance metrics for each hospital</p>
          </Link>

          <Link href="/dashboard/admin/analytics/users" className="glass bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">User Analytics</h3>
            <p className="text-sm text-gray-600">Staff performance, utilization and engagement</p>
          </Link>

          <Link href="/dashboard/admin/analytics/financial" className="glass bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-2xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Financial Reports</h3>
            <p className="text-sm text-gray-600">Revenue, expenses and financial forecasting</p>
          </Link>
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
