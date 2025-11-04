'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import SectionHeader from '@/components/common/SectionHeader'

const reportCards = [
  {
    title: 'Test Statistics',
    href: '/dashboard/lab_tech/reports/statistics',
    summary: 'Volume trends, abnormal ratios, and departmental mix.',
    accent: 'from-indigo-500 to-sky-500',
    icon: '📈',
  },
  {
    title: 'Turnaround Time',
    href: '/dashboard/lab_tech/reports/turnaround',
    summary: 'Median completion time and SLA adherence by modality.',
    accent: 'from-purple-500 to-pink-500',
    icon: '⏱️',
  },
  {
    title: 'Equipment Status',
    href: '/dashboard/lab_tech/reports/equipment',
    summary: 'Downtime, maintenance windows, and calibration alerts.',
    accent: 'from-amber-500 to-orange-500',
    icon: '🔧',
  },
]

export default function LabTechReportsOverviewPage() {
  return (
    <EnterpriseDashboardLayout role="lab_tech">
      <div className="space-y-8 px-2">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/lab_tech" />
          <SectionHeader
            title="Laboratory Reports Hub"
            subtitle="Monitor test throughput, SLAs, and asset readiness"
            chips={[{ label: 'Reports', color: 'blue' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.accent} p-6 text-white shadow-lg`}
            >
              <div className="absolute right-4 top-4 text-4xl opacity-30" aria-hidden>
                {card.icon}
              </div>
              <h2 className="text-xl font-semibold mb-2 pr-10">{card.title}</h2>
              <p className="text-sm text-white/80 leading-relaxed mb-6">{card.summary}</p>
              <Link
                href={card.href}
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/30"
              >
                View details
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
