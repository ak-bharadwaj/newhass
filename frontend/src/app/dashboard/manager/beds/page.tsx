'use client'

import { useState, useEffect } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'

interface Bed {
  id: string
  number: string
  ward: string
  floor: number
  type: 'general' | 'icu' | 'private' | 'semi_private'
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  patient?: {
    name: string
    mrn: string
    admissionDate: string
  }
}

export default function ManagerBeds() {
  const [beds, setBeds] = useState<Bed[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterWard, setFilterWard] = useState('all')

  useEffect(() => {
    loadBeds()
  }, [])

  const loadBeds = async () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setBeds([
        {
          id: '1',
          number: 'A101',
          ward: 'General Ward A',
          floor: 1,
          type: 'general',
          status: 'occupied',
          patient: {
            name: 'John Doe',
            mrn: 'MRN001',
            admissionDate: '2025-10-25'
          }
        },
        {
          id: '2',
          number: 'A102',
          ward: 'General Ward A',
          floor: 1,
          type: 'general',
          status: 'available'
        },
        {
          id: '3',
          number: 'ICU-01',
          ward: 'ICU',
          floor: 2,
          type: 'icu',
          status: 'occupied',
          patient: {
            name: 'Jane Smith',
            mrn: 'MRN002',
            admissionDate: '2025-10-28'
          }
        },
        {
          id: '4',
          number: 'ICU-02',
          ward: 'ICU',
          floor: 2,
          type: 'icu',
          status: 'available'
        },
        {
          id: '5',
          number: 'P201',
          ward: 'Private Wing',
          floor: 2,
          type: 'private',
          status: 'reserved'
        },
        {
          id: '6',
          number: 'A103',
          ward: 'General Ward A',
          floor: 1,
          type: 'general',
          status: 'maintenance'
        },
        {
          id: '7',
          number: 'B201',
          ward: 'General Ward B',
          floor: 2,
          type: 'semi_private',
          status: 'occupied',
          patient: {
            name: 'Bob Johnson',
            mrn: 'MRN003',
            admissionDate: '2025-10-27'
          }
        },
        {
          id: '8',
          number: 'B202',
          ward: 'General Ward B',
          floor: 2,
          type: 'semi_private',
          status: 'available'
        }
      ])
      setLoading(false)
    }, 1000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'occupied': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'reserved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'icu': return 'text-red-600 dark:text-red-400'
      case 'private': return 'text-purple-600 dark:text-purple-400'
      case 'semi_private': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const filteredBeds = beds.filter(bed => {
    const matchesStatus = filterStatus === 'all' || bed.status === filterStatus
    const matchesWard = filterWard === 'all' || bed.ward === filterWard
    return matchesStatus && matchesWard
  })

  const stats = {
    total: beds.length,
    available: beds.filter(b => b.status === 'available').length,
    occupied: beds.filter(b => b.status === 'occupied').length,
    maintenance: beds.filter(b => b.status === 'maintenance').length,
    occupancyRate: Math.round((beds.filter(b => b.status === 'occupied').length / beds.length) * 100)
  }

  const wards = Array.from(new Set(beds.map(b => b.ward)))

  return (
    <EnterpriseDashboardLayout role="manager">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/manager" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bed Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor and manage hospital bed availability
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="text-center">
              <p className="text-blue-100 text-sm mb-1">Total Beds</p>
              <p className="text-4xl font-bold">{stats.total}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="text-center">
              <p className="text-green-100 text-sm mb-1">Available</p>
              <p className="text-4xl font-bold">{stats.available}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="text-center">
              <p className="text-red-100 text-sm mb-1">Occupied</p>
              <p className="text-4xl font-bold">{stats.occupied}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="text-center">
              <p className="text-yellow-100 text-sm mb-1">Maintenance</p>
              <p className="text-4xl font-bold">{stats.maintenance}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="text-center">
              <p className="text-purple-100 text-sm mb-1">Occupancy</p>
              <p className="text-4xl font-bold">{stats.occupancyRate}%</p>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Wards</option>
              {wards.map(ward => (
                <option key={ward} value={ward}>{ward}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
        </div>

        {/* Beds Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBeds.map((bed, index) => (
              <motion.div
                key={bed.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 hover:shadow-lg transition-all cursor-pointer ${
                  bed.status === 'available' ? 'border-green-300 dark:border-green-700' :
                  bed.status === 'occupied' ? 'border-red-300 dark:border-red-700' :
                  bed.status === 'maintenance' ? 'border-yellow-300 dark:border-yellow-700' :
                  'border-blue-300 dark:border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {bed.number}
                    </h3>
                    <p className={`text-sm font-medium capitalize ${getTypeColor(bed.type)}`}>
                      {bed.type.replace('_', ' ')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bed.status)}`}>
                    {bed.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <span>🏥</span>
                    <span>{bed.ward}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>Floor {bed.floor}</span>
                  </div>
                </div>

                {bed.patient && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Patient</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{bed.patient.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">MRN: {bed.patient.mrn}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Admitted: {new Date(bed.patient.admissionDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {bed.status === 'available' && (
                  <button className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    Assign Patient
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
