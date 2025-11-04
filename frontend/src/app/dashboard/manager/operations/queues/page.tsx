'use client'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
export default function ManagerOperationsQueuesPage() {
  const queues = [
    { department: 'Emergency', waiting: 8, avgWait: 15, status: 'busy' },
    { department: 'Outpatient', waiting: 23, avgWait: 35, status: 'busy' },
    { department: 'Radiology', waiting: 5, avgWait: 20, status: 'normal' },
    { department: 'Laboratory', waiting: 12, avgWait: 10, status: 'normal' }
  ]
  return (
    <EnterpriseDashboardLayout role="manager">
      <div className="space-y-6">
        <div className="flex items-center gap-4"><BackButton fallbackUrl="/dashboard/manager" /><div><h1 className="text-3xl font-bold text-gray-900">Queue Management</h1><p className="text-gray-600 mt-1">Real-time queue monitoring across departments</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {queues.map((queue, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={`rounded-2xl shadow-lg border-2 p-6 ${queue.status === 'busy' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex justify-between items-start mb-4"><h3 className="text-xl font-bold text-gray-900">{queue.department}</h3><span className={`px-3 py-1 rounded-full text-xs font-bold ${queue.status === 'busy' ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'}`}>{queue.status.toUpperCase()}</span></div>
              <div className="grid grid-cols-2 gap-4"><div className="p-4 bg-white rounded-lg"><p className="text-sm text-gray-600 mb-1">Waiting Patients</p><p className="text-3xl font-bold text-gray-900">{queue.waiting}</p></div><div className="p-4 bg-white rounded-lg"><p className="text-sm text-gray-600 mb-1">Avg Wait Time</p><p className="text-3xl font-bold text-gray-900">{queue.avgWait}<span className="text-sm ml-1">min</span></p></div></div>
            </motion.div>
          ))}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
