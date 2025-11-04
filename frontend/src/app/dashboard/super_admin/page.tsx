'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { KPICard } from '@/components/dashboard/KPICard'
import { DataTable } from '@/components/dashboard/DataTable'
import { Modal } from '@/components/dashboard/Modal'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { activityFeedbacks, promiseFeedback } from '@/lib/activityFeedback'
import { apiClient, GlobalMetrics, RegionWithStats, PaginatedAuditLogs, PaginatedUsers } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import SectionHeader from '@/components/common/SectionHeader'

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth()
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null)
  const [regions, setRegions] = useState<RegionWithStats[]>([])
  const [auditLogs, setAuditLogs] = useState<PaginatedAuditLogs | null>(null)
  const [users, setUsers] = useState<PaginatedUsers | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showCreateRegion, setShowCreateRegion] = useState(false)
  const [showEditRegion, setShowEditRegion] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [showAuditDetail, setShowAuditDetail] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedAudit, setSelectedAudit] = useState<any>(null)

  // Form states
  const [regionForm, setRegionForm] = useState({ name: '', code: '', theme_settings: {} })
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role_id: '',
    role: '',
    role_name: '',
    region_id: '',
    hospital_id: '',
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const token = getAccessToken()
      if (!token) {
        throw new Error('No access token available')
      }

      const [metricsData, regionsData, auditLogsData, usersData] = await Promise.all([
        apiClient.getGlobalMetrics(token),
        apiClient.getRegions(token),
        apiClient.getAuditLogs(token, { page: 1, page_size: 10 }),
        apiClient.getUsers(token, { page: 1, page_size: 10 }),
      ])

      setMetrics(metricsData)
      setRegions(regionsData)
      setAuditLogs(auditLogsData)
      setUsers(usersData)
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRegion = async () => {
    const token = getAccessToken()
    if (!token) return

    await promiseFeedback(
      apiClient.createRegion(regionForm, token),
      {
        loading: 'Creating region...',
        success: 'Region created successfully!',
        error: 'Failed to create region',
      }
    )

    setShowCreateRegion(false)
    setRegionForm({ name: '', code: '', theme_settings: {} })
    await loadDashboardData()
  }

  const handleUpdateRegion = async () => {
    const token = getAccessToken()
    if (!token || !selectedRegion) return

    await promiseFeedback(
      (async () => {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/admin/regions/${selectedRegion.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(regionForm),
        })
        if (!response.ok) throw new Error('Failed to update region')
        return response
      })(),
      {
        loading: 'Updating region...',
        success: 'Region updated successfully!',
        error: 'Failed to update region',
      }
    )

    setShowEditRegion(false)
    setSelectedRegion(null)
    setRegionForm({ name: '', code: '', theme_settings: {} })
    await loadDashboardData()
  }

  const handleDeleteRegion = async (regionId: string) => {
    const token = getAccessToken()
    if (!token) return

    await promiseFeedback(
      (async () => {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/admin/regions/${regionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (!response.ok) throw new Error('Failed to delete region')
        return response
      })(),
      {
        loading: 'Deleting region...',
        success: 'Region deleted successfully!',
        error: 'Failed to delete region',
      }
    )

    await loadDashboardData()
  }

  const handleCreateUser = async () => {
    const token = getAccessToken()
    if (!token) return

    // Resolve role_id from a representative existing user with the role_name
    const resolveRoleId = async (roleName?: string) => {
      if (!roleName) return null
      try {
        const res = await apiClient.getUsers(token, { role_name: roleName, page: 1, page_size: 1 })
        if (res && (res as any).users && (res as any).users.length > 0) return (res as any).users[0].role_id
        return null
      } catch (e) {
        return null
      }
    }

    try {
      // If user provided a role_id already, keep it. Otherwise attempt to resolve via role_name field.
      let payload: any = { ...userForm }
      if (!payload.role_id && (payload.role_name || payload.role)) {
        const roleName = payload.role_name || payload.role
        const rid = await resolveRoleId(roleName)
        if (!rid) throw new Error('Unable to resolve role_id for selected role. Please provide role_id.')
        payload.role_id = rid
      }

      await promiseFeedback(
        apiClient.createUser(payload as any, token),
        {
          loading: 'Creating user...',
          success: 'User created successfully!',
          error: 'Failed to create user',
        }
      )
    } catch (err: any) {
      // Wrap the error in the promiseFeedback pattern by rethrowing
      throw err
    }

    setShowCreateUser(false)
    setUserForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role_id: '',
      role: '',
      role_name: '',
      region_id: '',
      hospital_id: '',
    })
    await loadDashboardData()
  }

  const handleUpdateUser = async () => {
    const token = getAccessToken()
    if (!token || !selectedUser) return

    await promiseFeedback(
      apiClient.updateUser(selectedUser.id, userForm as any, token),
      {
        loading: 'Updating user...',
        success: 'User updated successfully!',
        error: 'Failed to update user',
      }
    )

    setShowEditUser(false)
    setSelectedUser(null)
    setUserForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role_id: '',
      role: '',
      role_name: '',
      region_id: '',
      hospital_id: '',
    })
    await loadDashboardData()
  }

  const handleDeleteUser = async (userId: string) => {
    const token = getAccessToken()
    if (!token) return

    await promiseFeedback(
      apiClient.deleteUser(userId, token),
      {
        loading: 'Deleting user...',
        success: 'User deleted successfully!',
        error: 'Failed to delete user',
      }
    )

    await loadDashboardData()
  }

  const openEditRegionModal = (region: any) => {
    setSelectedRegion(region)
    setRegionForm({
      name: region.name,
      code: region.code,
      theme_settings: region.theme_settings || {},
    })
    setShowEditRegion(true)
  }

  const openEditUserModal = (user: any) => {
    setSelectedUser(user)
    setUserForm({
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: user.role_id || '',
      role: user.role || '',
      role_name: user.role_name || '',
      region_id: user.region_id || '',
      hospital_id: user.hospital_id || '',
    })
    setShowEditUser(true)
  }

  const handleExportReports = async () => {
    // Export the currently loaded datasets (metrics, regions, users) as CSV/JSON downloads
    try {
      const toCSV = (rows: any[], headers?: string[]) => {
        if (!rows || rows.length === 0) return ''
        const cols = headers || Object.keys(rows[0])
        const escape = (v: any) => {
          if (v === null || v === undefined) return ''
          const s = String(v)
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"'
          }
          return s
        }
        const header = cols.join(',')
        const data = rows.map(r => cols.map(c => escape((r as any)[c])).join(',')).join('\n')
        return header + '\n' + data
      }

      const download = (content: BlobPart, filename: string, mime = 'text/plain;charset=utf-8') => {
        const blob = new Blob([content], { type: mime })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }

      // 1) Metrics as JSON
      if (metrics) {
        download(JSON.stringify(metrics, null, 2), `global-metrics-${new Date().toISOString().slice(0,10)}.json`, 'application/json')
      }

      // 2) Regions with selected fields as CSV
      if (regions && regions.length) {
        const regionRows = regions.map(r => ({
          id: r.id,
          name: r.name,
          code: r.code,
          hospitals_count: r.hospitals_count,
          active_beds: r.active_beds,
          total_staff: r.total_staff,
          total_patients: r.total_patients,
          is_active: r.is_active,
        }))
        const csv = toCSV(regionRows)
        download(csv, `regions-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8')
      }

      // 3) Users (first page loaded) as CSV
      if (users && users.users && users.users.length) {
        const userRows = users.users.map(u => ({
          id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          role_name: u.role_name,
          is_active: u.is_active,
          hospital_id: u.hospital_id || '',
          region_id: u.region_id || '',
          created_at: u.created_at,
          last_login: u.last_login || ''
        }))
        const csv = toCSV(userRows)
        download(csv, `users-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8')
      }

      activityFeedbacks.dataExported()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <ProtectedRoute requiredRoles={['super_admin']}>
      <EnterpriseDashboardLayout role="super_admin">
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <SectionHeader
              title="Super Admin Control Center"
              subtitle={`Welcome back, ${user?.first_name}! System-wide management and oversight`}
              chips={[{ label: 'System', color: 'purple' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
            />

            {/* Small actions (logout) */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end mb-6">
              <FeedbackButton
                onClick={() => logout()}
                variant="ghost"
                className="border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </FeedbackButton>
            </motion.div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mb-6 p-4 bg-error-50 border-l-4 border-error-500 text-error-700 rounded-lg shadow-md"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading state with skeleton */}
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* Modern KPI Cards with Glass Effect */}
              {metrics && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                >
                  <div className="glass bg-gradient-to-br from-primary-500 to-primary-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span className="text-white/80 text-sm font-medium">Total</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{metrics.total_patients.toLocaleString()}</p>
                    <p className="text-white/90 text-sm">Patients</p>
                  </div>

                  <div className="glass bg-gradient-to-br from-success-500 to-green-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <span className="text-white/80 text-sm font-medium">Active</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{metrics.active_visits.toLocaleString()}</p>
                    <p className="text-white/90 text-sm">Visits</p>
                  </div>

                  <div className="glass bg-gradient-to-br from-error-500 to-red-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <span className="text-white/80 text-sm font-medium">Urgent</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{metrics.open_emergencies.toLocaleString()}</p>
                    <p className="text-white/90 text-sm">Emergencies</p>
                  </div>

                  <div className="glass bg-gradient-to-br from-warning-500 to-orange-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <span className="text-white/80 text-sm font-medium">Capacity</span>
                    </div>
                    <p className="text-4xl font-bold mb-1">{metrics.avg_bed_utilization}%</p>
                    <p className="text-white/90 text-sm">{metrics.total_hospitals} Hospitals</p>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons with Modern Style */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap gap-4 mb-8"
              >
                <FeedbackButton
                  onClick={() => setShowCreateRegion(true)}
                  variant="primary"
                  className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Region
                </FeedbackButton>
                <FeedbackButton
                  onClick={() => setShowCreateUser(true)}
                  variant="secondary"
                  className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create User
                </FeedbackButton>
                <FeedbackButton
                  onClickAsync={handleExportReports}
                  loadingText="Exporting..."
                  successText="Exported!"
                  variant="success"
                  className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Reports
                </FeedbackButton>
              </motion.div>

              {/* Modern Regions Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-6 mb-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Regions Overview
                </h2>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Region Name' },
                    { key: 'code', label: 'Code' },
                    { key: 'hospitals_count', label: 'Hospitals', render: (item) => item.hospitals_count },
                    { key: 'total_staff', label: 'Staff', render: (item) => item.total_staff },
                    { key: 'total_patients', label: 'Patients', render: (item) => item.total_patients },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (item) => (
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            item.is_active
                              ? 'bg-success-100 text-success-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      ),
                    },
                    {
                      key: 'actions',
                      label: 'Actions',
                      render: (item) => (
                        <div className="flex gap-2">
                          <FeedbackButton
                            onClick={() => openEditRegionModal(item)}
                            variant="ghost"
                            size="sm"
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </FeedbackButton>
                          <FeedbackButton
                            onClickAsync={() => handleDeleteRegion(item.id)}
                            loadingText="..."
                            variant="ghost"
                            size="sm"
                            className="text-error-600 hover:text-error-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </FeedbackButton>
                        </div>
                      ),
                    },
                  ]}
                  data={regions}
                  emptyMessage="No regions found. Create your first region to get started."
                />
              </motion.div>

              {/* Modern Users Table */}
              {users && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-6 mb-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    System Users
                  </h2>
                  <DataTable
                    columns={[
                      { key: 'email', label: 'Email' },
                      {
                        key: 'name',
                        label: 'Name',
                        render: (item) => `${item.first_name} ${item.last_name}`,
                      },
                      { key: 'role_name', label: 'Role' },
                      { key: 'region_name', label: 'Region', render: (item) => item.region_name || 'N/A' },
                      {
                        key: 'status',
                        label: 'Status',
                        render: (item) => (
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              item.is_active
                                ? 'bg-success-100 text-success-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        ),
                      },
                      {
                        key: 'actions',
                        label: 'Actions',
                        render: (item) => (
                          <div className="flex gap-2">
                            <FeedbackButton
                              onClick={() => openEditUserModal(item)}
                              variant="ghost"
                              size="sm"
                              className="text-primary-600 hover:text-primary-800"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </FeedbackButton>
                            <FeedbackButton
                              onClickAsync={() => handleDeleteUser(item.id)}
                              loadingText="..."
                              variant="ghost"
                              size="sm"
                              className="text-error-600 hover:text-error-800"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </FeedbackButton>
                          </div>
                        ),
                      },
                    ]}
                    data={users.users}
                    emptyMessage="No users found."
                  />
                  <div className="mt-4 text-sm text-gray-600">
                    Showing {users.users.length} of {users.total} users
                  </div>
                </motion.div>
              )}

              {/* Audit Logs Table */}
              {auditLogs && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-6 mb-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    Recent Audit Logs
                  </h2>
                  <DataTable
                    columns={[
                      {
                        key: 'created_at',
                        label: 'Time',
                        render: (item) => new Date(item.created_at).toLocaleString(),
                      },
                      { key: 'user_name', label: 'User', render: (item) => item.user_name || 'System' },
                      { key: 'action', label: 'Action' },
                      { key: 'resource_type', label: 'Resource Type' },
                      {
                        key: 'details',
                        label: 'Details',
                        render: (item) => (
                          <FeedbackButton
                            onClick={() => {
                              setSelectedAudit(item)
                              setShowAuditDetail(true)
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-primary-600 hover:text-primary-800"
                          >
                            View
                          </FeedbackButton>
                        ),
                      },
                    ]}
                    data={auditLogs.logs}
                    emptyMessage="No audit logs found."
                  />
                  <div className="mt-4 text-sm text-gray-600">
                    Showing {auditLogs.logs.length} of {auditLogs.total} logs
                  </div>
                </motion.div>
              )}

              {/* System Health Indicator with Modern Design */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass bg-gradient-to-r from-success-50 to-green-50 backdrop-blur-xl border border-success-200 shadow-lg rounded-2xl p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-success-500 animate-pulse shadow-lg shadow-success-300"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">System Health: Operational</h3>
                    <p className="text-sm text-gray-600 mt-1">All services running normally • Last check: {new Date().toLocaleTimeString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-center px-3 py-2 bg-white rounded-lg border border-success-200">
                      <p className="text-xs text-gray-600">Uptime</p>
                      <p className="text-sm font-bold text-success-600">99.9%</p>
                    </div>
                    <div className="text-center px-3 py-2 bg-white rounded-lg border border-success-200">
                      <p className="text-xs text-gray-600">Response</p>
                      <p className="text-sm font-bold text-success-600">45ms</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Create Region Modal */}
      <Modal
        isOpen={showCreateRegion}
        onClose={() => setShowCreateRegion(false)}
        title="Create New Region"
        footer={
          <>
            <FeedbackButton
              onClick={() => setShowCreateRegion(false)}
              variant="ghost"
            >
              Cancel
            </FeedbackButton>
            <FeedbackButton
              onClickAsync={handleCreateRegion}
              loadingText="Creating..."
              successText="Created!"
              variant="primary"
              disabled={!regionForm.name || !regionForm.code}
            >
              Create Region
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateRegion(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region Name</label>
            <input
              type="text"
              required
              value={regionForm.name}
              onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="North Region"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region Code</label>
            <input
              type="text"
              required
              value={regionForm.code}
              onChange={(e) => setRegionForm({ ...regionForm, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="NORTH"
            />
          </div>
        </form>
      </Modal>

      {/* Edit Region Modal */}
      <Modal
        isOpen={showEditRegion}
        onClose={() => {
          setShowEditRegion(false)
          setSelectedRegion(null)
          setRegionForm({ name: '', code: '', theme_settings: {} })
        }}
        title="Edit Region"
        footer={
          <>
            <FeedbackButton
              onClick={() => {
                setShowEditRegion(false)
                setSelectedRegion(null)
                setRegionForm({ name: '', code: '', theme_settings: {} })
              }}
              variant="ghost"
            >
              Cancel
            </FeedbackButton>
            <FeedbackButton
              onClickAsync={handleUpdateRegion}
              loadingText="Updating..."
              successText="Updated!"
              variant="primary"
              disabled={!regionForm.name || !regionForm.code}
            >
              Update Region
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleUpdateRegion(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region Name</label>
            <input
              type="text"
              required
              value={regionForm.name}
              onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="North Region"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region Code</label>
            <input
              type="text"
              required
              value={regionForm.code}
              onChange={(e) => setRegionForm({ ...regionForm, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="NORTH"
            />
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        title="Create New User"
        size="lg"
        footer={
          <>
            <FeedbackButton
              onClick={() => setShowCreateUser(false)}
              variant="ghost"
            >
              Cancel
            </FeedbackButton>
            <FeedbackButton
              onClickAsync={handleCreateUser}
              loadingText="Creating..."
              successText="Created!"
              variant="secondary"
              disabled={!userForm.email || !userForm.password || !userForm.first_name || !userForm.last_name}
            >
              Create User
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={userForm.first_name}
                onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={userForm.last_name}
                onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={(userForm as any).role_name || ''}
              onChange={(e) => setUserForm({ ...userForm, role_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
            >
              <option value="">Select role</option>
              <option value="super_admin">Super Admin</option>
              <option value="regional_admin">Regional Admin</option>
              <option value="manager">Manager</option>
              <option value="hospital_admin">Hospital Admin</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="lab_tech">Lab Technician</option>
              <option value="reception">Reception</option>
              <option value="patient">Patient</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditUser}
        onClose={() => {
          setShowEditUser(false)
          setSelectedUser(null)
          setUserForm({
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            role_id: '',
            role: '',
            role_name: '',
            region_id: '',
            hospital_id: '',
          })
        }}
        title="Edit User"
        size="lg"
        footer={
          <>
            <FeedbackButton
              onClick={() => {
                setShowEditUser(false)
                setSelectedUser(null)
                setUserForm({
                  email: '',
                  password: '',
                  first_name: '',
                  last_name: '',
                  role_id: '',
                  role: '',
                  role_name: '',
                  region_id: '',
                  hospital_id: '',
                })
              }}
              variant="ghost"
            >
              Cancel
            </FeedbackButton>
            <FeedbackButton
              onClickAsync={handleUpdateUser}
              loadingText="Updating..."
              successText="Updated!"
              variant="secondary"
              disabled={!userForm.email || !userForm.first_name || !userForm.last_name}
            >
              Update User
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={userForm.first_name}
                onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={userForm.last_name}
                onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password (leave blank to keep current)</label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
              placeholder="Leave blank to keep current password"
            />
          </div>
        </form>
      </Modal>

      {/* Audit Detail Modal */}
      <Modal
        isOpen={showAuditDetail}
        onClose={() => setShowAuditDetail(false)}
        title="Audit Log Details"
        size="lg"
      >
        {selectedAudit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">User</p>
                <p className="text-sm text-gray-900">{selectedAudit.user_name || 'System'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Action</p>
                <p className="text-sm text-gray-900">{selectedAudit.action}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Resource Type</p>
                <p className="text-sm text-gray-900">{selectedAudit.resource_type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Time</p>
                <p className="text-sm text-gray-900">{new Date(selectedAudit.created_at).toLocaleString()}</p>
              </div>
            </div>
            {selectedAudit.before_state && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Before State</p>
                <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(selectedAudit.before_state, null, 2)}
                </pre>
              </div>
            )}
            {selectedAudit.after_state && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">After State</p>
                <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(selectedAudit.after_state, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
      </EnterpriseDashboardLayout>
    </ProtectedRoute>
  )
}
