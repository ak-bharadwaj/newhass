'use client'

import { motion } from 'framer-motion'
import { PatientWithVitals } from '@/lib/api'
import { useTheme } from '@/lib/themeUtils'

interface PatientCardProps {
  patient: PatientWithVitals
  onClick?: () => void
  isSelected?: boolean
}

export function PatientCard({ patient, onClick, isSelected = false }: PatientCardProps) {
  const { isDark } = useTheme()
  
  const getVitalStatusColor = () => {
    if (patient.has_abnormal_vitals) return 'error'
    if (patient.latest_temperature || patient.latest_heart_rate) return 'success'
    return 'warning'
  }

  const statusColor = getVitalStatusColor()
  const statusClasses = {
    success: isDark ? 'border-success-500 bg-success-900/30' : 'border-success-500 bg-success-50',
    warning: isDark ? 'border-warning-500 bg-warning-900/30' : 'border-warning-500 bg-warning-50',
    error: isDark ? 'border-error-500 bg-error-900/30' : 'border-error-500 bg-error-50',
  }

  const statusDotClasses = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-xl shadow-md p-5 border-2
        transition-all duration-200
        ${isSelected
          ? isDark ? 'border-primary-400 bg-primary-900/30' : 'border-primary-500 bg-primary-50'
          : `${statusClasses[statusColor]} hover:shadow-lg`
        }
      `}
    >
      {/* Status indicator dot */}
      <div className="absolute top-3 right-3">
        <div className={`w-3 h-3 rounded-full ${statusDotClasses[statusColor]} animate-pulse`} />
      </div>

      {/* Patient info */}
      <div className="space-y-3">
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {patient.first_name} {patient.last_name}
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>MRN: {patient.mrn}</p>
        </div>

        {/* Demographics */}
        <div className={`flex gap-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <div>
            <span className="font-medium">Age:</span> {calculateAge(patient.date_of_birth)}
          </div>
          <div>
            <span className="font-medium">Gender:</span> {patient.gender}
          </div>
          {patient.blood_group && (
            <div>
              <span className="font-medium">Blood:</span> {patient.blood_group}
            </div>
          )}
        </div>

        {/* Latest vitals */}
        {(patient.latest_temperature || patient.latest_heart_rate || patient.latest_blood_pressure || patient.latest_spo2) && (
          <div className={`pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Latest Vitals</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {patient.latest_temperature && (
                <div className="flex items-center gap-1">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Temp:</span>
                  <span className={`font-medium ${patient.has_abnormal_vitals ? (isDark ? 'text-error-400' : 'text-error-600') : (isDark ? 'text-white' : 'text-gray-900')}`}>
                    {patient.latest_temperature}°C
                  </span>
                </div>
              )}
              {patient.latest_heart_rate && (
                <div className="flex items-center gap-1">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>HR:</span>
                  <span className={`font-medium ${patient.has_abnormal_vitals ? (isDark ? 'text-error-400' : 'text-error-600') : (isDark ? 'text-white' : 'text-gray-900')}`}>
                    {patient.latest_heart_rate} bpm
                  </span>
                </div>
              )}
              {patient.latest_blood_pressure && (
                <div className="flex items-center gap-1">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>BP:</span>
                  <span className={`font-medium ${patient.has_abnormal_vitals ? (isDark ? 'text-error-400' : 'text-error-600') : (isDark ? 'text-white' : 'text-gray-900')}`}>
                    {patient.latest_blood_pressure}
                  </span>
                </div>
              )}
              {patient.latest_spo2 && (
                <div className="flex items-center gap-1">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>SpO₂:</span>
                  <span className={`font-medium ${patient.has_abnormal_vitals ? (isDark ? 'text-error-400' : 'text-error-600') : (isDark ? 'text-white' : 'text-gray-900')}`}>
                    {patient.latest_spo2}%
                  </span>
                </div>
              )}
            </div>
            {patient.vitals_updated_at && (
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Updated: {formatRelativeTime(patient.vitals_updated_at)}
              </p>
            )}
          </div>
        )}

        {/* Allergies warning */}
        {patient.allergies && (
          <div className={`pt-2 border-t -mx-5 -mb-5 px-5 py-3 rounded-b-xl ${isDark ? 'border-error-700 bg-error-900/30' : 'border-error-200 bg-error-50'}`}>
            <p className={`text-xs font-medium ${isDark ? 'text-error-300' : 'text-error-700'}`}>
              ⚠️ Allergies: {patient.allergies}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return then.toLocaleDateString()
}
