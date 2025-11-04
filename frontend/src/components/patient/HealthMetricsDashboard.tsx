'use client'

import { motion } from 'framer-motion'

interface HealthMetric {
  label: string
  value: string
  unit: string
  status: 'normal' | 'warning' | 'critical'
  icon: string
  trend?: 'up' | 'down' | 'stable'
}

interface HealthMetricsDashboardProps {
  metrics?: HealthMetric[]
}

const defaultMetrics: HealthMetric[] = [
  {
    label: 'Blood Pressure',
    value: '120/80',
    unit: 'mmHg',
    status: 'normal',
    icon: '💗',
    trend: 'stable',
  },
  {
    label: 'Heart Rate',
    value: '72',
    unit: 'bpm',
    status: 'normal',
    icon: '❤️',
    trend: 'stable',
  },
  {
    label: 'Temperature',
    value: '98.6',
    unit: '°F',
    status: 'normal',
    icon: '🌡️',
    trend: 'stable',
  },
  {
    label: 'Oxygen Level',
    value: '98',
    unit: '%',
    status: 'normal',
    icon: '🫁',
    trend: 'stable',
  },
]

export function HealthMetricsDashboard({ metrics = defaultMetrics }: HealthMetricsDashboardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'from-green-500 to-green-600'
      case 'warning':
        return 'from-yellow-500 to-yellow-600'
      case 'critical':
        return 'from-red-500 to-red-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
      case 'critical':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    }
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return '↗️'
      case 'down':
        return '↘️'
      case 'stable':
        return '→'
      default:
        return null
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft-xl border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Health Vitals</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`p-5 rounded-2xl border-2 ${getStatusBg(metric.status)} transition-all hover:scale-105 hover:shadow-lg`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{metric.icon}</span>
              {metric.trend && (
                <span className="text-xl">{getTrendIcon(metric.trend)}</span>
              )}
            </div>
            
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
              {metric.label}
            </p>
            
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.unit}</p>
            </div>
            
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                metric.status === 'normal' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                metric.status === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
                'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
              }`}>
                {metric.status === 'normal' && '✓'}
                {metric.status === 'warning' && '⚠'}
                {metric.status === 'critical' && '⚠'}
                <span className="uppercase">{metric.status}</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Last updated: {new Date().toLocaleString()}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Measurements are recorded automatically during check-ups
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
