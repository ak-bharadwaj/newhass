'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import SectionHeader from '@/components/common/SectionHeader'

const operationsTiles = [
  {
    title: 'Resource Allocation',
    href: '/dashboard/manager/operations/resources',
    description: 'Bed, staff, and equipment availability at a glance.',
    icon: '📦',
    accent: 'from-blue-500 to-indigo-500',
  },
  {
    title: 'Queue Management',
    href: '/dashboard/manager/operations/queues',
    description: 'Triage, outpatient, and surgical queue pressure levels.',
    icon: '⏳',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Capacity Planning',
    href: '/dashboard/manager/operations/capacity',
    description: 'Forward-looking bed demand and staffing projections.',
    icon: '📊',
    accent: 'from-amber-500 to-orange-500',
  },
]

const playbookLinks = [
  { label: 'Escalation Playbook', href: '/docs/OPERATIONS.md' },
  { label: 'Staffing Requests', href: '/dashboard/manager/staff' },
  { label: 'Case Sheet Trends', href: '/dashboard/manager/analytics/operations' },
]

export default function ManagerOperationsOverviewPage() {
  return (
    <EnterpriseDashboardLayout role="manager">
      <div className="space-y-8 px-2">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/manager" />
          <SectionHeader
            title="Operations Command"
            subtitle="Coordinate throughput, capacity, and daily execution"
            chips={[{ label: 'Live', color: 'blue' }, { label: 'Operations', color: 'gray' }]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {operationsTiles.map((tile, index) => (
            <motion.div
              key={tile.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tile.accent} p-6 text-white shadow-lg`}
            >
              <div className="absolute right-4 top-4 text-4xl opacity-30" aria-hidden>
                {tile.icon}
              </div>
              <h2 className="text-xl font-semibold mb-2 pr-8">{tile.title}</h2>
              <p className="text-sm text-white/80 leading-relaxed mb-6">{tile.description}</p>
              <Link
                href={tile.href}
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/30"
              >
                Open workspace
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Operational Playbooks</h3>
          <p className="text-sm text-gray-600 mb-4">
            Shortcut into the most requested coordination flows. Use them to broadcast updates to charge nurses and
            service lines.
          </p>
          <div className="flex flex-wrap gap-3">
            {playbookLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:text-indigo-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
