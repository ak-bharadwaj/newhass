'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '@/lib/themeUtils'

interface StandardDashboardLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  chips?: Array<{ label: string; color?: string }>
  actions?: React.ReactNode
  showStats?: boolean
  stats?: React.ReactNode
}

export function StandardDashboardLayout({
  children,
  title,
  subtitle,
  chips,
  actions,
  showStats = false,
  stats
}: StandardDashboardLayoutProps) {
  const { isDark } = useTheme()

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent mb-1 theme-gradient-primary">
              {title}
            </h1>
            {subtitle && (
              <p className="theme-text-secondary mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Status Chips */}
          {(chips && chips.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {chips.map((chip, index) => (
                <span
                  key={index}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    chip.color === 'blue' ? 'theme-btn-primary theme-border' :
                    chip.color === 'green' ? 'theme-btn-success theme-border' :
                    chip.color === 'orange' ? 'theme-btn-warning theme-border' :
                    chip.color === 'red' ? 'theme-btn-error theme-border' :
                    'theme-card theme-text-secondary theme-border'
                  }`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      {actions && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden md:block sticky top-2 z-20"
        >
          <div className="flex flex-wrap gap-3 p-4 rounded-xl border shadow-sm theme-glass">
            {actions}
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      {showStats && stats && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {stats}
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  )
}