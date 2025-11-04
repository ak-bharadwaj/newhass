'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { apiClient, Patient } from '@/lib/api'
import Link from 'next/link'
import { BackButton } from '@/components/common/BackButton'

export default function NursePatientsPage() {
  const { token } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      loadPatients()
    }
  }, [token])

  const loadPatients = async () => {
    if (!token) return
    
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getNursePatients(token)
      setPatients(data)
    } catch (err: any) {
      console.error('Failed to load patients:', err)
      setError(err.message || 'Failed to load patients')
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name} ${patient.mrn}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  )

  return (
    <EnterpriseDashboardLayout role="nurse">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallbackUrl="/dashboard/nurse" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Patients</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage assigned patients
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading patients...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={loadPatients}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No patients found' : 'No patients assigned'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-green-500 dark:hover:border-green-400 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {patient.first_name[0]}{patient.last_name[0]}
                  </div>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                    {patient.mrn}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {patient.first_name} {patient.last_name}
                </h3>
                
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {patient.date_of_birth && (
                    <p>{new Date(patient.date_of_birth).toLocaleDateString()}</p>
                  )}
                  {patient.gender && (
                    <p className="capitalize">{patient.gender}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
