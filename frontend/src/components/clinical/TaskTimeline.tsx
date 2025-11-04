'use client'

import { motion } from 'framer-motion'
import { Prescription, PatientWithVitals } from '@/lib/api'

interface Task {
  id: string
  type: 'medication' | 'vitals' | 'procedure'
  title: string
  patient: {
    id: string
    name: string
    mrn: string
  }
  time: Date
  status: 'pending' | 'due' | 'overdue' | 'completed'
  details?: string
  prescription?: Prescription
}

interface TaskTimelineProps {
  tasks: Task[]
  onTaskComplete?: (taskId: string) => void
}

export function TaskTimeline({ tasks, onTaskComplete }: TaskTimelineProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800 border-success-300'
      case 'overdue':
        return 'bg-error-100 text-error-800 border-error-300'
      case 'due':
        return 'bg-warning-100 text-warning-800 border-warning-300'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'medication':
        return '💊'
      case 'vitals':
        return '🩺'
      case 'procedure':
        return '⚕️'
      default:
        return '📋'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isOverdue = (date: Date) => {
    return date < new Date()
  }

  const isDue = (date: Date) => {
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    return diffMins <= 30 && diffMins >= 0
  }

  // Sort tasks by time
  const sortedTasks = [...tasks].sort((a, b) => a.time.getTime() - b.time.getTime())

  // Group tasks by time period
  const groupedTasks = sortedTasks.reduce((groups, task) => {
    const now = new Date()
    let period: string

    if (task.status === 'completed') {
      period = 'Completed'
    } else if (isOverdue(task.time)) {
      period = 'Overdue'
    } else if (isDue(task.time)) {
      period = 'Due Now'
    } else if (task.time.toDateString() === now.toDateString()) {
      period = 'Today'
    } else {
      period = 'Upcoming'
    }

    if (!groups[period]) {
      groups[period] = []
    }
    groups[period].push(task)
    return groups
  }, {} as Record<string, Task[]>)

  const periodOrder = ['Overdue', 'Due Now', 'Today', 'Upcoming', 'Completed']
  const orderedPeriods = periodOrder.filter((period) => groupedTasks[period]?.length > 0)

  if (sortedTasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Timeline</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No tasks scheduled</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Task Timeline</h3>
          <div className="text-sm text-gray-600">
            {sortedTasks.filter((t) => t.status !== 'completed').length} pending
          </div>
        </div>
      </div>

      <div className="overflow-y-auto p-6 max-h-[600px]">
        <div className="space-y-6">
          {orderedPeriods.map((period) => (
            <div key={period}>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{period}</h4>
              <div className="space-y-3">
                {groupedTasks[period].map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative pl-8 ${task.status !== 'completed' ? 'pb-4' : ''}`}
                  >
                    {/* Timeline line (only for non-last items in group) */}
                    {index !== groupedTasks[period].length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}

                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                          task.status === 'completed'
                            ? 'bg-success-500 border-2 border-success-600'
                            : task.status === 'overdue'
                            ? 'bg-error-500 border-2 border-error-600 animate-pulse'
                            : task.status === 'due'
                            ? 'bg-warning-500 border-2 border-warning-600 animate-pulse'
                            : 'bg-white border-2 border-gray-300'
                        }`}
                      >
                        {task.status === 'completed' && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {task.status !== 'completed' && (
                          <div
                            className={`w-2 h-2 rounded-full ${
                              task.status === 'overdue'
                                ? 'bg-white'
                                : task.status === 'due'
                                ? 'bg-white'
                                : 'bg-gray-300'
                            }`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Task card */}
                    <div
                      className={`border-2 rounded-lg p-4 transition-all ${
                        task.status === 'completed'
                          ? 'bg-gray-50 border-gray-200 opacity-75'
                          : 'bg-white border-gray-200 hover:shadow-md hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{getTaskIcon(task.type)}</span>
                            <h5 className="font-semibold text-gray-900">{task.title}</h5>
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Patient:</span>
                              <span className="font-medium text-gray-900">
                                {task.patient.name} ({task.patient.mrn})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Time:</span>
                              <span className="font-medium text-gray-900">{formatTime(task.time)}</span>
                            </div>
                            {task.details && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-xs text-blue-900">{task.details}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 flex flex-col items-end gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
                            {task.status.toUpperCase()}
                          </span>

                          {task.status !== 'completed' && onTaskComplete && (
                            <button
                              onClick={() => onTaskComplete(task.id)}
                              className="mt-2 px-3 py-1 bg-success-600 text-white text-xs font-medium rounded hover:bg-success-700 transition-colors"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Helper function to generate tasks from prescriptions (for use in nurse dashboard)
export function generateTasksFromPrescriptions(
  prescriptions: Prescription[],
  patients: PatientWithVitals[]
): Task[] {
  const tasks: Task[] = []
  const now = new Date()

  prescriptions.forEach((prescription) => {
    if (prescription.status !== 'dispensed' && prescription.status !== 'active') {
      return
    }

    const patient = patients.find((p) => p.id === prescription.patient_id)
    if (!patient) return

    // Parse frequency to determine task times (simplified)
    const frequencies: Record<string, number[]> = {
      'once daily': [9],
      'twice daily': [9, 21],
      'three times daily': [9, 14, 21],
      'four times daily': [6, 12, 18, 24],
      'every 4 hours': [0, 4, 8, 12, 16, 20],
      'every 6 hours': [0, 6, 12, 18],
      'every 8 hours': [0, 8, 16],
    }

    const hours = frequencies[prescription.frequency.toLowerCase()] || [9]

    hours.forEach((hour) => {
      const taskTime = new Date(now)
      taskTime.setHours(hour, 0, 0, 0)

      // Only show tasks for today
      if (taskTime.toDateString() === now.toDateString()) {
        let status: 'pending' | 'due' | 'overdue' | 'completed' = 'pending'

        if (taskTime < now) {
          status = prescription.administered_at && new Date(prescription.administered_at).getTime() > taskTime.getTime()
            ? 'completed'
            : 'overdue'
        } else if (taskTime.getTime() - now.getTime() <= 30 * 60000) {
          status = 'due'
        }

        tasks.push({
          id: `${prescription.id}-${hour}`,
          type: 'medication',
          title: `Administer ${prescription.medication_name}`,
          patient: {
            id: patient.id,
            name: `${patient.first_name} ${patient.last_name}`,
            mrn: patient.mrn,
          },
          time: taskTime,
          status,
          details: `${prescription.dosage} · ${prescription.route}`,
          prescription,
        })
      }
    })
  })

  return tasks
}
