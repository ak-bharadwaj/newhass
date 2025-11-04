'use client'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
export default function ManagerOperationsResourcesPage() {
  const resources = [
    { name: 'Hospital Beds', total: 250, available: 45, occupied: 205, utilization: 82 },
    { name: 'Operating Rooms', total: 12, available: 3, occupied: 9, utilization: 75 },
    { name: 'Medical Staff', total: 180, available: 22, occupied: 158, utilization: 88 },
    { name: 'Equipment', total: 450, available: 89, occupied: 361, utilization: 80 }
  ]
  return (
    <EnterpriseDashboardLayout role="manager">
      <div className="space-y-6">
        <div className="flex items-center gap-4"><BackButton fallbackUrl="/dashboard/manager" /><div><h1 className="text-3xl font-bold text-gray-900">Resource Allocation</h1><p className="text-gray-600 mt-1">Monitor and optimize resource utilization</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((resource, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{resource.name}</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg"><p className="text-sm text-blue-600">Total</p><p className="text-2xl font-bold text-blue-900">{resource.total}</p></div>
                <div className="p-3 bg-green-50 rounded-lg"><p className="text-sm text-green-600">Available</p><p className="text-2xl font-bold text-green-900">{resource.available}</p></div>
                <div className="p-3 bg-orange-50 rounded-lg"><p className="text-sm text-orange-600">In Use</p><p className="text-2xl font-bold text-orange-900">{resource.occupied}</p></div>
              </div>
              <div><div className="flex justify-between mb-2"><span className="text-gray-600">Utilization Rate</span><span className="font-bold">{resource.utilization}%</span></div><div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full" style={{ width: `${resource.utilization}%` }}></div></div></div>
            </motion.div>
          ))}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
