'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { apiClient, type PatientWithVitals, type Prescription } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

type TaskStatus = 'pending' | 'in-progress' | 'completed'
type TaskPriority = 'high' | 'medium' | 'low'
interface DerivedTask {
  id: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  patientId: string
  patientName: string
  dueTime?: string
  createdAt: string
  source: 'medication' | 'vitals'
}

export default function NurseTasksPage() {
  const { token, user } = useAuth()
  const [nursePatients, setNursePatients] = useState<PatientWithVitals[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showAddTask, setShowAddTask] = useState(false)

  useEffect(() => {
    let isActive = true
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const [patients] = await Promise.all([
          apiClient.getNursePatients(token),
        ])
        if (!isActive) return
        setNursePatients(patients)
        // load dispensed prescriptions for this hospital and filter to our patients
        const params: { hospital_id?: string; limit?: number } = {}
        if (user?.hospital_id) params.hospital_id = user.hospital_id
        params.limit = 200
        const rx = await apiClient.listPrescriptions(token, params)
        if (!isActive) return
        setPrescriptions(rx)
      } catch (e: any) {
        if (!isActive) return
        setError(e?.message || 'Failed to load tasks')
      } finally {
        if (isActive) setLoading(false)
      }
    }
    load()
    return () => { isActive = false }
  }, [token, user?.hospital_id])

  const tasks: DerivedTask[] = useMemo(() => {
    const patientMap = new Map(nursePatients.map(p => [p.id, p]))
    const myPatientIds = new Set(nursePatients.map(p => p.id))
    const now = Date.now()
    const eightHoursMs = 8 * 60 * 60 * 1000

    const medTasks: DerivedTask[] = prescriptions
      .filter(p => myPatientIds.has(p.patient_id) && (p.status === 'dispensed'))
      .map(p => ({
        id: `med-${p.id}`,
        title: 'Administer Medication',
        description: `${p.medication_name} — ${p.dosage} ${p.frequency}`,
        priority: 'high' as TaskPriority,
        status: 'pending' as TaskStatus,
        patientId: p.patient_id,
        patientName: p.patient_name || 'Patient',
        createdAt: p.created_at,
        source: 'medication' as const,
      }))

    const vitalsTasks: DerivedTask[] = nursePatients
      .filter(p => p.has_abnormal_vitals || !p.vitals_updated_at || (now - new Date(p.vitals_updated_at).getTime()) > eightHoursMs)
      .map(p => ({
        id: `vitals-${p.id}`,
        title: 'Record Vitals',
        description: 'Check and record BP, HR, Temperature, and SpO2',
        priority: p.has_abnormal_vitals ? 'high' as TaskPriority : 'medium' as TaskPriority,
        status: 'pending' as TaskStatus,
        patientId: p.id,
        patientName: `${p.first_name} ${p.last_name}`,
        createdAt: new Date().toISOString(),
        source: 'vitals' as const,
      }))

    return [...medTasks, ...vitalsTasks]
  }, [nursePatients, prescriptions])

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesStatus && matchesPriority
  })

  const handleStatusChange = (_taskId: string, _newStatus: TaskStatus) => {
    // No-op: task state derives from live data; use the source pages to complete actions
  }

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    highPriority: tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length
  }

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-orange-100 text-orange-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <EnterpriseDashboardLayout role="nurse">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallbackUrl="/dashboard/nurse" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
              <p className="text-gray-600 mt-1">Manage your daily tasks and assignments</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddTask(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
          >
            ➕ Add Task
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Pending', value: stats.pending, color: 'from-orange-500 to-red-500', icon: '⏳' },
            { label: 'In Progress', value: stats.inProgress, color: 'from-blue-500 to-indigo-500', icon: '🔄' },
            { label: 'Completed', value: stats.completed, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'High Priority', value: stats.highPriority, color: 'from-red-500 to-rose-500', icon: '🔥' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">{stat.label}</p>
                  <p className="text-4xl font-bold">{stat.value}</p>
                </div>
                <span className="text-5xl opacity-20">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Filter by Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <p className="text-gray-500">Loading tasks…</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <span className="text-6xl mb-4 block">📋</span>
              <p className="text-gray-500">No tasks found</p>
            </div>
          ) : (
            filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{task.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'high' ? '🔥' : task.priority === 'medium' ? '⚠️' : '📌'} {task.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{task.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">👤</span>
                        <span className="text-gray-700 font-medium">{task.patientName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">🕐</span>
                        <span className="text-gray-700 font-medium">{task.dueTime ? `Due: ${task.dueTime}` : 'Due: —'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">�</span>
                        <span className="text-gray-700 font-medium">Source: {task.source === 'medication' ? 'Medication' : 'Vitals'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">📅</span>
                        <span className="text-gray-700 font-medium">{new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <span className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${getStatusColor(task.status)}`}>
                      {task.status === 'pending' && '⏳'}
                      {task.status === 'in-progress' && '🔄'}
                      {task.status === 'completed' && '✅'}
                      {' '}{task.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  {task.source === 'medication' ? (
                    <a href="/dashboard/nurse/medications" className="flex-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                      >
                        💊 Go to Medications
                      </motion.button>
                    </a>
                  ) : (
                    <a href="/dashboard/nurse/vitals" className="flex-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                      >
                        ❤️ Record Vitals
                      </motion.button>
                    </a>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold">Add New Task</h2>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-4">Direct task creation isn't available yet. Use Medications or Vitals pages to perform actions.</p>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
