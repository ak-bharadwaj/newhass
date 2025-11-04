"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type Patient, type Vitals, type Prescription, type NurseLog, type LabTest, type CaseSheetResponse, type DoctorBrief } from '@/lib/api'
import { DashboardSkeleton, SkeletonCard } from '@/components/common/LoadingSkeletons'
import { PrescriptionsList } from '@/components/clinical/PrescriptionsList'
import { LabReportsList } from '@/components/clinical/LabReportsList'
import { NurseLogFeed } from '@/components/clinical/NurseLogFeed'

interface Props {
  patientId: string
  roleName: 'doctor' | 'manager' | 'admin'
}

export default function PatientDetails({ patientId, roleName }: Props) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [vitals, setVitals] = useState<Vitals[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [nurseLogs, setNurseLogs] = useState<NurseLog[]>([])
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [caseSheets, setCaseSheets] = useState<CaseSheetResponse[]>([])
  const [assignedDoctor, setAssignedDoctor] = useState<DoctorBrief | null>(null)
  const [assignedDoctorImgError, setAssignedDoctorImgError] = useState(false)

  useEffect(() => {
    if (!token || !patientId) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [p, v, pr, nl, lt, cs] = await Promise.all([
          apiClient.getPatient(patientId, token),
          apiClient.getPatientVitals(patientId, token, 25),
          apiClient.getPatientPrescriptions(patientId, token),
          apiClient.getPatientNurseLogs(patientId, token, 25),
          apiClient.getPatientLabTests(patientId, token),
          apiClient.getCaseSheetsByPatient(token, patientId),
        ])
        setPatient(p)
        setVitals(v)
        setPrescriptions(pr)
        setNurseLogs(nl)
        setLabTests(lt)
        setCaseSheets(cs)
        // fetch assigned doctor (best-effort)
        try {
          const doc = await apiClient.getAssignedDoctor(patientId, token)
          setAssignedDoctor(doc)
        } catch {}
      } catch (e: any) {
        setError(e?.message || 'Failed to load patient details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, patientId])

  if (loading) {
    return (
      <div className="p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DashboardSkeleton />
        </motion.div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="p-6"
      >
        <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-12 border border-white/50 text-center">
          <div className="w-20 h-20 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-error-600 mb-2">Error Loading Patient</h2>
          <p className="text-gray-600">{error || 'Patient not found'}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50"
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
            >
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-600 to-purple-600 bg-clip-text text-transparent">
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                <span className="px-3 py-1.5 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-full font-medium text-gray-700 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  MRN: {patient.mrn}
                </span>
                <span className="px-3 py-1.5 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-full font-medium text-blue-700 capitalize">
                  {patient.gender}
                </span>
                <span className="px-3 py-1.5 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-full font-medium text-purple-700 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(patient.date_of_birth).toLocaleDateString()}
                </span>
                {patient.blood_group && (
                  <span className="px-3 py-1.5 bg-gradient-to-br from-error-50 to-error-100 border border-error-200 rounded-full font-bold text-error-700">
                    🩸 {patient.blood_group}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {roleName !== 'admin' && (
              <Link href={`/dashboard/${roleName}/patients`} className="px-4 py-2 rounded-xl bg-white/80 border border-white/60 shadow hover:shadow-lg transition-all text-primary-700 font-medium hover:-translate-y-0.5">
                ← Back
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Grid sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: demographics and contacts */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 lg:col-span-1"
        >
          {assignedDoctor && (
            <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  </svg>
                </div>
                Assigned Doctor
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {assignedDoctor.profile_picture_url && !assignedDoctorImgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assignedDoctor.profile_picture_url}
                      alt={assignedDoctor.full_name}
                      className="w-full h-full object-cover"
                      onError={() => setAssignedDoctorImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                      {assignedDoctor.full_name?.split(' ')?.map(w => w[0]).slice(0,2).join('')}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-gray-900 font-semibold">{assignedDoctor.full_name}</div>
                  {assignedDoctor.qualification && (
                    <div className="text-sm text-gray-600">{assignedDoctor.qualification}</div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                    {assignedDoctor.email && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m0 0l4 4m-4-4l4-4M4 6h16M4 18h16" />
                        </svg>
                        {assignedDoctor.email}
                      </span>
                    )}
                    {assignedDoctor.phone && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {assignedDoctor.phone}
                      </span>
                    )}
                    {(assignedDoctor.hospital_name || patient.hospital_name) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {(assignedDoctor.hospital_name || patient.hospital_name)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              Demographics
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="flex-1">
                  <div className="text-gray-500 text-xs mb-1">Email</div>
                  <div className="font-medium text-gray-900">{patient.email}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-100">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div className="flex-1">
                  <div className="text-gray-500 text-xs mb-1">Contact</div>
                  <div className="font-medium text-gray-900">{patient.contact_number}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-100">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1">
                  <div className="text-gray-500 text-xs mb-1">Address</div>
                  <div className="font-medium text-gray-900">{patient.address}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-error-50 to-white rounded-xl border border-error-100">
                <svg className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <div className="text-gray-500 text-xs mb-1">Emergency Contact</div>
                  <div className="font-medium text-gray-900">{patient.emergency_contact}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Case Sheets
            </h3>
            {caseSheets.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">No case sheets.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {caseSheets.map((cs, idx) => (
                  <motion.li 
                    key={cs.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group"
                  >
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">Case #{cs.case_number}</div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(cs.admission_date).toLocaleDateString()}
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/${roleName}/case-sheets/${cs.id}`}
                          className="px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg font-medium text-sm group-hover:bg-primary-600 group-hover:text-white transition-all"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>

        {/* Middle: prescriptions and labs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 lg:col-span-1"
        >
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              Prescriptions
            </h3>
            {prescriptions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">No prescriptions.</p>
              </div>
            ) : (
              <PrescriptionsList prescriptions={prescriptions} />
            )}
          </div>

          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              Lab Tests
            </h3>
            {labTests.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">No lab tests.</p>
              </div>
            ) : (
              <LabReportsList labTests={labTests} />
            )}
          </div>
        </motion.div>

        {/* Right: vitals and nurse logs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6 lg:col-span-1"
        >
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              Recent Vitals
            </h3>
            {vitals.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">No vitals recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-200">
                      <th className="px-2 py-2 text-left font-semibold">Time</th>
                      <th className="px-2 py-2 text-left font-semibold">Temp</th>
                      <th className="px-2 py-2 text-left font-semibold">HR</th>
                      <th className="px-2 py-2 text-left font-semibold">BP</th>
                      <th className="px-2 py-2 text-left font-semibold">SpO2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitals.slice(0, 10).map((v, idx) => (
                      <motion.tr 
                        key={idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-2 py-2 text-gray-900">{new Date(v.recorded_at || v.created_at || '').toLocaleString()}</td>
                        <td className="px-2 py-2 font-medium text-gray-900">{v.temperature ?? '—'}</td>
                        <td className="px-2 py-2 font-medium text-gray-900">{v.heart_rate ?? '—'}</td>
                        <td className="px-2 py-2 font-medium text-gray-900">{(v.blood_pressure_systolic !== undefined && v.blood_pressure_diastolic !== undefined) ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'}</td>
                        <td className="px-2 py-2 font-medium text-gray-900">{v.spo2 ?? '—'}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Nurse Logs
            </h3>
            {nurseLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">No nurse logs.</p>
              </div>
            ) : (
              <NurseLogFeed logs={nurseLogs} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
