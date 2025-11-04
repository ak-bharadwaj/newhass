'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function ManagerAnalytics() {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('month')
  const [kpis, setKpis] = useState<Array<{ label: string; value: string | number; change?: string; color: string; icon: string }>>([])
  const [error, setError] = useState<string | null>(null)

  // Safe defaults for sections awaiting backend analytics wiring
  const departmentPerformance: Array<{ dept: string; color: string; patients: number; revenue: number; satisfaction: number }> = []
  const monthlyTrends: Array<{ month: string; patients: number; revenue: number }> = []

  useEffect(() => {
    let isActive = true
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const now = new Date()
        const start = new Date(now)
        if (timeframe === 'week') start.setDate(now.getDate() - 7)
        else if (timeframe === 'month') start.setMonth(now.getMonth() - 1)
        else if (timeframe === 'quarter') start.setMonth(now.getMonth() - 3)
        else if (timeframe === 'year') start.setFullYear(now.getFullYear() - 1)

        const params: any = { start_date: start.toISOString(), end_date: now.toISOString() }
        if (user?.hospital_id) params.hospital_id = user.hospital_id

        // Parallel lightweight fetches
        const [apts, beds] = await Promise.all([
          apiClient.getAppointments(token, { ...params, limit: 500 }).catch(() => []),
          user?.hospital_id ? apiClient.getBeds(user.hospital_id, token).catch(() => []) : Promise.resolve([]),
        ])

        if (!isActive) return

        const occupied = Array.isArray(beds) ? beds.filter((b: any) => b.status === 'occupied').length : 0
        const occupancyRate = Array.isArray(beds) && beds.length > 0 ? `${Math.round((occupied / beds.length) * 100)}%` : '—'

        const newKpis = [
          { label: 'Appointments', value: apts.length, change: undefined, color: 'from-orange-500 to-red-500', icon: '📅' },
          { label: 'Bed Occupancy', value: occupancyRate, change: undefined, color: 'from-purple-500 to-pink-500', icon: '🛏️' },
          { label: 'Total Patients', value: '—', change: undefined, color: 'from-blue-500 to-indigo-500', icon: '👥' },
          { label: 'Revenue', value: '—', change: undefined, color: 'from-green-500 to-emerald-500', icon: '💰' },
          { label: 'Lab Tests', value: '—', change: undefined, color: 'from-yellow-500 to-orange-500', icon: '🧪' },
          { label: 'Collection Rate', value: '—', change: undefined, color: 'from-teal-500 to-cyan-500', icon: '📈' },
        ]
        setKpis(newKpis)
      } catch (e: any) {
        if (!isActive) return
        setError(e?.message || 'Failed to load analytics')
      } finally {
        if (isActive) setLoading(false)
      }
    }
    load()
    return () => { isActive = false }
  }, [token, user?.hospital_id, timeframe])
  

  return (
    <EnterpriseDashboardLayout role="manager">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/manager" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600">Performance metrics and insights</p>
            </div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
              {kpis.map((kpi, index) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
                >
                  <div className="text-center">
                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-2xl mb-3`}>
                      {kpi.icon}
                    </div>
                    <p className="text-gray-600 text-xs font-medium mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold mb-1">{kpi.value}</p>
                    <span className="text-xs font-bold text-green-600">{kpi.change}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Department Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-8 mb-8"
            >
              <h2 className="text-2xl font-bold mb-6">Department Performance</h2>
              <div className="space-y-6">
                {departmentPerformance.map((dept, index) => (
                  <div key={dept.dept}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${dept.color}`}></div>
                        <span className="font-semibold text-gray-900">{dept.dept}</span>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Patients</p>
                          <p className="font-bold">{dept.patients}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Revenue</p>
                          <p className="font-bold">${(dept.revenue / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Satisfaction</p>
                          <p className="font-bold">⭐ {dept.satisfaction}</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(dept.patients / 200) * 100}%` }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className={`h-full ${dept.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Monthly Trends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <h2 className="text-2xl font-bold mb-6">6-Month Trends</h2>
              <div className="grid grid-cols-6 gap-4">
                {monthlyTrends.map((month, index) => (
                  <div key={month.month} className="text-center">
                    <div className="flex flex-col items-center mb-4">
                      <div className="relative w-16 h-48 bg-gray-100 rounded-xl overflow-hidden mb-2">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(month.patients / 200) * 100}%` }}
                          transition={{ delay: index * 0.1, duration: 0.5 }}
                          className="absolute bottom-0 w-full bg-gradient-to-t from-purple-500 to-pink-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white z-10">
                          {month.patients}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-600">{month.month}</p>
                    </div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm font-bold text-green-600">${(month.revenue / 1000).toFixed(0)}K</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
