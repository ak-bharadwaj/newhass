'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { PatientWithVitals } from '@/lib/api'

export default function DoctorPatientsPage() {
  const { token } = useAuth()
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedPatient, setSelectedPatient] = useState<PatientWithVitals | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchPatients() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const data = await apiClient.getMyPatients(token)
        if (!cancelled) setPatients(data)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load patients')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPatients()
    return () => { cancelled = true }
  }, [token])

  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return patients.filter(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
      const matchesSearch =
        fullName.includes(q) ||
        p.mrn.toLowerCase().includes(q)
      const active = Boolean(p.active_visit_id)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && active) ||
        (statusFilter === 'inactive' && !active)
      return matchesSearch && matchesStatus
    })
  }, [patients, searchQuery, statusFilter])

  const stats = {
    total: patients.length,
    activeVisit: patients.filter(p => Boolean(p.active_visit_id)).length,
    noActiveVisit: patients.filter(p => !p.active_visit_id).length,
    abnormalVitals: patients.filter(p => p.has_abnormal_vitals).length,
  }

  const getAge = (dob?: string) => {
    if (!dob) return '—'
    const birth = new Date(dob)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
    return age
  }

  return (
    <EnterpriseDashboardLayout role="doctor">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/doctor" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            👥 My Patients
          </h1>
          <p className="text-gray-600">View and manage patient records</p>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Patients', value: stats.total, color: 'from-blue-500 to-indigo-500', icon: '👥' },
            { label: 'Active Visit', value: stats.activeVisit, color: 'from-green-500 to-emerald-500', icon: '🏥' },
            { label: 'No Active Visit', value: stats.noActiveVisit, color: 'from-purple-500 to-pink-500', icon: '🗂️' },
            { label: 'Abnormal Vitals', value: stats.abnormalVitals, color: 'from-red-500 to-rose-500', icon: '⚠️' }
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

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search patients by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="active">With Active Visit</option>
            <option value="inactive">No Active Visit</option>
          </select>
        </div>

        {/* Patient Grid */}
        <div className="grid gap-4">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-lg">No patients found</p>
            </div>
          ) : filteredPatients.map((patient, index) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-md p-6 border-2 border-gray-100 hover:border-blue-300 transition-all cursor-pointer"
              onClick={() => setSelectedPatient(patient)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl">
                    {patient.first_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{patient.first_name} {patient.last_name}</h3>
                    <p className="text-gray-600">MRN: {patient.mrn} | {getAge(patient.date_of_birth)}y, {patient.gender}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {patient.phone && <span className="text-sm text-gray-500">📞 {patient.phone}</span>}
                      {patient.blood_group && <span className="text-sm text-gray-500">🩸 {patient.blood_group}</span>}
                      {patient.allergies && patient.allergies.split(',').filter(Boolean).length > 0 && (
                        <span className="text-sm text-red-600 font-semibold">⚠️ {patient.allergies.split(',').filter(Boolean).length} allergies</span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${patient.active_visit_id ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {patient.active_visit_id ? 'ACTIVE VISIT' : 'NO ACTIVE VISIT'}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Patient Details Modal */}
        {selectedPatient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPatient(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6">Patient Medical Record</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Full Name</p>
                  <p className="text-lg font-bold">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">MRN</p>
                  <p className="text-lg font-bold font-mono">{selectedPatient.mrn}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Age / Gender</p>
                  <p className="text-lg font-bold">{getAge(selectedPatient.date_of_birth)} years / {selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Blood Type</p>
                  <p className="text-lg font-bold">{selectedPatient.blood_group ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Contact</p>
                  <p className="text-lg font-bold">{selectedPatient.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Email</p>
                  <p className="text-lg font-bold">{selectedPatient.email ?? '—'}</p>
                </div>
                {selectedPatient.allergies && selectedPatient.allergies.split(',').filter(Boolean).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 font-semibold mb-2">⚠️ Allergies</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedPatient.allergies.split(',').filter(Boolean).map((allergy, i) => (
                        <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">{allergy.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedPatient(null)}
                className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
