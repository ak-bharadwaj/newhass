'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import SectionHeader from '@/components/common/SectionHeader'

const reportSections = [
  {
    title: 'Shift Reports',
    description: 'Daily shift handover summaries with patient loads and key events.',
    href: '/dashboard/nurse/reports/shifts',
    accent: 'from-blue-500 to-indigo-500',
    icon: '🕐',
  },
  {
    title: 'Patient Care Log',
    description: 'Narrative nurse notes, escalation history, and interventions.',
    href: '/dashboard/nurse/reports/care-log',
    accent: 'from-emerald-500 to-teal-500',
    icon: '🩺',
  },
  {
    title: 'Incident Reports',
    description: 'Recorded safety events with resolution tracking and follow-ups.',
    href: '/dashboard/nurse/reports/incidents',
    accent: 'from-rose-500 to-red-500',
    icon: '⚠️',
  },
]

export default function NurseReportsOverviewPage() {
  return (
    <EnterpriseDashboardLayout role="nurse">
      <div className="space-y-8 px-2">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/nurse" />
          <SectionHeader
            title="Nursing Reports Hub"
            subtitle="Review shift output, bedside documentation, and safety signals"
            chips={[{ label: 'Reports', color: 'purple' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${section.accent} p-6 shadow-lg text-white`}
            >
              <div className="absolute right-4 top-4 text-4xl opacity-40" aria-hidden>
                {section.icon}
              </div>
              <h2 className="text-xl font-semibold mb-2 pr-10">{section.title}</h2>
              <p className="text-sm text-white/80 mb-6 leading-relaxed">{section.description}</p>
              <Link
                href={section.href}
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/30"
              >
                Open Report
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
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Need to add a quick log?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Use the <strong>Clinical Notes</strong> workflow from the dashboard to append bedside observations. New
            notes will flow into the patient care log automatically.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/nurse"
              className="inline-flex items-center gap-2 rounded-xl border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:border-purple-300 hover:text-purple-800"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/nurse/reports/incidents"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              Log Incident
            </Link>
          </div>
        </motion.div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
