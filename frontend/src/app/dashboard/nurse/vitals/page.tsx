'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from '@/components/charts/LazyRecharts'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import apiClient, { type CreateVitalsData, type PatientWithVitals, type Vitals } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/components/providers/SocketProvider'

interface VitalForm {
  patientId: string
  bloodPressureSystolic: string
  bloodPressureDiastolic: string
  heartRate: string
  temperature: string
  oxygenSaturation: string
  respiratoryRate: string
  notes: string
}

export default function NurseVitalsPage() {
  const { token } = useAuth()
  const [patients, setPatients] = useState<PatientWithVitals[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId) || null, [patients, selectedPatientId])
  const [vitals, setVitals] = useState<Vitals[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [formData, setFormData] = useState<VitalForm>({
    patientId: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    respiratoryRate: '',
    notes: ''
  })

  useEffect(() => {
    let ignore = false
    const loadPatients = async () => {
      if (!token) return
      setLoading(true)
      setError('')
      try {
        const data = await apiClient.getNursePatients(token)
        if (!ignore) {
          setPatients(data)
          if (data.length && !selectedPatientId) {
            setSelectedPatientId(data[0].id)
            setFormData(prev => ({ ...prev, patientId: data[0].id }))
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

  const vitalsQuery = useQuery({
    queryKey: ['vitals', selectedPatientId, token],
    queryFn: async () => {
      if (!token || !selectedPatientId) return [] as Vitals[]
      return apiClient.getPatientVitals(selectedPatientId, token, 25)
    },
    enabled: !!token && !!selectedPatientId,
    refetchInterval: 15000,
  })
  // Socket pilot: refetch when hospital vitals updates arrive
  const { user } = useAuth()
  const { connected, subscribe } = useSocket()
  useEffect(() => {
    if (!connected || !user?.hospital_id) return
    const unsub = subscribe(`hospital:${user.hospital_id}:vitals`, () => {
      vitalsQuery.refetch()
    })
    return () => unsub()
  }, [connected, user?.hospital_id, subscribe])

  useEffect(() => {
    if (vitalsQuery.data) setVitals(vitalsQuery.data)
    setLoading(vitalsQuery.isLoading)
    if (vitalsQuery.isError) setError('Failed to load vitals')
  }, [vitalsQuery.data, vitalsQuery.isLoading, vitalsQuery.isError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!selectedPatient) {
      setError('Please select a patient')
      return
    }
    if (!selectedPatient.active_visit_id) {
      setError('Selected patient has no active visit. Start a visit before recording vitals.')
      return
    }
    const payload: CreateVitalsData = {
      patient_id: selectedPatient.id,
      visit_id: selectedPatient.active_visit_id,
      blood_pressure_systolic: formData.bloodPressureSystolic ? Number(formData.bloodPressureSystolic) : undefined,
      blood_pressure_diastolic: formData.bloodPressureDiastolic ? Number(formData.bloodPressureDiastolic) : undefined,
      heart_rate: formData.heartRate ? Number(formData.heartRate) : undefined,
      temperature: formData.temperature ? Number(formData.temperature) : undefined,
      spo2: formData.oxygenSaturation ? Number(formData.oxygenSaturation) : undefined,
      respiratory_rate: formData.respiratoryRate ? Number(formData.respiratoryRate) : undefined,
      notes: formData.notes || undefined,
    }
    try {
      await apiClient.recordVitals(payload, token)
      // refresh vitals list
      const updated = await apiClient.getPatientVitals(selectedPatient.id, token, 25)
      setVitals(updated)
      setShowForm(false)
      setFormData({
        patientId: selectedPatient.id,
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        heartRate: '',
        temperature: '',
        oxygenSaturation: '',
        respiratoryRate: '',
        notes: ''
      })
    } catch (e: any) {
      setError('Failed to record vitals')
    }
  }

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const today = vitals.filter(v => v.recorded_at.startsWith(todayStr)).length
    const critical = vitals.filter(v => {
      const sys = v.blood_pressure_systolic ?? 0
      const dias = v.blood_pressure_diastolic ?? 0
      const hr = v.heart_rate ?? 0
      const temp = v.temperature ?? 0
      // basic thresholds
      return sys > 140 || sys < 90 || dias > 90 || dias < 50 || hr > 100 || hr < 60 || temp > 38 || temp < 36 || (v.spo2 ?? 100) < 92
    }).length
    return { today, critical, total: vitals.length }
  }, [vitals])

  const sparkData = useMemo(() => {
    const last = vitals.slice(-30)
    return last.map(v => ({
      t: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hr: v.heart_rate ?? null,
      spo2: v.spo2 ?? null,
      temp: v.temperature ?? null,
    }))
  }, [vitals])

  return (
    <EnterpriseDashboardLayout role="nurse">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallbackUrl="/dashboard/nurse" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patient Vitals</h1>
              <p className="text-gray-600 mt-1">Record and monitor vital signs</p>
            </div>
          </div>
          <Button size="lg" onClick={() => setShowForm(true)}>➕ Record Vitals</Button>
        </div>

        {/* Patient selector */}
        <Card className="p-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value)
                    setFormData(prev => ({ ...prev, patientId: e.target.value }))
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Choose a patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} - MRN: {p.mrn}
                    </option>
                  ))}
                </select>
                {selectedPatient && !selectedPatient.active_visit_id && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                    This patient has no active visit. Start a visit before recording vitals.
                  </p>
                )}
              </div>
              <div className="md:col-span-2 text-right">
                {loading && (
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Recorded Today', value: stats.today, color: 'from-blue-500 to-indigo-500', icon: '📊' },
            { label: 'Critical Alerts', value: stats.critical, color: 'from-red-500 to-rose-500', icon: '⚠️' },
            { label: 'Total Records', value: stats.total, color: 'from-green-500 to-emerald-500', icon: '💚' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">{stat.label}</p>
                  <p className="text-4xl font-bold">{stat.value}</p>
                </div>
                <span className="text-5xl opacity-20">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Vitals for selected patient */}
        <Card className="p-0">
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-900">Recent Vital Signs {selectedPatient ? `for ${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}</h2>
          </CardHeader>
          <CardContent>
            {/* Small trend chart */}
            {!!selectedPatientId && vitals.length > 0 && (
              <div className="mb-6">
                <div className="h-40 w-full bg-white rounded-xl border-2 border-gray-100 p-2">
                  <ResponsiveContainer>
                    <LineChart data={sparkData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Line type="monotone" dataKey="hr" name="HR" stroke="#ef4444" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="spo2" name="SpO₂" stroke="#2563eb" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="temp" name="Temp" stroke="#f59e0b" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {!selectedPatientId ? (
              <p className="text-gray-600">Select a patient to view recent vitals.</p>
            ) : vitals.length === 0 ? (
              <p className="text-gray-600">No vitals recorded for this patient.</p>
            ) : (
              <div className="space-y-4">
                {vitals.map((vital, index) => {
                  const sys = vital.blood_pressure_systolic ?? 0
                  const isCritical = sys > 140 || sys < 90 || (vital.heart_rate ?? 0) > 100 || (vital.heart_rate ?? 0) < 60 || (vital.temperature ?? 0) > 38 || (vital.temperature ?? 0) < 36 || (vital.spo2 ?? 100) < 92

                  return (
                    <motion.div
                      key={vital.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl border-2 ${isCritical ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{selectedPatient?.first_name} {selectedPatient?.last_name}</h3>
                          <p className="text-sm text-gray-600">MRN: {selectedPatient?.mrn} | {new Date(vital.recorded_at).toLocaleString()}</p>
                        </div>
                        {isCritical && (
                          <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
                            ⚠️ CRITICAL
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Blood Pressure</p>
                          <p className="text-lg font-bold text-gray-900">{vital.blood_pressure_systolic && vital.blood_pressure_diastolic ? `${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic}` : '-'}</p>
                          <p className="text-xs text-gray-500">mmHg</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Heart Rate</p>
                          <p className="text-lg font-bold text-gray-900">{vital.heart_rate ?? '-'}</p>
                          <p className="text-xs text-gray-500">bpm</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Temperature</p>
                          <p className="text-lg font-bold text-gray-900">{vital.temperature ?? '-'}°</p>
                          <p className="text-xs text-gray-500">Celsius</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">O₂ Saturation</p>
                          <p className="text-lg font-bold text-gray-900">{vital.spo2 ?? '-'}</p>
                          <p className="text-xs text-gray-500">%</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Resp. Rate</p>
                          <p className="text-lg font-bold text-gray-900">{vital.respiratory_rate ?? '-'}</p>
                          <p className="text-xs text-gray-500">/min</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Recorded By</p>
                          <p className="text-sm font-bold text-gray-900">{vital.recorded_by_name?.split(' ')[0] || '-'}</p>
                        </div>
                      </div>
                      {vital.notes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-900">📝 {vital.notes}</p>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Record Vitals Modal */}
        <Modal open={showForm} onOpenChange={setShowForm} title="Record Vital Signs">
          <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Patient *</label>
                  <select
                    required
                    value={formData.patientId}
                    onChange={(e) => {
                      setFormData({ ...formData, patientId: e.target.value })
                      setSelectedPatientId(e.target.value)
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Choose a patient...</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} - MRN: {patient.mrn}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Blood Pressure */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    label="Systolic BP (mmHg) *"
                    required
                    min={60}
                    max={200}
                    value={formData.bloodPressureSystolic}
                    onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
                    placeholder="120"
                  />
                  <Input
                    type="number"
                    label="Diastolic BP (mmHg) *"
                    required
                    min={40}
                    max={130}
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
                    placeholder="80"
                  />
                </div>

                {/* Other Vitals */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    label="Heart Rate (bpm) *"
                    required
                    min={40}
                    max={180}
                    value={formData.heartRate}
                    onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                    placeholder="72"
                  />
                  <Input
                    type="number"
                    label="Temperature (°C) *"
                    required
                    step={0.1}
                    min={35}
                    max={42}
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    placeholder="37.0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    label="O₂ Saturation (%) *"
                    required
                    min={70}
                    max={100}
                    value={formData.oxygenSaturation}
                    onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
                    placeholder="98"
                  />
                  <Input
                    type="number"
                    label="Respiratory Rate (/min) *"
                    required
                    min={8}
                    max={40}
                    value={formData.respiratoryRate}
                    onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
                    placeholder="16"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Clinical Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="Any observations or concerns..."
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-4 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1">✅ Record Vitals</Button>
                </div>
              </form>
        </Modal>
      </div>
    </EnterpriseDashboardLayout>
  )
}
