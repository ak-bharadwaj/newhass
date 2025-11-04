'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useRegionalBranding } from '@/contexts/RegionalBrandingContext'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { RegionalBanner } from '@/components/branding/RegionalBanner'
import { BrandingSettingsModal } from '@/components/branding/BrandingSettingsModal'
import { useRouter } from 'next/navigation'
import SectionHeader from '@/components/common/SectionHeader'
import { apiClient } from '@/lib/api'

export default function AdminDashboard() {
  const { user, token } = useAuth()
  const router = useRouter()
  const { branding, getThemeColors } = useRegionalBranding()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regionMetrics, setRegionMetrics] = useState<any | null>(null)
  const [auditItems, setAuditItems] = useState<Array<{
    id: string
    action: string
    resource_type: string
    resource_id: string
    user_name?: string
    user_email?: string
    created_at: string
  }>>([])
  const [showBrandingSettings, setShowBrandingSettings] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        if (!user) return
        // Prefer region-scoped metrics for admins, else fall back to global
        if (user.region_id && token) {
          const metrics = await apiClient.getRegionMetrics(user.region_id, token)
          setRegionMetrics(metrics)
        } else if (token) {
          const gm = await apiClient.getGlobalMetrics(token)
          setRegionMetrics({
            hospitals_count: gm.total_hospitals,
            staff_count: gm.total_staff,
            total_patients: gm.total_patients,
            bed_utilization: gm.avg_bed_utilization,
          })
        }
        // Fetch recent audit logs (backend should scope by region via auth)
        if (token) {
          const logs = await apiClient.getAuditLogs(token, { page_size: 8 })
          setAuditItems(logs.logs)
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user])

  const theme = getThemeColors()

  const quickActions = [
    {
      title: 'Hospitals',
      description: 'Manage hospitals in your region',
      icon: '🏥',
      color: 'from-blue-500 to-indigo-500',
      href: '/dashboard/admin/hospitals'
    },
    {
      title: 'Users',
      description: 'User management and roles',
      icon: '👥',
      color: 'from-purple-500 to-pink-500',
      href: '/dashboard/admin/users'
    },
    {
      title: 'Patients',
      description: 'Patient records and analytics',
      icon: '🩺',
      color: 'from-green-500 to-emerald-500',
      href: '/dashboard/admin/patients'
    },
    {
      title: 'Reports',
      description: 'Monthly and compliance reports',
      icon: '📊',
      color: 'from-yellow-500 to-orange-500',
      href: '/dashboard/admin/reports/monthly'
    },
    {
      title: 'Analytics',
      description: 'Regional performance metrics',
      icon: '📈',
      color: 'from-red-500 to-rose-500',
      href: '/dashboard/admin/analytics/overview'
    },
    {
      title: 'Audit Logs',
      description: 'System activity logs',
      icon: '🔍',
      color: 'from-cyan-500 to-blue-500',
      href: '/dashboard/admin/audit-logs'
    }
  ]

  const stats = useMemo(() => {
    if (!regionMetrics) return [] as Array<{ label: string; value: string; icon: string; change?: string }>
    return [
      { label: 'Total Hospitals', value: String(regionMetrics.hospitals_count ?? 0), icon: '🏥' },
      { label: 'Total Staff', value: String(regionMetrics.staff_count ?? 0), icon: '👤' },
      { label: 'Active Patients', value: String(regionMetrics.total_patients ?? 0), icon: '👥' },
      { label: 'Bed Utilization', value: `${Math.round(regionMetrics.bed_utilization ?? 0)}%`, icon: '🛏️' },
    ]
  }, [regionMetrics])

  if (!user || user.role_name !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-12 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600">Admin access required.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <EnterpriseDashboardLayout role="admin">
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </EnterpriseDashboardLayout>
    )
  }

  return (
    <EnterpriseDashboardLayout role="admin">
      <div className="p-8 space-y-8">
        {/* Regional Banner */}
        <RegionalBanner />

        {/* Header */}
        <SectionHeader
          title="Admin Dashboard"
          subtitle={`Welcome back, ${user.first_name} ${user.last_name} • Regional Management Portal`}
          chips={[{ label: 'Admin', color: 'purple' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
        />
        {error && (
          <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800">{error}</div>
        )}
        {/* Branding Settings Button */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end mb-4">
          <motion.button
            onClick={() => setShowBrandingSettings(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative group px-6 py-3 bg-gradient-to-r ${theme.primary} text-white rounded-xl shadow-lg hover:shadow-xl transition-all`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🎨</span>
              <span className="font-semibold">Regional Branding</span>
            </div>
          </motion.button>
        </motion.div>

        {/* Branding Settings Modal */}
        <BrandingSettingsModal 
          isOpen={showBrandingSettings}
          onClose={() => setShowBrandingSettings(false)}
        />

        {/* Stats Grid (live) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${theme.stats[index]} rounded-2xl blur opacity-20 group-hover:opacity-30 transition`} />
              <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-4xl">{stat.icon}</span>
                  {/* Optional delta can be shown when available */}
                </div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${theme.stats[index]} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 bg-gradient-to-r ${theme.primary} bg-clip-text text-transparent`}>
            <span className="text-3xl">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                onClick={() => router.push(action.href)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                className="relative group text-left"
              >
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${theme.secondary} rounded-2xl blur opacity-20 group-hover:opacity-40 transition`} />
                <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">{action.icon}</span>
                    <svg className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-bold mb-2 bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}>{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity (live audit logs) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">📋</span>
            Recent Activity
          </h2>
          <div className="space-y-4">
            {auditItems.length === 0 ? (
              <p className="text-gray-600">No recent activity.</p>
            ) : (
              auditItems.slice(0, 8).map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0`}>
                    🔔
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{log.action}</p>
                    <p className="text-sm text-gray-600 truncate">{log.resource_type} · {log.resource_id}</p>
                    {log.user_name || log.user_email ? (
                      <p className="text-xs text-gray-500 truncate">By {log.user_name || log.user_email}</p>
                    ) : null}
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
