'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import SectionHeader from '@/components/common/SectionHeader'

const analyticsTiles = [
  {
    title: 'Dispensing Metrics',
    href: '/dashboard/pharmacist/analytics/dispensing',
    description: 'Volume, turnaround time, and critical therapies.',
    accent: 'from-rose-500 to-pink-500',
    icon: '💊',
  },
  {
    title: 'Inventory Trends',
    href: '/dashboard/pharmacist/analytics/inventory',
    description: 'Stock longevity, reorder risk, and wastage alerts.',
    accent: 'from-blue-500 to-indigo-500',
    icon: '📦',
  },
  {
    title: 'Cost Analysis',
    href: '/dashboard/pharmacist/analytics/costs',
    description: 'Acquisition vs. reimbursement and patient assistance.',
    accent: 'from-emerald-500 to-teal-500',
    icon: '💰',
  },
]

const summaryStats = [
  { label: 'Orders Processed (24h)', value: '284', trend: '+12%', accent: 'bg-rose-100 text-rose-700' },
  { label: 'Critical Stock Alerts', value: '5', trend: 'Resolved', accent: 'bg-amber-100 text-amber-700' },
  { label: 'Avg. Dispense Time', value: '12m', trend: '-2m vs last week', accent: 'bg-emerald-100 text-emerald-700' },
]

export default function PharmacistAnalyticsOverviewPage() {
  return (
    <EnterpriseDashboardLayout role="pharmacist">
      <div className="space-y-8 px-2">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/pharmacist" />
          <SectionHeader
            title="Pharmacy Analytics"
            subtitle="Track throughput, stock health, and financial performance"
            chips={[{ label: 'Analytics', color: 'purple' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
            >
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
              <span className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${stat.accent}`}>
                {stat.trend}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {analyticsTiles.map((tile, index) => (
            <motion.div
              key={tile.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.08 }}
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
                Explore details
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
