'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type Appointment } from '@/lib/api'

export default function ReceptionPatients() {
  const { token, user } = useAuth()
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPatients = async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const appts = await apiClient.getAppointments(token, { hospital_id: user?.hospital_id, limit: 500 })
        // Build a unique patient directory from appointments
        const map = new Map<string, any>()
        appts.forEach((a: Appointment) => {
          if (!map.has(a.patient_id)) {
            map.set(a.patient_id, {
              id: a.patient_id,
              mrn: a.patient_mrn,
              name: a.patient_name,
              phone: a.patient_phone,
              gender: undefined,
              age: undefined,
              status: a.status === 'in_progress' ? 'admitted' : a.status === 'completed' ? 'discharged' : 'pending',
              admissionDate: undefined,
              bedNumber: undefined,
              email: undefined,
              address: undefined,
              bloodType: undefined,
              allergies: [],
            })
          }
        })
        setPatients(Array.from(map.values()))
      } catch (e: any) {
        console.error('Failed to load patients', e)
        setError(e?.message || 'Failed to load patients')
        setPatients([])
      } finally {
        setLoading(false)
      }
    }
    loadPatients()
  }, [token, user?.hospital_id])

  const filteredPatients = patients.filter(p => {
    const matchesSearch = 
  (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
  (p.mrn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
  (p.phone || '').includes(searchQuery)
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: patients.length,
    admitted: patients.filter(p => p.status === 'admitted').length,
    discharged: patients.filter(p => p.status === 'discharged').length,
    pending: patients.filter(p => p.status === 'pending').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'admitted': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'discharged': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const viewDetails = (patient: any) => {
    setSelectedPatient(patient)
    setShowDetails(true)
  }

  return (
    <EnterpriseDashboardLayout role="reception">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/reception" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Patient Directory
          </h1>
          <p className="text-gray-600">View and manage patient information</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Patients', value: stats.total, color: 'from-cyan-500 to-blue-500', icon: '👥' },
            { label: 'Currently Admitted', value: stats.admitted, color: 'from-blue-500 to-indigo-500', icon: '🏥' },
            { label: 'Discharged', value: stats.discharged, color: 'from-gray-500 to-slate-500', icon: '✅' },
            { label: 'Pending', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
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

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by name, MRN, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
          >
            <option value="all">All Status</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error}</div>
        )}
        {/* Patient Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            {filteredPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md p-6 border-2 border-gray-100 hover:border-cyan-300 transition-all cursor-pointer"
                onClick={() => viewDetails(patient)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                      {(patient.name || '?').split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{patient.name}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-600">MRN: {patient.mrn || '-'}</span>
                        <span className="text-sm text-gray-600">📞 {patient.phone || '-'}</span>
                        <span className="text-sm text-gray-600">🎂 {patient.age ? `${patient.age}y` : '-'}, {patient.gender || '-'}</span>
                      </div>
                      {patient.bedNumber && (
                        <span className="text-sm text-gray-500 mt-1 inline-block">🛏️ {patient.bedNumber}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${getStatusColor(patient.status)}`}>
                      {(patient.status || 'pending').toUpperCase()}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      View Details
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredPatients.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No patients found</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Patient Details Modal */}
        {showDetails && selectedPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold">Patient Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Full Name</p>
                  <p className="text-lg font-semibold mt-1">{selectedPatient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">MRN</p>
                  <p className="text-lg font-semibold mt-1">{selectedPatient.mrn}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Age & Gender</p>
                  <p className="text-lg font-semibold mt-1">{selectedPatient.age ? `${selectedPatient.age} years` : '-'}, {selectedPatient.gender || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Phone</p>
                  <p className="text-lg font-semibold mt-1">{selectedPatient.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Email</p>
                  <p className="text-lg font-semibold mt-1">{selectedPatient.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Blood Type</p>
                  <p className="text-lg font-semibold mt-1">{selectedPatient.bloodType || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 font-semibold">Address</p>
                  <p className="text-lg font-semibold mt-1">{selectedPatient.address || '-'}</p>
                </div>
                {selectedPatient.bedNumber && (
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Bed Number</p>
                    <p className="text-lg font-semibold mt-1">{selectedPatient.bedNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Admission Date</p>
                  <p className="text-lg font-semibold mt-1">{selectedPatient.admissionDate || '-'}</p>
                </div>
                {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 font-semibold">Allergies</p>
                    <div className="flex gap-2 mt-2">
                      {selectedPatient.allergies.map((allergy: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
