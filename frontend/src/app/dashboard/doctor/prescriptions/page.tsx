'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient, { type PatientWithVitals, type Prescription, type CreatePrescriptionData } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'

interface NewPrescription {
  patientId: string
  medication: string
  dosage: string
  frequency: string
  route: string
  duration: string
  instructions: string
}

export default function DoctorPrescriptionsPage() {
  const { token } = useAuth()
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId) || null, [patients, selectedPatientId])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newPrescription, setNewPrescription] = useState<NewPrescription>({
    patientId: '',
    medication: '',
    dosage: '',
    frequency: '',
    route: '',
    duration: '',
    instructions: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const commonDrugs = [
    { name: 'Amoxicillin', dosages: ['250mg', '500mg', '875mg'] },
    { name: 'Ibuprofen', dosages: ['200mg', '400mg', '600mg', '800mg'] },
    { name: 'Metformin', dosages: ['500mg', '850mg', '1000mg'] },
    { name: 'Lisinopril', dosages: ['5mg', '10mg', '20mg', '40mg'] },
    { name: 'Atorvastatin', dosages: ['10mg', '20mg', '40mg', '80mg'] },
    { name: 'Omeprazole', dosages: ['20mg', '40mg'] },
    { name: 'Levothyroxine', dosages: ['25mcg', '50mcg', '75mcg', '100mcg'] },
    { name: 'Amlodipine', dosages: ['2.5mg', '5mg', '10mg'] }
  ]

  const frequencies = [
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Four times daily',
    'Every 4 hours',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'As needed',
    'Before meals',
    'After meals',
    'At bedtime'
  ]
  const routes = ['Oral', 'IV', 'IM', 'Subcutaneous', 'Topical', 'Inhalation', 'Sublingual', 'Rectal', 'Transdermal']

  const filteredPrescriptions = prescriptions.filter(p => {
    const patientName = selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''
    return (
      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.medication_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const stats = useMemo(() => ({
    total: prescriptions.length,
    pending: prescriptions.filter(p => p.status === 'pending').length,
    dispensed: prescriptions.filter(p => p.status === 'dispensed').length,
    cancelled: prescriptions.filter(p => p.status === 'cancelled').length
  }), [prescriptions])

  useEffect(() => {
    let ignore = false
    const loadPatients = async () => {
      if (!token) return
      setLoading(true); setError('')
      try {
        const data = await apiClient.getMyPatients(token)
        if (!ignore) {
          setPatients(data)
          if (data.length && !selectedPatientId) {
            setSelectedPatientId(data[0].id)
            setNewPrescription(prev => ({ ...prev, patientId: data[0].id }))
          }
        }
      } catch (e: any) {
        if (!ignore) setError('Failed to load patients')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadPatients()
    return () => { ignore = true }
  }, [token])

  useEffect(() => {
    let ignore = false
    const loadPrescriptions = async () => {
      if (!token || !selectedPatientId) return
      setLoading(true); setError('')
      try {
        const data = await apiClient.getPatientPrescriptions(selectedPatientId, token)
        if (!ignore) setPrescriptions(data)
      } catch (e: any) {
        if (!ignore) setError('Failed to load prescriptions')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadPrescriptions()
    return () => { ignore = true }
  }, [token, selectedPatientId])

  const parseDurationDays = (text: string): number | undefined => {
    if (!text) return undefined
    const match = text.match(/(\d{1,3})/)
    if (match) return Number(match[1])
    return undefined
  }

  const handleCreatePrescription = async () => {
    if (!token) return
    if (!selectedPatient) {
      setError('Please select a patient')
      return
    }
    if (!selectedPatient.active_visit_id) {
      setError('Selected patient has no active visit. Start a visit before prescribing.')
      return
    }
    if (!newPrescription.medication || !newPrescription.dosage || !newPrescription.frequency || !newPrescription.route) {
      setError('Please fill medication, dosage, frequency and route')
      return
    }
    const durationDays = parseDurationDays(newPrescription.duration)
    const start = new Date()
    const payload: CreatePrescriptionData = {
      patient_id: selectedPatient.id,
      visit_id: selectedPatient.active_visit_id,
      medication_name: newPrescription.medication,
      dosage: newPrescription.dosage,
      frequency: newPrescription.frequency,
      route: newPrescription.route,
      duration_days: durationDays,
      start_date: start.toISOString(),
      end_date: durationDays ? new Date(start.getTime() + durationDays * 24 * 3600 * 1000).toISOString() : undefined,
      instructions: newPrescription.instructions || undefined,
    }
    try {
      await apiClient.createPrescription(payload, token)
      const updated = await apiClient.getPatientPrescriptions(selectedPatient.id, token)
      setPrescriptions(updated)
      setShowNewForm(false)
      setNewPrescription({ patientId: selectedPatient.id, medication: '', dosage: '', frequency: '', route: '', duration: '', instructions: '' })
    } catch (e: any) {
      setError('Failed to create prescription')
    }
  }

  const getPatientName = () => selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Unknown Patient'

  return (
    <EnterpriseDashboardLayout role="doctor">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/doctor" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                💊 Prescriptions
              </h1>
              <p className="text-gray-600">Write and manage patient prescriptions</p>
            </div>
            <Button onClick={() => setShowNewForm(true)} size="lg">
              ➕ New Prescription
            </Button>
          </div>
        </motion.div>

        {/* Patient selector + status */}
        <Card className="mb-6">
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => { setSelectedPatientId(e.target.value); setNewPrescription(prev => ({ ...prev, patientId: e.target.value })) }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name} (MRN: {p.mrn})</option>
                  ))}
                </select>
                {selectedPatient && !selectedPatient.active_visit_id && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">This patient has no active visit.</p>
                )}
              </div>
              <div className="md:col-span-2 text-right">
                {loading && <p className="text-sm text-gray-500">Loading...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'from-blue-500 to-indigo-500', icon: '💊' },
            { label: 'Pending', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
            { label: 'Dispensed', value: stats.dispensed, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Cancelled', value: stats.cancelled, color: 'from-red-500 to-rose-500', icon: '❌' }
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

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search prescriptions by patient or medication..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Prescriptions List */}
        <div className="grid gap-4">
          {filteredPrescriptions.map((prescription, index) => (
            <Card
              key={prescription.id}
              className="p-6 border-2 border-gray-100 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{getPatientName()}</h3>
                  <p className="text-gray-600">Prescribed: {(prescription.start_date || prescription.created_at).split('T')[0]}</p>
                </div>
                {prescription.status && (
                  <span className={`px-4 py-2 rounded-xl text-sm font-bold ${
                    prescription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    prescription.status === 'dispensed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {prescription.status.toUpperCase()}
                  </span>
                )}
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    💊
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{prescription.medication_name} - {prescription.dosage} ({prescription.route})</p>
                    <p className="text-sm text-gray-600">{prescription.frequency}{prescription.duration_days ? ` for ${prescription.duration_days} days` : ''}</p>
                    {prescription.instructions && (
                      <p className="text-sm text-blue-700 mt-1">📝 {prescription.instructions}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* New Prescription Modal */}
        <Modal open={showNewForm} onOpenChange={setShowNewForm} title="Write New Prescription">
          <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Patient</label>
                  <select
                    value={newPrescription.patientId}
                    onChange={(e) => { setNewPrescription({...newPrescription, patientId: e.target.value}); setSelectedPatientId(e.target.value) }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select patient...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Medication</label>
                  <input
                    type="text"
                    value={newPrescription.medication}
                    onChange={(e) => setNewPrescription({...newPrescription, medication: e.target.value})}
                    placeholder="Start typing drug name..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    list="drugs"
                  />
                  <datalist id="drugs">
                    {commonDrugs.map(drug => (
                      <option key={drug.name} value={drug.name} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dosage</label>
                    <input
                      type="text"
                      value={newPrescription.dosage}
                      onChange={(e) => setNewPrescription({...newPrescription, dosage: e.target.value})}
                      placeholder="e.g., 500mg"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Route</label>
                    <select
                      value={newPrescription.route}
                      onChange={(e) => setNewPrescription({...newPrescription, route: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select route...</option>
                      {routes.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
                    <input
                      type="text"
                      value={newPrescription.duration}
                      onChange={(e) => setNewPrescription({...newPrescription, duration: e.target.value})}
                      placeholder="e.g., 7 days"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
                    <select
                      value={newPrescription.frequency}
                      onChange={(e) => setNewPrescription({...newPrescription, frequency: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select frequency...</option>
                      {frequencies.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
                  <textarea
                    value={newPrescription.instructions}
                    onChange={(e) => setNewPrescription({...newPrescription, instructions: e.target.value})}
                    placeholder="Additional instructions for patient..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button variant="secondary" className="flex-1" onClick={() => setShowNewForm(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreatePrescription}>Create Prescription</Button>
          </div>
        </Modal>
      </div>
    </EnterpriseDashboardLayout>
  )
}
