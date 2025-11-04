'use client'

import { motion } from 'framer-motion'
import { NurseLog } from '@/lib/api'

interface NurseLogFeedProps {
  logs: NurseLog[]
  maxHeight?: string
}

export function NurseLogFeed({ logs, maxHeight = '600px' }: NurseLogFeedProps) {
  const getLogTypeIcon = (logType: string) => {
    switch (logType) {
      case 'observation':
        return '👁️'
      case 'care_activity':
        return '🩺'
      case 'incident':
        return '⚠️'
      case 'note':
        return '📝'
      case 'handoff':
        return '👥'
      default:
        return '📋'
    }
  }

  const getLogTypeColor = (logType: string) => {
    switch (logType) {
      case 'observation':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'care_activity':
        return 'bg-success-100 text-success-800 border-success-200'
      case 'incident':
        return 'bg-error-100 text-error-800 border-error-200'
      case 'note':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'handoff':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatLogType = (logType: string) => {
    return logType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  if (logs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Nurse Logs</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No nurse logs found</p>
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
          <h3 className="text-lg font-semibold text-gray-900">Nurse Logs</h3>
          <div className="text-sm text-gray-600">
            {logs.length} log{logs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto p-6" style={{ maxHeight }}>
        <div className="space-y-4">
          {logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-8 pb-4"
            >
              {/* Timeline line */}
              {index !== logs.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-gray-200" />
              )}

              {/* Timeline dot */}
              <div className="absolute left-0 top-1">
                <div className="w-6 h-6 rounded-full bg-white border-2 border-primary-500 flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                </div>
              </div>

              {/* Log content */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getLogTypeIcon(log.log_type)}</span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full border ${getLogTypeColor(
                        log.log_type
                      )}`}
                    >
                      {formatLogType(log.log_type)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{formatTimestamp(log.logged_at)}</span>
                </div>

                <p className="text-sm text-gray-900 mb-3 whitespace-pre-wrap">{log.content}</p>

                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="font-medium">{log.nurse_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{new Date(log.logged_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
