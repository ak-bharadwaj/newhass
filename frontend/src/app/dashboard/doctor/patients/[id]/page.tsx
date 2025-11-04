'use client'

import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import PatientDetails from '@/components/patients/PatientDetails'

export default function DoctorPatientDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const { user } = useAuth()

  if (!user || user.role_name !== 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be a doctor to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <EnterpriseDashboardLayout role="doctor">
      <div className="px-6 py-6">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Patient Details</h1>
        </div>
        <PatientDetails patientId={id} roleName="doctor" />
      </div>
    </EnterpriseDashboardLayout>
  )
}
