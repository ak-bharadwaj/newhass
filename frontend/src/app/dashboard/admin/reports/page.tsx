'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from '@/components/charts/LazyRecharts'
import { Cell } from 'recharts'
import { chartStyles, colorForIndex } from '@/components/charts/chartTheme'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'

export default function AdminReports() {
  const { token, user } = useAuth()
  const MODE: 'light' | 'dark' = 'light'
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [reportData, setReportData] = useState<Record<string, any> | null>(null)

  const reports = [
    { id: 'regional-summary', title: 'Regional Summary', icon: '📊', color: 'from-blue-500 to-indigo-500' },
    { id: 'financial-overview', title: 'Financial Overview', icon: '💰', color: 'from-green-500 to-emerald-500' },
    { id: 'capacity-report', title: 'Capacity Report', icon: '🛏️', color: 'from-purple-500 to-pink-500' },
    { id: 'performance-metrics', title: 'Performance Metrics', icon: '📈', color: 'from-orange-500 to-red-500' }
  ]

  // Background refresh of selected report via React Query
  const reportQuery = useQuery({
    queryKey: ['admin-report', selectedReport, user?.hospital_id, token],
    queryFn: async () => {
      if (!token || !selectedReport) return null
      setError('')
      const now = new Date()
      const start = new Date(now)
      start.setMonth(now.getMonth() - 1)
      const paramsObj: { startDate: string; endDate: string; hospitalId?: string } = {
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        hospitalId: user?.hospital_id || undefined,
      }

      let data: Record<string, any> = {}
      if (selectedReport === 'regional-summary') {
        const [patients, appts, beds, staff] = await Promise.all([
          apiClient.getPatientAnalytics(token, paramsObj),
          apiClient.getAppointmentAnalytics(token, paramsObj),
          apiClient.getBedOccupancyAnalytics(token, paramsObj),
          apiClient.getStaffAnalytics(token, paramsObj),
        ])
        data = {
          hospitals: patients?.hospitals_count ?? '—',
          patients: patients?.total_patients ?? patients?.count ?? '—',
          totalBeds: beds?.total_beds ?? beds?.capacity ?? '—',
          occupancy: beds?.occupancy_rate != null ? `${Math.round(beds.occupancy_rate)}%` : '—',
          appointments: appts?.total_appointments ?? appts?.count ?? '—',
          staff: staff?.total_staff ?? staff?.count ?? '—',
        }
      } else if (selectedReport === 'financial-overview') {
        const revenue = await apiClient.getRevenueAnalytics(token, paramsObj)
        data = {
          totalRevenue: revenue?.total_revenue != null ? `$${Number(revenue.total_revenue).toLocaleString()}` : '—',
          collected: revenue?.collected_amount != null ? `$${Number(revenue.collected_amount).toLocaleString()}` : '—',
          pending: revenue?.pending_amount != null ? `$${Number(revenue.pending_amount).toLocaleString()}` : '—',
          invoices: revenue?.invoice_count ?? '—',
          collectionRate: revenue?.collection_rate != null ? `${Math.round(revenue.collection_rate)}%` : '—',
        }
      } else if (selectedReport === 'capacity-report') {
        const beds = await apiClient.getBedOccupancyAnalytics(token, paramsObj)
        data = {
          totalBeds: beds?.total_beds ?? beds?.capacity ?? '—',
          occupied: beds?.occupied_beds ?? '—',
          available: beds?.available_beds ?? '—',
          maintenance: beds?.maintenance_beds ?? '—',
          occupancyRate: beds?.occupancy_rate != null ? `${Math.round(beds.occupancy_rate)}%` : '—',
        }
      } else if (selectedReport === 'performance-metrics') {
        const staff = await apiClient.getStaffAnalytics(token, paramsObj)
        data = {
          totalStaff: staff?.total_staff ?? '—',
          activeStaff: staff?.active_staff ?? '—',
          avgShiftHours: staff?.avg_shift_hours ?? '—',
          overtimeRate: staff?.overtime_rate != null ? `${Math.round(staff.overtime_rate)}%` : '—',
        }
      }
      return data
    },
    enabled: !!token && !!selectedReport,
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (reportQuery.data) setReportData(reportQuery.data as Record<string, any>)
    if (reportQuery.isError) setError('Failed to load report')
  }, [reportQuery.data, reportQuery.isError])

  return (
    <EnterpriseDashboardLayout role="admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/admin" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Regional Reports
          </h1>
          <p className="text-gray-600">Comprehensive regional analytics</p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          {reports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedReport(report.id)}
              className={`cursor-pointer`}
            >
              <Card className={`p-6 border-2 ${selectedReport === report.id ? 'border-purple-500' : 'border-transparent'}`}>
                <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center text-4xl mb-4`}>
                  {report.icon}
                </div>
                <h3 className="text-center font-bold text-gray-900">{report.title}</h3>
              </Card>
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
            {reportQuery.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 p-6 border-2 border-gray-100" />
                ))}
              </div>
            ) : reportData ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(reportData).map(([key, value]) => (
                  <Card key={key} className="bg-gray-50/60 p-6 text-center">
                    <p className="text-sm text-gray-600 font-semibold capitalize mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <AnimatedNumber value={Number(String(value).replace(/[^0-9.-]/g, '')) || 0} className="text-3xl font-bold text-purple-600" />
                    <p className="text-xs text-gray-500 mt-1">{String(value).match(/[^0-9.%,$\s]+/g) ? String(value) : ''}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No data available for the selected period.</p>
            )}
            {/* Contextual charts */}
            {reportData && (
              <div className="mt-8">
                {selectedReport === 'capacity-report' && (
                  <div className="bg-white border rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4">Bed Occupancy</h3>
                    <div className="w-full h-64">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie dataKey="value" data={[
                            { name: 'Occupied', value: Number(String(reportData.occupied ?? 0)) },
                            { name: 'Available', value: Number(String(reportData.available ?? 0)) },
                            { name: 'Maintenance', value: Number(String(reportData.maintenance ?? 0)) },
                          ]} innerRadius={60} outerRadius={90} paddingAngle={2}>
                            <Cell fill={colorForIndex(0, MODE)} />
                            <Cell fill={colorForIndex(1, MODE)} />
                            <Cell fill={colorForIndex(2, MODE)} />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {selectedReport === 'performance-metrics' && (
                  <div className="bg-white border rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4">Staff Overview</h3>
                    <div className="w-full h-64">
                      <ResponsiveContainer>
                        <BarChart data={[{ label: 'Staff', total: Number(String(reportData.totalStaff ?? 0)), active: Number(String(reportData.activeStaff ?? 0)) }]}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                          <XAxis dataKey="label" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                          <YAxis allowDecimals={false} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                          <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                          <Bar dataKey="total" fill={colorForIndex(0, MODE)} name="Total" />
                          <Bar dataKey="active" fill={colorForIndex(1, MODE)} name="Active" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {selectedReport === 'financial-overview' && (
                  <div className="bg-white border rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4">Revenue Overview</h3>
                    <div className="w-full h-64">
                      <ResponsiveContainer>
                        <BarChart data={[{ label: 'Revenue', total: Number(String((reportData as any).totalRevenue || '').replace(/[^0-9.-]/g, '')) || 0, collected: Number(String((reportData as any).collected || '').replace(/[^0-9.-]/g, '')) || 0, pending: Number(String((reportData as any).pending || '').replace(/[^0-9.-]/g, '')) || 0 }]}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                          <XAxis dataKey="label" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                          <YAxis allowDecimals={false} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                          <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                          <Bar dataKey="total" fill={colorForIndex(0, MODE)} name="Total" />
                          <Bar dataKey="collected" fill={colorForIndex(1, MODE)} name="Collected" />
                          <Bar dataKey="pending" fill={colorForIndex(2, MODE)} name="Pending" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={() => setSelectedReport(null)}>Back</Button>
              <Button onClick={() => window.print()} iconLeft={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h.01M6 22h12v-6H6v6z"/></svg>}>
                Export PDF
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
