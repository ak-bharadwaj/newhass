'use client'

import { useState, useEffect } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import apiClient, { type LabTest } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function LabTechLabTests() {
  const { token, user } = useAuth()
  const [tests, setTests] = useState<LabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    if (!token) return
    setLoading(true); setError('')
    try {
      const list = await apiClient.listLabTests(token, {
        hospital_id: user?.hospital_id,
        limit: 200,
      })
      setTests(list || [])
    } catch (e: any) {
      setError('Failed to load lab tests')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'STAT':
      case 'stat': return 'bg-red-500 text-white'
      case 'urgent': return 'bg-orange-500 text-white'
      case 'routine': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const filteredTests = tests.filter(test => {
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus
    const matchesPriority = filterPriority === 'all' || String(test.urgency || '').toLowerCase() === filterPriority.toLowerCase()
    return matchesStatus && matchesPriority
  })

  const stats = {
    total: tests.length,
    pending: tests.filter(t => t.status === 'pending').length,
    inProgress: tests.filter(t => t.status === 'in_progress').length,
    stat: tests.filter(t => String(t.urgency || '').toLowerCase() === 'stat' && t.status !== 'completed').length
  }

  return (
    <EnterpriseDashboardLayout role="lab_tech">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/lab_tech" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Laboratory Tests</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and process all laboratory tests
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Tests</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="text-4xl">🔬</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Pending</p>
                <p className="text-3xl font-bold mt-1">{stats.pending}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">In Progress</p>
                <p className="text-3xl font-bold mt-1">{stats.inProgress}</p>
              </div>
              <div className="text-4xl">⚗️</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">STAT</p>
                <p className="text-3xl font-bold mt-1">{stats.stat}</p>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="stat">STAT</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>
          </div>
        </div>

        {/* Tests List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 ${
                  String(test.urgency || '').toLowerCase() === 'stat' ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {test.test_type}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                        {test.status.replace('_', ' ')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(String(test.urgency || ''))}`}>
                        {String(test.urgency || '').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Patient: {test.patient_name} {test.patient_mrn ? `(MRN: ${test.patient_mrn})` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Test Code</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{test.id}</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Category</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{test.test_type}</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ordered By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{test.requested_by_name ?? '—'}</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Requested</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(test.requested_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    View Details
                  </button>
                </div>
              </motion.div>
            ))}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
            )}
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
