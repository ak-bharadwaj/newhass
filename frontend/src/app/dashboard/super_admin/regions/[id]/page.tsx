'use client'

import React, { useEffect, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/lib/api'
import { motion } from 'framer-motion'

export default function RegionManagePage() {
  const params = useParams()
  const regionId = params?.id as string
  const { token } = useAuth()
  const [region, setRegion] = useState<any | null>(null)
  const [hospitals, setHospitals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!token || !regionId) return
      setLoading(true)
      setError(null)
      try {
        const r = await apiClient.getRegion(regionId, token)
        const hs = await apiClient.getRegionHospitals(regionId, token)
        setRegion(r || null)
        setHospitals(hs || [])
      } catch (e: any) {
        console.error('Failed to load region', e)
        setError('Failed to load region')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, regionId])

  return (
    <EnterpriseDashboardLayout role="super_admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/super_admin/regions" />

        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold">Region Management</h1>
          <p className="text-gray-600">Manage region settings, hospitals and staff</p>
        </motion.div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}

        {loading ? (
          <div className="h-36 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow">
              <h2 className="text-xl font-bold">{region?.name ?? 'Region'}</h2>
              <p className="text-sm text-gray-500">Code: {region?.code ?? '-'}</p>
              <div className="mt-4 flex gap-3">
                <a
                  href={`/dashboard/super_admin/regions/${regionId}/edit`}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Edit Region
                </a>
                <a
                  href={`/dashboard/super_admin/regions/${regionId}/settings`}
                  className="px-4 py-2 rounded-lg bg-gray-100 border hover:bg-gray-50 transition-colors"
                >
                  View Settings
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow">
              <h3 className="text-lg font-semibold mb-3">Hospitals in this Region</h3>
              {hospitals.length === 0 ? (
                <div className="text-gray-500">No hospitals found in this region.</div>
              ) : (
                <ul className="space-y-3">
                  {hospitals.map((h) => (
                    <li key={h.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{h.name}</div>
                        <div className="text-sm text-gray-500">{h.code} • {h.bed_capacity ?? '—'} beds</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`/dashboard/super_admin/hospitals/${h.id}`} className="text-blue-600">Open</a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
