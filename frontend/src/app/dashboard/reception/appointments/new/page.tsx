'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type Patient, type UserListItem } from '@/lib/api'
import { PatientSearch } from '@/components/operations/PatientSearch'
import { useNotification } from '@/components/ui/Toast'

export default function NewAppointmentPage() {
  const router = useRouter()
  const { token, user } = useAuth()
  const notify = useNotification()

  const [submitting, setSubmitting] = useState(false)
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [doctors, setDoctors] = useState<UserListItem[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const [form, setForm] = useState({
    doctor_id: '',
    date: '',
    time: '',
    duration_minutes: 30,
    appointment_type: 'consultation',
    reason: '',
    notes: '',
  })

  // Load doctors for this hospital
  useEffect(() => {
    if (!token || !user?.hospital_id) return
    setLoadingDoctors(true)
    apiClient
      .getUsers(token, { role_name: 'doctor', hospital_id: user.hospital_id, page_size: 200 })
      .then((res) => setDoctors(res.users))
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false))
  }, [token, user?.hospital_id])

  const canSubmit = useMemo(() => {
    return !!(
      token &&
      user?.hospital_id &&
      selectedPatient?.id &&
      form.doctor_id &&
      form.date &&
      form.time &&
      form.appointment_type
    )
  }, [token, user?.hospital_id, selectedPatient?.id, form.doctor_id, form.date, form.time, form.appointment_type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !token || !user?.hospital_id || !selectedPatient) return

    try {
      setSubmitting(true)
      const scheduled_at_local = new Date(`${form.date}T${form.time}`)
      const payload = {
        patient_id: selectedPatient.id,
        doctor_id: form.doctor_id,
        hospital_id: user.hospital_id,
        scheduled_at: scheduled_at_local.toISOString(),
        duration_minutes: form.duration_minutes || 30,
        appointment_type: form.appointment_type,
        reason: form.reason || undefined,
        notes: form.notes || undefined,
      }
      await apiClient.createAppointment(payload, token)
      notify.createSuccess('Appointment')
      router.push('/dashboard/reception/appointments')
    } catch (e: any) {
      notify.createError('Appointment')
    } finally {
      setSubmitting(false)
    }
  }

  const searchPatients = async (query: string) => {
    // Use current hospital patient list and filter client-side as a fallback
    if (!token) return [] as Patient[]
    try {
      const list = await apiClient.getMyPatients(token, user?.hospital_id)
      const q = query.toLowerCase()
      return list.filter((p) =>
        [p.first_name, p.last_name, p.mrn || '', p.phone || '']
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
    } catch {
      return [] as Patient[]
    }
  }

  return (
    <EnterpriseDashboardLayout role="reception">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/reception/appointments" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
            New Appointment
          </h1>
          <p className="text-gray-600">Create a new appointment for a patient</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Patient selection */}
          <div className="md:col-span-1 bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-3">Patient</h2>
            {selectedPatient ? (
              <div className="space-y-2">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                  <p className="text-sm text-gray-600">MRN: {selectedPatient.mrn}</p>
                  {selectedPatient.phone && <p className="text-sm text-gray-600">{selectedPatient.phone}</p>}
                </div>
                <button type="button" className="text-cyan-700 font-medium" onClick={() => setSelectedPatient(null)}>
                  Change patient
                </button>
              </div>
            ) : (
              <PatientSearch onSelect={setSelectedPatient} onSearch={searchPatients} />
            )}
          </div>

          {/* Middle: Appointment details */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>

            {/* Doctor */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
            <select
              required
              value={form.doctor_id}
              onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
              className="w-full mb-4 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="" disabled>{loadingDoctors ? 'Loading doctors…' : 'Select a doctor'}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.first_name} {d.last_name} {d.role_display_name ? `(${d.role_display_name})` : ''}
                </option>
              ))}
            </select>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Type */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
            <select
              value={form.appointment_type}
              onChange={(e) => setForm({ ...form, appointment_type: e.target.value })}
              className="w-full mb-4 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="consultation">Consultation</option>
              <option value="follow-up">Follow-up</option>
              <option value="emergency">Emergency</option>
            </select>

            {/* Reason */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Brief reason for visit"
              className="w-full mb-4 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />

            {/* Notes */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
              placeholder="Any special instructions or context for the doctor"
              className="w-full mb-6 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-cyan-600 text-white font-semibold shadow hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating…' : 'Create Appointment'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/reception/appointments')}
                className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </EnterpriseDashboardLayout>
  )
}
