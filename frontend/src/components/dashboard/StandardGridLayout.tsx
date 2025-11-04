'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '@/lib/themeUtils'

interface StandardGridLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  sidebarPosition?: 'left' | 'right'
  sidebarWidth?: 'small' | 'medium' | 'large'
  className?: string
}

export function StandardGridLayout({
  children,
  sidebar,
  sidebarPosition = 'left',
  sidebarWidth = 'medium',
  className = ''
}: StandardGridLayoutProps) {
  const { isDark } = useTheme()

  const sidebarSpanClass = sidebarWidth === 'small' ? 'lg:col-span-3' :
                         sidebarWidth === 'medium' ? 'lg:col-span-4' :
                         'lg:col-span-5'

  const mainSpanClass = sidebarWidth === 'small' ? 'lg:col-span-9' :
                        sidebarWidth === 'medium' ? 'lg:col-span-8' :
                        'lg:col-span-7'

  const hasSidebar = sidebar != null

  return (
    <div className={`grid grid-cols-12 gap-6 ${className}`}>
      {hasSidebar && sidebarPosition === 'left' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`col-span-12 ${sidebarSpanClass} space-y-4`}
        >
          {sidebar}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={hasSidebar ? `col-span-12 ${mainSpanClass}` : 'col-span-12'}
      >
        {children}
      </motion.div>

      {hasSidebar && sidebarPosition === 'right' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`col-span-12 ${sidebarSpanClass} space-y-4`}
        >
          {sidebar}
        </motion.div>
      )}
    </div>
  )
}

interface StandardCardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
  padding?: 'small' | 'medium' | 'large'
  hover?: boolean
}

export function StandardCard({
  children,
  title,
  subtitle,
  actions,
  className = '',
  padding = 'medium',
  hover = false
}: StandardCardProps) {
  const { isDark } = useTheme()

  const paddingClass = padding === 'small' ? 'p-4' :
                        padding === 'medium' ? 'p-6' :
                        'p-8'

  return (
    <div
      className={`glass backdrop-blur-xl rounded-2xl shadow-xl border ${paddingClass} ${
        isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'
      } ${hover ? 'hover:shadow-2xl hover:scale-[1.02] transition-all duration-200' : ''} ${className}`}
    >
      {(title || subtitle || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className={`text-lg font-semibold theme-text-primary ${subtitle ? 'mb-1' : ''}`}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="theme-text-secondary text-sm">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 ml-4">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}