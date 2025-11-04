'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function SuperAdminReports() {
  const { token } = useAuth()
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState<Record<string, any> | null>(null)

  const reports = [
    { id: 'system-overview', title: 'System Overview', icon: '🌐', color: 'from-red-500 to-pink-500' },
    { id: 'financial-summary', title: 'Financial Summary', icon: '💰', color: 'from-green-500 to-emerald-500' },
    { id: 'operational-metrics', title: 'Operational Metrics', icon: '📊', color: 'from-blue-500 to-indigo-500' },
    { id: 'performance-analysis', title: 'Performance Analysis', icon: '📈', color: 'from-purple-500 to-pink-500' }
  ]

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token || !selectedReport) return
      setLoading(true); setError(''); setReportData(null)
      try {
        const now = new Date()
        const start = new Date(now)
        start.setMonth(now.getMonth() - 1)
  const params = { startDate: start.toISOString(), endDate: now.toISOString() }

        if (selectedReport === 'system-overview') {
          const [global, patients, staff, beds] = await Promise.all([
            apiClient.getAnalytics(token, params),
            apiClient.getPatientAnalytics(token, params),
            apiClient.getStaffAnalytics(token, params),
            apiClient.getBedOccupancyAnalytics(token, params),
          ])
          const data = {
            regions: global?.total_regions ?? '—',
            hospitals: global?.total_hospitals ?? '—',
            patients: patients?.total_patients ?? patients?.count ?? '—',
            staff: staff?.total_staff ?? staff?.count ?? '—',
            totalBeds: beds?.total_beds ?? beds?.capacity ?? '—',
          }
          if (!ignore) setReportData(data)
        } else if (selectedReport === 'financial-summary') {
          const revenue = await apiClient.getRevenueAnalytics(token, params)
          const data = {
            totalRevenue: revenue?.total_revenue != null ? `$${Number(revenue.total_revenue).toLocaleString()}` : '—',
            collected: revenue?.collected_amount != null ? `$${Number(revenue.collected_amount).toLocaleString()}` : '—',
            pending: revenue?.pending_amount != null ? `$${Number(revenue.pending_amount).toLocaleString()}` : '—',
            collectionRate: revenue?.collection_rate != null ? `${Math.round(revenue.collection_rate)}%` : '—',
          }
          if (!ignore) setReportData(data)
        } else if (selectedReport === 'operational-metrics') {
          const [appts, beds] = await Promise.all([
            apiClient.getAppointmentAnalytics(token, params),
            apiClient.getBedOccupancyAnalytics(token, params),
          ])
          const data = {
            appointments: appts?.total_appointments ?? appts?.count ?? '—',
            avgOccupancy: beds?.occupancy_rate != null ? `${Math.round(beds.occupancy_rate)}%` : '—',
            availableBeds: beds?.available_beds ?? '—',
          }
          if (!ignore) setReportData(data)
        } else if (selectedReport === 'performance-analysis') {
          const staff = await apiClient.getStaffAnalytics(token, params)
          const data = {
            totalStaff: staff?.total_staff ?? '—',
            activeStaff: staff?.active_staff ?? '—',
            overtimeRate: staff?.overtime_rate != null ? `${Math.round(staff.overtime_rate)}%` : '—',
          }
          if (!ignore) setReportData(data)
        }
      } catch (e: any) {
        if (!ignore) setError('Failed to load report')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [selectedReport, token])

  return (
    <EnterpriseDashboardLayout role="super_admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/super_admin" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
            System Reports
          </h1>
          <p className="text-gray-600">Comprehensive system-wide analytics</p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          {reports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedReport(report.id)}
              className={`cursor-pointer bg-white rounded-2xl shadow-lg p-6 border-2 transition-all hover:shadow-xl ${
                selectedReport === report.id ? 'border-red-500' : 'border-gray-100'
              }`}
            >
              <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center text-4xl mb-4`}>
                {report.icon}
              </div>
              <h3 className="text-center font-bold text-gray-900">{report.title}</h3>
            </motion.div>
          ))}
        </div>

        {selectedReport && (
          <motion.div
            key={selectedReport}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold mb-6">{reports.find(r => r.id === selectedReport)?.title}</h2>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
            )}
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
              </div>
            ) : reportData ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(reportData).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-xl p-6 text-center">
                    <p className="text-sm text-gray-600 font-semibold capitalize mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-3xl font-bold text-red-600">{String(value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No data available for the selected period.</p>
            )}
          </motion.div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
