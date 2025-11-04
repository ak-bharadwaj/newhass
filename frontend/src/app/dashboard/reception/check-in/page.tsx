'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type Appointment as ApiAppointment } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { promiseFeedback } from '@/lib/activityFeedback'
import { Input } from '@/components/ui/Input'

interface CheckInPatient {
  id: string
  mrn: string
  name: string
  appointmentId: string
  appointmentTime: string
  doctorName: string
  department: string
  type: string
  checkInStatus: 'pending' | 'checked-in' | 'with-doctor'
}

export default function ReceptionCheckIn() {
  const { token, user } = useAuth()
  const [patients, setPatients] = useState<CheckInPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<CheckInPatient | null>(null)
  const [walkInMode, setWalkInMode] = useState(false)
  const [walkInData, setWalkInData] = useState({
    name: '',
    phone: '',
    reason: ''
  })
  const [error, setError] = useState<string | null>(null)

  const apptQuery = useQuery({
    queryKey: ['reception-appts', user?.hospital_id, token],
    enabled: !!token,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!token) return [] as ApiAppointment[]
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      return apiClient.getAppointments(token, {
        hospital_id: user?.hospital_id,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      })
    }
  })

  useEffect(() => {
    setLoading(apptQuery.isLoading)
    if (apptQuery.isError) setError('Failed to load check-in queue')
    if (apptQuery.data) {
      const checkInList: CheckInPatient[] = apptQuery.data.map((apt) => ({
        id: apt.patient_id,
        mrn: apt.patient_mrn,
        name: apt.patient_name,
        appointmentId: apt.id,
        appointmentTime: new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        doctorName: apt.doctor_name,
        department: apt.appointment_type,
        type: apt.appointment_type,
        checkInStatus: apt.status === 'in_progress' ? 'with-doctor' : apt.status === 'checked_in' ? 'checked-in' : 'pending'
      }))
      setPatients(checkInList)
    }
  }, [apptQuery.isLoading, apptQuery.isError, apptQuery.data])

  const handleCheckIn = (patient: CheckInPatient) => {
    setSelectedPatient(patient)
    setShowCheckInModal(true)
  }

  const confirmCheckIn = async () => {
    if (!selectedPatient || !token) return
    await promiseFeedback(
      apiClient.checkInAppointment(selectedPatient.appointmentId, token),
      {
        loading: 'Checking in...',
        success: 'Patient checked in',
        error: 'Failed to check in',
      }
    )
    setPatients(prev => prev.map(p => p.appointmentId === selectedPatient.appointmentId ? { ...p, checkInStatus: 'checked-in' } : p))
    setShowCheckInModal(false)
    setSelectedPatient(null)
  }

  const handleWalkIn = () => {
    if (walkInData.name && walkInData.phone) {
      const newPatient: CheckInPatient = {
        id: `WALK-${Date.now()}`,
        mrn: 'PENDING',
        name: walkInData.name,
        appointmentId: `WALK-APT-${Date.now()}`,
        appointmentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        doctorName: 'To be assigned',
        department: 'General',
        type: 'walk-in',
        checkInStatus: 'pending'
      }
      setPatients(prev => [newPatient, ...prev])
      setWalkInMode(false)
      setWalkInData({ name: '', phone: '', reason: '' })
    }
  }

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: patients.length,
    pending: patients.filter(p => p.checkInStatus === 'pending').length,
    checkedIn: patients.filter(p => p.checkInStatus === 'checked-in').length,
    withDoctor: patients.filter(p => p.checkInStatus === 'with-doctor').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'checked-in': return 'bg-green-100 text-green-800 border-green-300'
      case 'with-doctor': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800'
    }
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
            Patient Check-In
          </h1>
          <p className="text-gray-600">Check in patients for their appointments</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Today', value: stats.total, color: 'from-cyan-500 to-blue-500', icon: '👥' },
            { label: 'Pending Check-in', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
            { label: 'Checked In', value: stats.checkedIn, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'With Doctor', value: stats.withDoctor, color: 'from-blue-500 to-indigo-500', icon: '👨‍⚕️' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className=""
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-3xl`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Input
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <Button size="lg" onClick={() => setWalkInMode(true)}>+ Walk-In Patient</Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error}</div>
        )}
        {/* Patient Queue */}
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
                className=""
              >
                <Card>
                  <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{patient.name}</h3>
                      <p className="text-gray-600">MRN: {patient.mrn}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">🕐 {patient.appointmentTime}</span>
                        <span className="text-sm text-gray-500">👨‍⚕️ {patient.doctorName}</span>
                        <span className="text-sm text-gray-500">🏥 {patient.department}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(patient.checkInStatus)}`}>
                          {patient.checkInStatus.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {patient.checkInStatus === 'pending' && (
                      <Button onClick={() => handleCheckIn(patient)}>Check In</Button>
                  )}
                  </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {filteredPatients.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No patients found</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Check-In Modal */}
        <Modal open={!!showCheckInModal && !!selectedPatient} onOpenChange={setShowCheckInModal} title="Confirm Check-In">
          {selectedPatient && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Patient Name</p>
                <p className="font-semibold text-lg">{selectedPatient.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">MRN</p>
                <p className="font-semibold">{selectedPatient.mrn}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Appointment Time</p>
                <p className="font-semibold">{selectedPatient.appointmentTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Doctor</p>
                <p className="font-semibold">{selectedPatient.doctorName}</p>
              </div>
              <div className="flex gap-4 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCheckInModal(false)}>Cancel</Button>
                <Button className="flex-1" onClick={confirmCheckIn}>Confirm Check-In</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Walk-In Modal */}
        <Modal open={walkInMode} onOpenChange={setWalkInMode} title="Walk-In Patient">
          <div className="space-y-4">
            <Input
              label="Patient Name *"
              value={walkInData.name}
              onChange={(e) => setWalkInData({ ...walkInData, name: e.target.value })}
              placeholder="Enter patient name"
            />
            <Input
              label="Phone Number *"
              type="tel"
              value={walkInData.phone}
              onChange={(e) => setWalkInData({ ...walkInData, phone: e.target.value })}
              placeholder="+1-555-0000"
            />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Visit</label>
              <textarea
                value={walkInData.reason}
                onChange={(e) => setWalkInData({ ...walkInData, reason: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                rows={3}
                placeholder="Brief description"
              />
            </div>
            <div className="flex gap-4 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setWalkInMode(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleWalkIn}>Add to Queue</Button>
            </div>
          </div>
        </Modal>
      </div>
    </EnterpriseDashboardLayout>
  )
}
