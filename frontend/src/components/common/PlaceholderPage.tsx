'use client'

import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'

interface PlaceholderPageProps {
  role: string
  title: string
  description: string
  icon?: React.ReactNode
}

export function PlaceholderPage({ role, title, description, icon }: PlaceholderPageProps) {
  const defaultIcon = (
    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  )

  return (
    <EnterpriseDashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl={`/dashboard/${role}`} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          {icon || defaultIcon}
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">Coming Soon</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            This feature is under development
          </p>
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
