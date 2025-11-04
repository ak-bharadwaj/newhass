'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  color: string
  href?: string
  action?: () => void
}

interface QuickActionsProps {
  onBookAppointment?: () => void
  onRequestPrescription?: () => void
  onViewRecords?: () => void
  onContactDoctor?: () => void
}

export function QuickActionsPanel({ 
  onBookAppointment, 
  onRequestPrescription, 
  onViewRecords,
  onContactDoctor,
  compact = false,
}: QuickActionsProps & { compact?: boolean }) {
  const quickActions: QuickAction[] = [
    {
      id: 'book-appointment',
      title: 'Book Appointment',
      description: 'Schedule a visit with your doctor',
      icon: '📅',
      color: 'from-blue-500 to-blue-600',
      action: onBookAppointment,
    },
    {
      id: 'prescriptions',
      title: 'View Prescriptions',
      description: 'Access your medication history',
      icon: '💊',
      color: 'from-purple-500 to-purple-600',
      action: onRequestPrescription,
    },
    {
      id: 'medical-records',
      title: 'Medical Records',
      description: 'View your complete health history',
      icon: '📋',
      color: 'from-green-500 to-green-600',
      action: onViewRecords,
    },
    {
      id: 'contact-doctor',
      title: 'Contact Doctor',
      description: 'Send a message to your healthcare provider',
      icon: '💬',
      color: 'from-pink-500 to-pink-600',
      action: onContactDoctor,
    },
  ]

  // Compact toolbar: small circular icon buttons in a row
  if (compact) {
    return (
      <div className="bg-white/70 dark:bg-gray-900/60 backdrop-blur rounded-2xl border border-gray-100 dark:border-gray-700 p-2 shadow-sm">
        <div className="flex items-center gap-2">
          {quickActions.map((action, idx) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ scale: 1.08 }}
              onClick={action.action}
              title={action.title}
              className="flex items-center gap-2 p-2 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl bg-gradient-to-br ${action.color} text-white shadow`}>{action.icon}</div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-sm font-semibold">{action.title}</span>
                <span className="text-xs text-gray-500 hidden md:block">{action.description}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft-xl border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.action}
            className={`p-5 bg-gradient-to-br ${action.color} rounded-2xl text-white text-left shadow-lg hover:shadow-xl transition-all duration-300 group`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-4xl group-hover:scale-110 transition-transform">{action.icon}</span>
              <svg 
                className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h4 className="text-lg font-bold mb-1">{action.title}</h4>
            <p className="text-sm opacity-90">{action.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
