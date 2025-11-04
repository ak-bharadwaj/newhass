'use client'

import { motion } from 'framer-motion'

interface HealthSummary {
  overall_status: string
  latest_vitals?: {
    temperature?: number
    heart_rate?: number
    blood_pressure?: string
    spo2?: number
    recorded_at: string
  }
  active_conditions?: string[]
  allergies?: string
  risk_score?: number
  ai_summary?: string
  ai_approved: boolean
}

interface HealthSummaryCardProps {
  summary: HealthSummary
}

export function HealthSummaryCard({ summary }: HealthSummaryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'good':
      case 'stable':
        return 'from-success-500 to-success-600'
      case 'fair':
      case 'monitoring':
        return 'from-warning-500 to-warning-600'
      case 'poor':
      case 'critical':
        return 'from-error-500 to-error-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-success-700 bg-success-100'
    if (score < 70) return 'text-warning-700 bg-warning-100'
    return 'text-error-700 bg-error-100'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 overflow-hidden"
    >
      <div className={`px-6 py-4 bg-gradient-to-r ${getStatusColor(summary.overall_status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Health Summary</h3>
            <p className="text-white/90 text-sm mt-1">Overall Status: {summary.overall_status}</p>
          </div>
          {summary.risk_score !== undefined && (
            <div className="text-right">
              <p className="text-white/90 text-sm">Risk Score</p>
              <p className="text-3xl font-bold text-white">{summary.risk_score}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Latest Vitals */}
        {summary.latest_vitals && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">Latest Vitals</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {summary.latest_vitals.temperature && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 mb-1">Temperature</p>
                  <p className="text-2xl font-bold text-blue-900">{summary.latest_vitals.temperature}°C</p>
                </div>
              )}
              {summary.latest_vitals.heart_rate && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 mb-1">Heart Rate</p>
                  <p className="text-2xl font-bold text-red-900">{summary.latest_vitals.heart_rate} bpm</p>
                </div>
              )}
              {summary.latest_vitals.blood_pressure && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs text-purple-700 mb-1">Blood Pressure</p>
                  <p className="text-2xl font-bold text-purple-900">{summary.latest_vitals.blood_pressure}</p>
                </div>
              )}
              {summary.latest_vitals.spo2 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700 mb-1">SpO₂</p>
                  <p className="text-2xl font-bold text-green-900">{summary.latest_vitals.spo2}%</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Recorded: {new Date(summary.latest_vitals.recorded_at).toLocaleString()}
            </p>
          </div>
        )}

        {/* Active Conditions */}
        {summary.active_conditions && summary.active_conditions.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">Active Conditions</h4>
            <div className="flex flex-wrap gap-2">
              {summary.active_conditions.map((condition, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full border border-blue-300"
                >
                  {condition}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Allergies */}
        {summary.allergies && (
          <div className="p-4 bg-error-50 border-2 border-error-300 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-error-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h4 className="text-md font-semibold text-error-900">Allergies</h4>
            </div>
            <p className="text-error-800 font-medium">{summary.allergies}</p>
          </div>
        )}

        {/* AI Summary */}
        {summary.ai_summary && summary.ai_approved && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>AI Health Insights</span>
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                Doctor Approved
              </span>
            </h4>
            <div className="p-4 bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200 rounded-lg">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{summary.ai_summary}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
