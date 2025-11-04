'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { FeedbackButton } from '@/components/common/FeedbackButton'

interface AuditLog {
  id: string
  user_email?: string
  action: string
  resource_type: string
  resource_id: string
  created_at: string
}

export default function AuditLogsPage() {
  const { user, token, hasRole } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const isAdmin = hasRole('super_admin','regional_admin','hospital_admin')

  useEffect(() => {
    if (!token) return
    loadLogs(page)
  }, [token, page])

  const loadLogs = async (p: number) => {
    setLoading(true)
    try {
      const data = await apiClient.getAuditLogs(token!, { page: p, page_size: pageSize })
      setLogs(data.logs)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only admins can view audit logs.</p>
        </div>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Audit Logs</h2>
          <div className="flex items-center gap-2">
            <FeedbackButton variant="ghost" onClickAsync={() => loadLogs(page)}>Refresh</FeedbackButton>
          </div>
        </div>
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-gray-600">No logs</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Resource</th>
                  <th className="py-2 pr-4">ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{l.user_email || 'System'}</td>
                    <td className="py-2 pr-4">{l.action}</td>
                    <td className="py-2 pr-4">{l.resource_type}</td>
                    <td className="py-2 pr-4 font-mono">{l.resource_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-gray-600 text-sm">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <FeedbackButton variant="ghost" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</FeedbackButton>
            <FeedbackButton variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</FeedbackButton>
          </div>
        </div>
      </div>
    </div>
  )
}
