'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type AuditLog } from '@/lib/api'

export default function SuperAdminAuditLogs() {
  const { token } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!token) return
    const loadLogs = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await apiClient.getAuditLogs(token)
        setLogs(Array.isArray(data) ? data : data?.logs || [])
      } catch (e: any) {
        console.error('Failed to load audit logs', e)
        setError(e?.message || 'Failed to load audit logs')
        setLogs([])
      } finally {
        setLoading(false)
      }
    }
    loadLogs()
  }, [token])

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return logs
    return logs.filter(log =>
      (log.user_email?.toLowerCase() || '').includes(q) ||
      (log.user_name?.toLowerCase() || '').includes(q) ||
      (log.action?.toLowerCase() || '').includes(q) ||
      (log.resource_type?.toLowerCase() || '').includes(q)
    )
  }, [logs, searchQuery])

  const stats = useMemo(() => ({
    total: logs.length,
    recent: logs.filter(l => {
      const created = new Date(l.created_at)
      const today = new Date()
      return created.toDateString() === today.toDateString()
    }).length,
    users: new Set(logs.map(l => l.user_id).filter(Boolean)).size,
  }), [logs])

  return (
    <EnterpriseDashboardLayout role="super_admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/super_admin" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Audit Logs
          </h1>
          <p className="text-gray-600">System audit trail and security events</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total Events', value: stats.total, color: 'from-red-500 to-pink-500', icon: '📋' },
            { label: 'Today', value: stats.recent, color: 'from-green-500 to-emerald-500', icon: '📅' },
            { label: 'Unique Users', value: stats.users, color: 'from-blue-500 to-indigo-500', icon: '👥' },
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
            placeholder="Search audit logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Timestamp</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">User</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Action</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Resource</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {searchQuery ? 'No audit logs match your search' : 'No audit logs available'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm font-mono">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">{log.user_email || log.user_name || '—'}</td>
                      <td className="px-6 py-4 font-semibold">{log.action}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.resource_type}/{log.resource_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{log.ip_address || '—'}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
