/**
 * Operational Intelligence Dashboard Component
 *
 * Displays AI-powered insights for hospital operations:
 * - Bed occupancy predictions (7-day forecast)
 * - High-risk patients (Early Warning System)
 * - Patient queue optimization
 * - Staffing recommendations
 * - Resource bottlenecks
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

interface BedPrediction {
  date: string
  day_of_week: string
  predicted_occupancy: number
  utilization_percent: number
  available_beds: number
  status: 'normal' | 'high' | 'critical'
}

interface HighRiskPatient {
  patient: string
  patient_id: string
  risk_score: number
  primary_concerns: string[]
  bed: string
  priority: 'critical' | 'high'
}

interface IntelligenceSummary {
  hospital_id: string
  bed_forecast: {
    current_utilization: number
    peak_predicted_day: BedPrediction
    alerts_count: number
  }
  icu_forecast: {
    current_utilization: number
    peak_predicted_day: BedPrediction
    alerts_count: number
  }
  high_risk_patients: {
    critical_count: number
    high_risk_count: number
    patients: HighRiskPatient[]
  }
  queue_status: {
    total_waiting: number
    critical_in_queue: number
    average_wait_minutes: number
  }
  bottlenecks: Array<{
    type: string
    date: string
    severity: string
    details: string
    recommendation: string
  }>
  action_items: Array<{
    priority: 'critical' | 'high' | 'medium'
    category: string
    message: string
    action: string
  }>
}

export function OperationalIntelligence({ hospitalId }: { hospitalId: string }) {
  const { token } = useAuth()
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadIntelligenceSummary()
    // Refresh every 5 minutes
    const interval = setInterval(loadIntelligenceSummary, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [hospitalId])

  const loadIntelligenceSummary = async () => {
    if (!token) return

    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/ai-intelligence/intelligence-summary?hospital_id=${hospitalId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load intelligence summary')
      }

      const data = await response.json()
      setSummary(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load intelligence data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading operational intelligence...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-error-50 border border-error-200 rounded-lg">
        <p className="text-error-700">{error}</p>
        <button
          onClick={loadIntelligenceSummary}
          className="mt-4 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!summary) {
    return <div className="p-6 text-gray-600">No intelligence data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Action Items - Priority Alerts */}
      {summary.action_items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass bg-gradient-to-r from-error-50 to-warning-50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-error-200"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            🚨 Priority Action Items
            <span className="px-2 py-1 bg-error-600 text-white text-xs rounded-full">
              {summary.action_items.length}
            </span>
          </h3>
          <div className="space-y-3">
            {summary.action_items.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  item.priority === 'critical'
                    ? 'bg-error-50 border-error-600'
                    : item.priority === 'high'
                    ? 'bg-warning-50 border-warning-600'
                    : 'bg-blue-50 border-blue-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.message}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Action:</strong> {item.action}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      item.priority === 'critical'
                        ? 'bg-error-600 text-white'
                        : item.priority === 'high'
                        ? 'bg-warning-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {item.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* High-Risk Patients */}
      {summary.high_risk_patients.critical_count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            ⚠️ High-Risk Patients (Early Warning System)
            <span className="px-2 py-1 bg-error-600 text-white text-xs rounded-full">
              {summary.high_risk_patients.critical_count} Critical
            </span>
          </h3>
          <div className="space-y-3">
            {summary.high_risk_patients.patients.map((patient, idx) => (
              <div
                key={idx}
                className="p-4 bg-error-50 border border-error-200 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{patient.patient}</p>
                    <p className="text-sm text-gray-600">Bed: {patient.bed}</p>
                    <div className="mt-2 space-y-1">
                      {patient.primary_concerns.map((concern, cidx) => (
                        <p key={cidx} className="text-sm text-error-700">
                          • {concern}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-error-600">
                      {patient.risk_score}
                    </div>
                    <div className="text-xs text-gray-600">Risk Score</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Bed Capacity Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">🛏️ Bed Capacity Forecast</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Utilization:</span>
              <span className="text-2xl font-bold text-primary-600">
                {summary.bed_forecast.current_utilization.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  summary.bed_forecast.current_utilization > 90
                    ? 'bg-error-600'
                    : summary.bed_forecast.current_utilization > 75
                    ? 'bg-warning-600'
                    : 'bg-success-600'
                }`}
                style={{ width: `${Math.min(summary.bed_forecast.current_utilization, 100)}%` }}
              ></div>
            </div>
            {summary.bed_forecast.peak_predicted_day && (
              <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-900">
                  Peak Predicted: {summary.bed_forecast.peak_predicted_day.day_of_week}
                </p>
                <p className="text-sm text-gray-600">
                  {summary.bed_forecast.peak_predicted_day.utilization_percent.toFixed(1)}% occupancy expected
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ICU Capacity Forecast */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">🏥 ICU Capacity Forecast</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Utilization:</span>
              <span className="text-2xl font-bold text-primary-600">
                {summary.icu_forecast.current_utilization.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  summary.icu_forecast.current_utilization > 85
                    ? 'bg-error-600'
                    : summary.icu_forecast.current_utilization > 70
                    ? 'bg-warning-600'
                    : 'bg-success-600'
                }`}
                style={{ width: `${Math.min(summary.icu_forecast.current_utilization, 100)}%` }}
              ></div>
            </div>
            {summary.icu_forecast.peak_predicted_day && (
              <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-900">
                  Peak Predicted: {summary.icu_forecast.peak_predicted_day.day_of_week}
                </p>
                <p className="text-sm text-gray-600">
                  {summary.icu_forecast.peak_predicted_day.utilization_percent?.toFixed(1)}% occupancy expected
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Queue Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">👥 Patient Queue Intelligence</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {summary.queue_status.total_waiting}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Waiting</div>
          </div>
          <div className="text-center p-4 bg-error-50 rounded-lg">
            <div className="text-3xl font-bold text-error-600">
              {summary.queue_status.critical_in_queue}
            </div>
            <div className="text-sm text-gray-600 mt-1">Critical Priority</div>
          </div>
          <div className="text-center p-4 bg-warning-50 rounded-lg">
            <div className="text-3xl font-bold text-warning-600">
              {summary.queue_status.average_wait_minutes.toFixed(0)}m
            </div>
            <div className="text-sm text-gray-600 mt-1">Avg Wait Time</div>
          </div>
        </div>
      </motion.div>

      {/* Resource Bottlenecks */}
      {summary.bottlenecks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">🔍 Resource Bottlenecks</h3>
          <div className="space-y-3">
            {summary.bottlenecks.map((bottleneck, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  bottleneck.severity === 'critical'
                    ? 'bg-error-50 border-error-600'
                    : 'bg-warning-50 border-warning-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 capitalize">
                      {bottleneck.type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{bottleneck.details}</p>
                    <p className="text-sm text-primary-600 mt-2">
                      <strong>Recommendation:</strong> {bottleneck.recommendation}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">{bottleneck.date}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleTimeString()} • Auto-refresh: 5 minutes
      </div>
    </div>
  )
}
