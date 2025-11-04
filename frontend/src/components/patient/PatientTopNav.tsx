'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

interface Item {
  label: string
  href: string
  icon: string
}

const items: Item[] = [
  { label: 'Overview', href: '/dashboard/patient', icon: '🏠' },
  { label: 'Medicines', href: '/dashboard/patient/prescriptions', icon: '💊' },
  { label: 'Appointments', href: '/dashboard/patient/appointments', icon: '📅' },
  { label: 'Lab Reports', href: '/dashboard/patient/lab-reports', icon: '🔬' },
  { label: 'Records', href: '/dashboard/patient/records', icon: '📋' },
  { label: 'Billing', href: '/dashboard/patient/billing', icon: '💰' },
  { label: 'Messages', href: '/dashboard/messages', icon: '💬' },
]

export function PatientTopNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    const base = href.split('?')[0]
    return pathname === base || pathname.startsWith(`${base}/`)
  }

  return (
    <div className="sticky top-14 z-20 mb-6">
      <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-soft-xl">
        <nav className="flex items-center justify-between overflow-x-auto no-scrollbar px-2 sm:px-3">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="flex-1" prefetch={false}>
              <div className="relative">
                <motion.div
                  whileHover={{ y: -2 }}
                  className={`group mx-1 my-2 sm:mx-1.5 sm:my-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </motion.div>
                {isActive(item.href) && (
                  <motion.div
                    layoutId="patient-topnav-underline"
                    className="absolute -bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  />
                )}
              </div>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default PatientTopNav
