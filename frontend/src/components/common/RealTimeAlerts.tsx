'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEmergencyAlerts } from '@/hooks/useSSE'
import { toast } from 'react-hot-toast'

export function RealTimeAlerts() {
  const { emergencyAlerts, clearAlerts } = useEmergencyAlerts()

  useEffect(() => {
    // Show toast for new emergency alerts
    if (emergencyAlerts.length > 0) {
      const latestAlert = emergencyAlerts[emergencyAlerts.length - 1]

      toast.custom(
        (t) => (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-red-600 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 text-3xl">🚨</div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-white">EMERGENCY ALERT</p>
                  <p className="mt-1 text-sm text-red-100">
                    Patient: {latestAlert.patient_name}
                  </p>
                  <p className="mt-1 text-sm text-red-100">
                    {latestAlert.vital_type}: {latestAlert.vital_value}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-red-700">
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  clearAlerts()
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
              >
                Close
              </button>
            </div>
          </motion.div>
        ),
        {
          duration: 10000,
          position: 'top-right',
        }
      )

      // Play alert sound (optional)
      if (typeof window !== 'undefined' && window.Audio) {
        try {
          const audio = new Audio('/sounds/alert.mp3')
          audio.volume = 0.5
          audio.play().catch(() => {
            // Silent fail if audio can't play
          })
        } catch (e) {
          // Silent fail
        }
      }
    }
  }, [emergencyAlerts.length])

  return null // This component only shows toasts
}

/**
 * Lab Result Alert Toast
 */
export function LabResultAlert({ patientName, testType, onView }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5"
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-2xl">🧪</div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">Lab Results Ready</p>
            <p className="mt-1 text-sm text-gray-500">{patientName}</p>
            <p className="mt-1 text-xs text-gray-400">{testType}</p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
        <button
          onClick={onView}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
        >
          View
        </button>
      </div>
    </motion.div>
  )
}

/**
 * Connection Status Indicator
 */
export function SSEConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <AnimatePresence>
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Reconnecting to real-time alerts...</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
