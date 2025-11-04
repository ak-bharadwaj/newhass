'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'

export default function SuperAdminPatients() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // No global patients endpoint available. Show empty state by default.
    setPatients([])
  }, [])

  const filteredPatients = patients.filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.mrn || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: patients.length,
    admitted: patients.filter(p => p.status === 'admitted').length,
    discharged: patients.filter(p => p.status === 'discharged').length,
    pending: patients.filter(p => p.status === 'pending').length
  }

  return (
    <EnterpriseDashboardLayout role="super_admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/super_admin" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
            All Patients
          </h1>
          <p className="text-gray-600">System-wide patient database</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Patients', value: stats.total, color: 'from-red-500 to-pink-500', icon: '👥' },
            { label: 'Admitted', value: stats.admitted, color: 'from-green-500 to-emerald-500', icon: '🏥' },
            { label: 'Discharged', value: stats.discharged, color: 'from-gray-500 to-slate-500', icon: '✅' },
            { label: 'Pending', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-3xl`}>
                  {stat.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search patients globally..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Patient</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">MRN</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Age/Gender</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Admission</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient, index) => (
                  <motion.tr
                    key={patient.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{patient.name || '-'}</div>
                      <div className="text-sm text-gray-600">{patient.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{patient.mrn || '-'}</td>
                    <td className="px-6 py-4">{patient.age ? `${patient.age}y` : '-'}, {patient.gender || '-'}</td>
                    <td className="px-6 py-4 text-sm">{patient.admissionDate || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        patient.status === 'admitted' ? 'bg-green-100 text-green-800' :
                        patient.status === 'discharged' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(patient.status || 'unknown').toUpperCase()}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {filteredPatients.length === 0 && (
                  <tr>
                    <td className="px-6 py-10 text-center text-gray-500" colSpan={5}>No patients to display.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
