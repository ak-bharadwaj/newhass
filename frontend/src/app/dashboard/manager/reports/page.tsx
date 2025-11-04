'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { NoAnalyticsDataEmptyState } from '@/components/ui/EmptyState'

interface Report {
  id: string
  title: string
  category: string
  generatedDate: string
  period: string
  icon: string
}

export default function ManagerReports() {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(false)
  }, [])

  const reports: Report[] = [
    { id: 'patient-summary', title: 'Patient Summary Report', category: 'Patients', period: 'Current', icon: '👥', generatedDate: '2025-10-29' },
    { id: 'financial', title: 'Financial Report', category: 'Finance', period: 'Monthly', icon: '💰', generatedDate: '2025-10-29' },
    { id: 'staff-performance', title: 'Staff Performance', category: 'HR', period: 'Monthly', icon: '👨‍⚕️', generatedDate: '2025-10-29' },
    { id: 'bed-occupancy', title: 'Bed Occupancy Report', category: 'Operations', period: 'Daily', icon: '🛏️', generatedDate: '2025-10-29' },
    { id: 'lab-statistics', title: 'Laboratory Statistics', category: 'Clinical', period: 'Weekly', icon: '🧪', generatedDate: '2025-10-29' },
    { id: 'appointment-stats', title: 'Appointment Statistics', category: 'Operations', period: 'Weekly', icon: '📅', generatedDate: '2025-10-29' }
  ]

  const generateReport = async (reportId: string) => {
    if (!token) return
    setSelectedReport(reportId)
    setLoading(true); setError(''); setReportData(null)
    try {
      const now = new Date()
      const start = new Date(now)
      start.setMonth(now.getMonth() - 1)
      // Build params expected by apiClient analytics methods (camelCase)
      const params: { startDate: string; endDate: string; hospitalId?: string } = {
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        hospitalId: user?.hospital_id || undefined,
      }

      let data: any = {}
      switch (reportId) {
        case 'patient-summary': {
          const res = await apiClient.getPatientAnalytics(token, params)
          data = {
            totalPatients: res?.total_patients ?? res?.count ?? '—',
            activePatients: res?.active_patients ?? '—',
            newPatients: res?.new_patients ?? '—',
          }
          break
        }
        case 'financial': {
          const rev = await apiClient.getRevenueAnalytics(token, params)
          data = {
            totalRevenue: rev?.total_revenue != null ? `$${Number(rev.total_revenue).toLocaleString()}` : '—',
            collected: rev?.collected_amount != null ? `$${Number(rev.collected_amount).toLocaleString()}` : '—',
            pending: rev?.pending_amount != null ? `$${Number(rev.pending_amount).toLocaleString()}` : '—',
            invoiceCount: rev?.invoice_count ?? '—',
            collectionRate: rev?.collection_rate != null ? `${Math.round(rev.collection_rate)}%` : '—',
          }
          break
        }
        case 'staff-performance': {
          const staff = await apiClient.getStaffAnalytics(token, params)
          data = {
            totalStaff: staff?.total_staff ?? '—',
            activeStaff: staff?.active_staff ?? '—',
            overtimeRate: staff?.overtime_rate != null ? `${Math.round(staff.overtime_rate)}%` : '—',
          }
          break
        }
        case 'bed-occupancy': {
          const beds = await apiClient.getBedOccupancyAnalytics(token, params)
          data = {
            totalBeds: beds?.total_beds ?? beds?.capacity ?? '—',
            occupied: beds?.occupied_beds ?? '—',
            available: beds?.available_beds ?? '—',
            maintenance: beds?.maintenance_beds ?? '—',
            occupancyRate: beds?.occupancy_rate != null ? `${Math.round(beds.occupancy_rate)}%` : '—',
          }
          break
        }
        case 'lab-statistics': {
          // No dedicated lab analytics endpoint yet
          data = null
          break
        }
        case 'appointment-stats': {
          const appts = await apiClient.getAppointmentAnalytics(token, params)
          data = {
            totalAppointments: appts?.total_appointments ?? appts?.count ?? '—',
            completed: appts?.completed ?? '—',
            cancelled: appts?.cancelled ?? '—',
          }
          break
        }
      }
      setReportData(data)
    } catch (e: any) {
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Patients': return 'bg-blue-100 text-blue-800'
      case 'Finance': return 'bg-green-100 text-green-800'
      case 'HR': return 'bg-purple-100 text-purple-800'
      case 'Operations': return 'bg-orange-100 text-orange-800'
      case 'Clinical': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <EnterpriseDashboardLayout role="manager">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/manager" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Hospital Reports
          </h1>
          <p className="text-gray-600">Generate and view comprehensive reports</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Report List */}
          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => generateReport(report.id)}
                  className={`bg-white rounded-2xl shadow-md p-6 border-2 cursor-pointer transition-all hover:border-purple-300 ${
                    selectedReport === report.id ? 'border-purple-500' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{report.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{report.title}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getCategoryColor(report.category)}`}>
                          {report.category}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          {report.period}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Report Details */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex items-center justify-center h-96 bg-white rounded-2xl shadow-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
            ) : selectedReport && reportData ? (
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
                <div className="grid grid-cols-2 gap-6">
                  {Object.entries(reportData).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-gray-50 rounded-xl p-6">
                      <p className="text-sm text-gray-600 font-semibold capitalize mb-2">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      {value && typeof value === 'object' ? (
                        <div className="space-y-2">
                          {Object.entries(value).map(([k, v]: [string, any]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-sm text-gray-600 capitalize">{k}:</span>
                              <span className="font-bold">{v}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-3xl font-bold text-purple-600">{String(value)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : selectedReport && reportData === null ? (
              <NoAnalyticsDataEmptyState onRefresh={() => selectedReport && generateReport(selectedReport)} />
            ) : (
              <div className="flex items-center justify-center h-96 bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <p className="text-gray-500 text-lg mb-2">Select a report to view</p>
                  <p className="text-gray-400 text-sm">Click on any report from the list</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
