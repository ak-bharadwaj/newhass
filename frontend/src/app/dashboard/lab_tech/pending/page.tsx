'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient, { type LabTest } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function LabTechPending() {
  const { token, user } = useAuth()
  const [tests, setTests] = useState<LabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    loadPendingTests()
  }, [])

  const loadPendingTests = async () => {
    if (!token) return
    setLoading(true); setError('')
    try {
      const results = await apiClient.listLabTests(token, {
        hospital_id: user?.hospital_id,
        status: 'pending',
      })
      const inProgress = await apiClient.listLabTests(token, {
        hospital_id: user?.hospital_id,
        status: 'in_progress',
      })
      setTests([...(results || []), ...(inProgress || [])])
    } catch (e: any) {
      setError('Failed to load lab tests')
    } finally {
      setLoading(false)
    }
  }

  const filteredTests = tests.filter(test => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = 
      (test.patient_name || '').toLowerCase().includes(q) ||
      (test.patient_mrn || '').toLowerCase().includes(q) ||
      (test.test_type || '').toLowerCase().includes(q)
    const matchesPriority = priorityFilter === 'all' || (test.urgency || '').toLowerCase() === priorityFilter.toLowerCase()
    return matchesSearch && matchesPriority
  })

  const stats = {
    total: tests.length,
    stat: tests.filter(t => (t.urgency || '').toUpperCase() === 'STAT').length,
    urgent: tests.filter(t => (t.urgency || '').toLowerCase() === 'urgent').length,
    routine: tests.filter(t => (t.urgency || '').toLowerCase() === 'routine').length,
    inProgress: tests.filter(t => t.status === 'in_progress').length
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'STAT': return 'bg-red-100 text-red-800 border-red-300'
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'routine': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // No "start" endpoint available yet; showing read-only list

  return (
    <EnterpriseDashboardLayout role="lab_tech">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/lab_tech" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">
            Pending Laboratory Tests
          </h1>
          <p className="text-gray-600">Process pending tests by priority</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {[
            { label: 'Total Pending', value: stats.total, color: 'from-yellow-500 to-orange-500', icon: '🧪' },
            { label: 'STAT (Critical)', value: stats.stat, color: 'from-red-500 to-pink-500', icon: '🚨' },
            { label: 'Urgent', value: stats.urgent, color: 'from-orange-500 to-red-400', icon: '⚡' },
            { label: 'Routine', value: stats.routine, color: 'from-blue-500 to-indigo-500', icon: '📋' },
            { label: 'In Progress', value: stats.inProgress, color: 'from-green-500 to-emerald-500', icon: '⏳' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl mb-3`}>
                  {stat.icon}
                </div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by patient name, MRN, or test name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
          >
            <option value="all">All Priorities</option>
            <option value="STAT">STAT</option>
            <option value="urgent">Urgent</option>
            <option value="routine">Routine</option>
          </select>
        </div>

        {/* Tests List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
            )}
            {filteredTests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md p-6 border-2 border-gray-100 hover:border-yellow-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-2xl">
                      🧪
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{test.test_type}</h3>
                      <p className="text-gray-600">{test.patient_name} {test.patient_mrn ? `(MRN: ${test.patient_mrn})` : ''}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">📅 Requested: {new Date(test.requested_at).toLocaleString()}</span>
                        {test.requested_by_name && (
                          <span className="text-sm text-gray-500">👨‍⚕️ {test.requested_by_name}</span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getPriorityColor(test.urgency)}`}>
                          {String(test.urgency || '').toUpperCase()}
                        </span>
                        {test.status === 'in_progress' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border-2 border-green-300">
                            IN PROGRESS
                          </span>
                        )}
                      </div>
                      {test.notes && (
                        <p className="text-sm text-gray-500 mt-2">📝 {test.notes}</p>
                      )}
                    </div>
                  </div>
                  {/* No start action until backend supports it */}
                </div>
              </motion.div>
            ))}

            {filteredTests.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No pending tests found</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
