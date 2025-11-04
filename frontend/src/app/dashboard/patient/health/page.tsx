'use client'

import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { HealthMetricsDashboard } from '@/components/patient/HealthMetricsDashboard'
import { motion } from 'framer-motion'

export default function PatientHealth() {
  return (
    <EnterpriseDashboardLayout role="patient">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/patient" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Health Overview</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track your health metrics and wellness</p>
          </div>
        </div>

        <HealthMetricsDashboard />

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              🏃 Activity Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Steps Today</span>
                <span className="font-semibold text-gray-900 dark:text-white">8,542 / 10,000</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-teal-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-600 dark:text-gray-400">Calories Burned</span>
                <span className="font-semibold text-gray-900 dark:text-white">342 kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Active Minutes</span>
                <span className="font-semibold text-gray-900 dark:text-white">45 min</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              💊 Medication Reminders
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Aspirin</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">100mg - Morning</p>
                </div>
                <button className="px-3 py-1 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700">
                  Taken
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Vitamin D</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">1000 IU - Evening</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">In 6 hours</span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📊 Health Trends (Last 30 Days)
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Blood Pressure</p>
                <p className="text-2xl font-bold text-blue-600">120/80</p>
              </div>
              <div className="text-green-600 flex items-center gap-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Normal</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Heart Rate</p>
                <p className="text-2xl font-bold text-green-600">72 bpm</p>
              </div>
              <div className="text-green-600 flex items-center gap-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Healthy</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Temperature</p>
                <p className="text-2xl font-bold text-purple-600">37.0°C</p>
              </div>
              <div className="text-green-600 flex items-center gap-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Normal</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
