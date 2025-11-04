'use client'

import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'

export default function NurseReportsIncidentsPage() {
  const incidents = [
    { id: 1, type: 'Medication Error', severity: 'Low', date: '2024-01-15', resolved: true, description: 'Incorrect dosage documented, corrected immediately' },
    { id: 2, type: 'Patient Fall', severity: 'Medium', date: '2024-01-12', resolved: true, description: 'Patient slipped in bathroom, no injuries' },
    { id: 3, type: 'Equipment Malfunction', severity: 'Low', date: '2024-01-10', resolved: true, description: 'IV pump error, replaced immediately' }
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Medium': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'High': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <EnterpriseDashboardLayout role="nurse">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/nurse" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Incident Reports</h1>
            <p className="text-gray-600 mt-1">Track and manage safety incidents</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Incidents', value: incidents.length, icon: '⚠️', color: 'from-red-500 to-rose-500' },
            { label: 'Resolved', value: incidents.filter(i => i.resolved).length, icon: '✅', color: 'from-green-500 to-emerald-500' },
            { label: 'Low Severity', value: incidents.filter(i => i.severity === 'Low').length, icon: '🟡', color: 'from-yellow-500 to-orange-500' },
            { label: 'This Month', value: incidents.length, icon: '📅', color: 'from-blue-500 to-indigo-500' }
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
          {incidents.map((incident, index) => (
            <motion.div key={incident.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{incident.type}</h3>
                  <p className="text-gray-600">{new Date(incident.date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getSeverityColor(incident.severity)}`}>
                    {incident.severity} Severity
                  </span>
                  {incident.resolved && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Resolved</span>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-gray-900">{incident.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
