'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  trend?: {
    value: number
    isPositive: boolean
  }
}

const colorClasses = {
  primary: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    ring: 'ring-blue-100',
  },
  secondary: {
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    ring: 'ring-gray-100',
  },
  success: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50',
    text: 'text-green-600',
    ring: 'ring-green-100',
  },
  warning: {
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    ring: 'ring-amber-100',
  },
  error: {
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-50',
    text: 'text-red-600',
    ring: 'ring-red-100',
  },
}

export function KPICard({ title, value, subtitle, icon, color = 'primary', trend }: KPICardProps) {
  const colors = colorClasses[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative bg-white rounded-2xl shadow-soft-lg hover:shadow-soft-xl border border-gray-100 p-6 overflow-hidden transition-all duration-300"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
          <p className="text-4xl font-bold text-gray-900 mb-1 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-600 font-medium">{subtitle}</p>
          )}
          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mt-3"
            >
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-sm ${
                  trend.isPositive 
                    ? 'bg-green-50 text-green-700 ring-1 ring-green-100' 
                    : 'bg-red-50 text-red-700 ring-1 ring-red-100'
                }`}
              >
                {trend.isPositive ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500 font-medium">vs last period</span>
            </motion.div>
          )}
        </div>
        
        {icon && (
          <motion.div
            whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className={`flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br ${colors.gradient} shadow-lg ring-4 ${colors.ring}`}
          >
            <div className="text-white w-7 h-7">{icon}</div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
