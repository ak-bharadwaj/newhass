'use client'

import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'

export default function NurseReportsShiftsPage() {
  const shifts = [
    { id: 1, date: '2024-01-15', shift: 'Morning (8AM-4PM)', patientsHandled: 12, tasksCompleted: 45, notes: 'Busy shift, emergency admission' },
    { id: 2, date: '2024-01-14', shift: 'Evening (4PM-12AM)', patientsHandled: 10, tasksCompleted: 38, notes: 'Smooth operations' },
    { id: 3, date: '2024-01-13', shift: 'Morning (8AM-4PM)', patientsHandled: 15, tasksCompleted: 52, notes: 'High patient load' },
    { id: 4, date: '2024-01-12', shift: 'Night (12AM-8AM)', patientsHandled: 6, tasksCompleted: 28, notes: 'Quiet night shift' }
  ]

  return (
    <EnterpriseDashboardLayout role="nurse">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/nurse" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shift Reports</h1>
            <p className="text-gray-600 mt-1">Track your shift activities and performance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Shifts', value: shifts.length, icon: '🕐', color: 'from-blue-500 to-indigo-500' },
            { label: 'Patients Handled', value: shifts.reduce((sum, s) => sum + s.patientsHandled, 0), icon: '👥', color: 'from-green-500 to-emerald-500' },
            { label: 'Tasks Completed', value: shifts.reduce((sum, s) => sum + s.tasksCompleted, 0), icon: '✅', color: 'from-purple-500 to-pink-500' }
          ].map((stat, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}>
              <div className="flex items-center justify-between">
                <div><p className="text-white/80 text-sm mb-1">{stat.label}</p><p className="text-4xl font-bold">{stat.value}</p></div>
                <span className="text-5xl opacity-20">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          {shifts.map((shift, index) => (
            <motion.div key={shift.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{shift.shift}</h3>
                  <p className="text-gray-600">{new Date(shift.date).toLocaleDateString()}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">Completed</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Patients Handled</p>
                  <p className="text-2xl font-bold text-gray-900">{shift.patientsHandled}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Tasks Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{shift.tasksCompleted}</p>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Shift Notes</p>
                <p className="text-blue-900">{shift.notes}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
