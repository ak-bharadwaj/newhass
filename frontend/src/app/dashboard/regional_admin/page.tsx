 'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { KPICard } from '@/components/dashboard/KPICard'
import { DataTable } from '@/components/dashboard/DataTable'
import { Modal } from '@/components/dashboard/Modal'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { promiseFeedback } from '@/lib/activityFeedback'
import { apiClient, HospitalWithStats, CreateHospitalData } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { RealTimeAlerts, SSEConnectionStatus } from '@/components/common/RealTimeAlerts'
import { useSSE } from '@/hooks/useSSE'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { useTheme } from '@/lib/themeUtils'
import SectionHeader from '@/components/common/SectionHeader'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/components/charts/LazyRecharts'
import { useSocket } from '@/components/providers/SocketProvider'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'

export default function RegionalAdminDashboard() {
  const { user, logout } = useAuth()
  const { isDark } = useTheme()
  const { isConnected } = useSSE('/api/v1/sse/alerts')
  const [hospitals, setHospitals] = useState<HospitalWithStats[]>([])
  const [regionMetrics, setRegionMetrics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showCreateHospital, setShowCreateHospital] = useState(false)
  const [showEditHospital, setShowEditHospital] = useState(false)
  const [selectedHospital, setSelectedHospital] = useState<HospitalWithStats | null>(null)

  // Form state
  const [hospitalForm, setHospitalForm] = useState<CreateHospitalData>({
    region_id: '',
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    bed_capacity: 0,
    is_active: true,
  })

  useEffect(() => {
    if (user?.region_id) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const token = getAccessToken()
      if (!token || !user?.region_id) {
        throw new Error('No access token or region available')
      }

      const [hospitalsData, metricsData] = await Promise.all([
        apiClient.getRegionHospitals(user.region_id, token),
        apiClient.getRegionMetrics(user.region_id, token),
      ])

      setHospitals(hospitalsData)
      setRegionMetrics(metricsData)

      // Set region_id in form
      setHospitalForm(prev => ({ ...prev, region_id: user.region_id! }))
      } catch (err: any) {
      console.error('Failed to load dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateHospital = async () => {
    const token = getAccessToken()
    if (!token) return

    await promiseFeedback(
      apiClient.createHospital(hospitalForm, token),
      {
        loading: 'Creating hospital...',
        success: 'Hospital created successfully!',
        error: 'Failed to create hospital',
      }
    )

    setShowCreateHospital(false)
    setHospitalForm({
      region_id: user?.region_id || '',
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      bed_capacity: 0,
      is_active: true,
    })
    await loadDashboardData()
  }

  const openEditHospitalModal = (hospital: HospitalWithStats) => {
    setSelectedHospital(hospital)
    setHospitalForm({
      region_id: hospital.region_id,
      name: hospital.name,
      code: hospital.code,
      address: hospital.address || '',
      phone: hospital.phone || '',
      email: hospital.email || '',
      bed_capacity: hospital.bed_capacity,
      is_active: hospital.is_active,
    })
  }

  const handleUpdateHospital = async () => {
    const token = getAccessToken()
    if (!token || !selectedHospital) return

    await promiseFeedback(
      (async () => {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/hospitals/${selectedHospital.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(hospitalForm),
        })
        if (!response.ok) throw new Error('Failed to update hospital')
        return response
      })(),
      {
        loading: 'Updating hospital...',
        success: 'Hospital updated successfully!',
        error: 'Failed to update hospital',
      }
    )

    setShowEditHospital(false)
    setSelectedHospital(null)
    setHospitalForm({
      region_id: user?.region_id || '',
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      bed_capacity: 0,
      is_active: true,
    })
    await loadDashboardData()
  }

  const handleDeleteHospital = async (hospitalId: string) => {
    const token = getAccessToken()
    if (!token) return

    await promiseFeedback(
      (async () => {
  const response = await fetch(`${apiClient['baseURL']}/api/v1/hospitals/${hospitalId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (!response.ok) throw new Error('Failed to delete hospital')
        return response
      })(),
      {
        loading: 'Deleting hospital...',
        success: 'Hospital deleted successfully!',
        error: 'Failed to delete hospital',
      }
    )

    await loadDashboardData()
  }

  // Live updates via sockets
  const { subscribe } = useSocket()
  useEffect(() => {
    if (!user?.region_id) return
    const unsubRegion = subscribe(`region:${user.region_id}:metrics`, () => {
      loadDashboardData()
    })
    const unsubHospitals = subscribe(`region:${user.region_id}:hospitals`, () => {
      loadDashboardData()
    })
    return () => {
      unsubRegion()
      unsubHospitals()
    }
  }, [user?.region_id])

  // Derived datasets for charts
  const utilizationData = useMemo(() => {
    return hospitals.map(h => ({
      name: h.code || h.name.slice(0, 8),
      utilization: h.bed_capacity > 0 ? Math.round((h.occupied_beds / h.bed_capacity) * 100) : 0,
    }))
  }, [hospitals])

  const bedsStackData = useMemo(() => {
    return hospitals.map(h => ({
      name: h.code || h.name.slice(0, 8),
      occupied: h.occupied_beds,
      available: Math.max(0, (h.bed_capacity || 0) - (h.occupied_beds || 0)),
    }))
  }, [hospitals])

  return (
    <ProtectedRoute requiredRoles={['regional_admin']}>
      <EnterpriseDashboardLayout role="regional_admin">
      <div className={`min-h-screen p-4 md:p-2 ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
        {/* Real-time alert system for discharge and system notifications */}
        <RealTimeAlerts />
        <SSEConnectionStatus isConnected={isConnected} />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <SectionHeader
            title="Regional Admin Dashboard"
            subtitle={`Welcome, ${user?.first_name}! Regional management and oversight`}
            chips={[{ label: 'Live', color: 'blue' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
          />

          {/* Small actions (logout) */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end mb-6"
          >
            <FeedbackButton
              onClick={() => logout()}
              variant="ghost"
              className="border-2 border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg transition-all"
            >
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
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading state */}
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* KPI Cards */}
              {regionMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="glass bg-gradient-to-br from-primary-500 to-primary-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="text-white/80 text-sm font-medium">Total</span>
                      </div>
                      <p className="text-4xl font-bold mb-1"><AnimatedNumber value={regionMetrics.hospitals_count} /></p>
                      <p className="text-white/90 text-sm">Hospitals</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="glass bg-gradient-to-br from-success-500 to-success-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <span className="text-white/80 text-sm font-medium">Available</span>
                      </div>
                      <p className="text-4xl font-bold mb-1"><AnimatedNumber value={regionMetrics.available_beds} /></p>
                      <p className="text-white/90 text-sm">of {regionMetrics.total_beds} Total Beds</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="glass bg-gradient-to-br from-warning-500 to-warning-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="text-white/80 text-sm font-medium">Rate</span>
                      </div>
                      <p className="text-4xl font-bold mb-1"><AnimatedNumber value={regionMetrics.bed_utilization} />%</p>
                      <p className="text-white/90 text-sm">{regionMetrics.occupied_beds} Occupied</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="glass bg-gradient-to-br from-secondary-500 to-secondary-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <span className="text-white/80 text-sm font-medium">Total</span>
                      </div>
                      <p className="text-4xl font-bold mb-1"><AnimatedNumber value={regionMetrics.staff_count} /></p>
                      <p className="text-white/90 text-sm">Staff Members</p>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Actions Row: Hospital creation is restricted to Super Admin; hidden for Regional Admin */}
              {/* Intentionally removed create-hospital action from Regional Admin page */}

              {/* Regional Analytics */}
              {hospitals.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Hospital Utilization % */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Hospital Utilization (%)</h3>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hospitals: {hospitals.length}</span>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={utilizationData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} tickFormatter={(v: any) => `${v}%`} />
                          <Tooltip formatter={((v: any) => `${v}%`) as any} />
                          <Bar dataKey="utilization" fill="#f59e0b" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  {/* Beds Occupied vs Available */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Beds by Hospital</h3>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Occupied vs Available</span>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bedsStackData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="occupied" stackId="a" fill="#ef4444" />
                          <Bar dataKey="available" stackId="a" fill="#22c55e" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>
              )}

              {hospitals.length > 0 && (
                <div className="grid grid-cols-1 gap-6 mb-8">
                  {/* Active Patients by Hospital (horizontal) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Active Patients by Hospital</h3>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Top load indicators</span>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...hospitals].sort((a,b)=> (b.active_patients||0) - (a.active_patients||0)).slice(0,10)} layout="vertical" margin={{left: 40}}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey={(d:any)=> d.code || d.name.slice(0,10)} width={80} />
                          <Tooltip />
                          <Bar dataKey="active_patients" fill="#0ea5e9" radius={[0,4,4,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Hospitals Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  Hospitals in Your Region
                </h2>
                <div className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl overflow-hidden">
                  <DataTable
                    columns={[
                      { key: 'name', label: 'Hospital Name' },
                      { key: 'code', label: 'Code' },
                      { key: 'bed_capacity', label: 'Capacity', render: (item) => `${item.bed_capacity} beds` },
                      {
                        key: 'utilization',
                        label: 'Utilization',
                        render: (item) => {
                          const utilization = item.bed_capacity > 0
                            ? Math.round((item.occupied_beds / item.bed_capacity) * 100)
                            : 0
                          return (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    utilization >= 90 ? 'bg-error-500' :
                                    utilization >= 75 ? 'bg-warning-500' :
                                    'bg-success-500'
                                  }`}
                                  style={{ width: `${utilization}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{utilization}%</span>
                            </div>
                          )
                        },
                      },
                      { key: 'staff_count', label: 'Staff' },
                      { key: 'active_patients', label: 'Patients' },
                      {
                        key: 'status',
                        label: 'Status',
                        render: (item) => (
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              item.is_active
                                ? 'bg-success-100 text-success-800 border border-success-300'
                                : 'bg-gray-100 text-gray-800 border border-gray-300'
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
                              onClick={() => openEditHospitalModal(item)}
                              variant="ghost"
                              size="sm"
                              className="text-primary-600 hover:text-primary-800 hover:bg-primary-50 p-2"
                              title="Edit hospital"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </FeedbackButton>
                            <FeedbackButton
                              onClickAsync={() => handleDeleteHospital(item.id)}
                              loadingText="..."
                              variant="ghost"
                              size="sm"
                              className="text-error-600 hover:text-error-800 hover:bg-error-50 p-2"
                              title="Delete hospital"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </FeedbackButton>
                          </div>
                        ),
                      },
                    ]}
                    data={hospitals}
                    emptyMessage="No hospitals found. Create your first hospital to get started."
                  />
                </div>
              </motion.div>

              {/* Region Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  Regional Summary
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200">
                    <p className="text-sm text-gray-600 mb-1">Region</p>
                    <p className="text-xl font-bold text-gray-900">{regionMetrics?.region_name}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-success-50 to-success-100 rounded-xl border border-success-200">
                    <p className="text-sm text-gray-600 mb-1">Total Patients</p>
                    <p className="text-xl font-bold text-gray-900">{regionMetrics?.total_patients?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-warning-50 to-warning-100 rounded-xl border border-warning-200">
                    <p className="text-sm text-gray-600 mb-1">Lab Backlog</p>
                    <p className="text-xl font-bold text-gray-900">{regionMetrics?.lab_backlog}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl border border-secondary-200">
                    <p className="text-sm text-gray-600 mb-1">Staff:Bed Ratio</p>
                    <p className="text-xl font-bold text-gray-900">
                      {regionMetrics?.total_beds > 0
                        ? (regionMetrics.staff_count / regionMetrics.total_beds).toFixed(2)
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
  </div>

  {/* Create Hospital Modal removed: restricted to Super Admin */}

      {/* Edit Hospital Modal */}
      <Modal
        isOpen={showEditHospital}
        onClose={() => {
          setShowEditHospital(false)
          setSelectedHospital(null)
        }}
        title="Edit Hospital"
        size="lg"
        footer={
          <>
            <FeedbackButton
              onClick={() => {
                setShowEditHospital(false)
                setSelectedHospital(null)
              }}
              variant="ghost"
            >
              Cancel
            </FeedbackButton>
            <FeedbackButton
              onClickAsync={handleUpdateHospital}
              loadingText="Updating..."
              successText="Updated!"
              variant="primary"
              disabled={!hospitalForm.name || !hospitalForm.code}
            >
              Update Hospital
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleUpdateHospital(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name *</label>
            <input
              type="text"
              required
              value={hospitalForm.name}
              onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="North General Hospital"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Code *</label>
            <input
              type="text"
              required
              value={hospitalForm.code}
              onChange={(e) => setHospitalForm({ ...hospitalForm, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="NGH"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={hospitalForm.address}
              onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="123 Main Street, City, State, Zip"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={hospitalForm.phone}
                onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="+1 555 123 4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={hospitalForm.email}
                onChange={(e) => setHospitalForm({ ...hospitalForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="contact@hospital.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bed Capacity *</label>
            <input
              type="number"
              required
              min="0"
              value={hospitalForm.bed_capacity}
              onChange={(e) => setHospitalForm({ ...hospitalForm, bed_capacity: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="100"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hospitalForm.is_active}
                onChange={(e) => setHospitalForm({ ...hospitalForm, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Active Hospital</span>
            </label>
          </div>
        </form>
      </Modal>
      </EnterpriseDashboardLayout>
    </ProtectedRoute>
  )
}
