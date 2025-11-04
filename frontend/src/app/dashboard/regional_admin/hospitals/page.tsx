'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import SectionHeader from '@/components/common/SectionHeader'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type HospitalWithStats } from '@/lib/api'

export default function RegionalAdminHospitalsPage() {
  const { token, user } = useAuth()
  const [hospitals, setHospitals] = useState<HospitalWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'occupancy' | 'patients'>('name')

  useEffect(() => {
    const regionId = user?.region_id
    const currentToken = token
    if (!currentToken || !regionId) return
    let ignore = false

    async function load(regionIdParam: string, tokenStr: string) {
      setLoading(true)
      setError(null)
      try {
        const data = await apiClient.getRegionHospitals(regionIdParam, tokenStr)
        if (!ignore) setHospitals(data)
      } catch (e: any) {
        if (!ignore) setError(e?.message || 'Failed to load hospitals for region')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load(regionId as string, currentToken as string)
    return () => {
      ignore = true
    }
  }, [token, user?.region_id])

  const summary = useMemo(() => {
    const totals = hospitals.reduce(
      (acc, h) => {
        const capacity = Number(h.bed_capacity) || 0
        const occupied = Number(h.occupied_beds) || 0
        const staff = Number(h.staff_count) || 0
        const patients = Number(h.active_patients) || 0
        acc.capacity += capacity
        acc.occupied += occupied
        acc.staff += staff
        acc.patients += patients
        return acc
      },
      { capacity: 0, occupied: 0, staff: 0, patients: 0 }
    )

    const occupancyRate = totals.capacity > 0 ? Math.round((totals.occupied / totals.capacity) * 100) : 0
    const staffRatio = totals.capacity > 0 ? (totals.staff / totals.capacity).toFixed(2) : '0.00'

    return {
      totalHospitals: hospitals.length,
      totalBeds: totals.capacity,
      totalOccupied: totals.occupied,
      occupancyRate,
      staffRatio,
      totalPatients: totals.patients,
    }
  }, [hospitals])

  const filteredHospitals = useMemo(() => {
    const term = search.trim().toLowerCase()
    let dataset = term
      ? hospitals.filter((h) =>
          [h.name, h.code, h.address]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(term))
        )
      : hospitals.slice()

    dataset.sort((a, b) => {
      if (sortKey === 'name') {
        return a.name.localeCompare(b.name)
      }
      if (sortKey === 'occupancy') {
        const occA = a.bed_capacity > 0 ? a.occupied_beds / a.bed_capacity : 0
        const occB = b.bed_capacity > 0 ? b.occupied_beds / b.bed_capacity : 0
        return occB - occA
      }
      const patientsA = a.active_patients || 0
      const patientsB = b.active_patients || 0
      return patientsB - patientsA
    })

    return dataset
  }, [hospitals, search, sortKey])

  return (
    <EnterpriseDashboardLayout role="regional_admin">
      <div className="space-y-8 px-3 pb-8">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/regional_admin" />
          <SectionHeader
            title="Regional Hospitals"
            subtitle="Real-time operational view across your network"
            chips={[
              { label: `${summary.totalHospitals} sites`, color: 'amber' },
              { label: `${summary.totalBeds} beds`, color: 'gray' },
            ]}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[{
            label: 'Bed Occupancy',
            value: `${summary.occupancyRate}%`,
            helper: `${summary.totalOccupied} occupied`,
            icon: '🛏️',
          }, {
            label: 'Active Patients',
            value: summary.totalPatients.toLocaleString(),
            helper: 'Across region',
            icon: '👥',
          }, {
            label: 'Staff to Bed Ratio',
            value: summary.staffRatio,
            helper: 'Regional average',
            icon: '🧑‍⚕️',
          }, {
            label: 'Active Facilities',
            value: `${summary.totalHospitals}`,
            helper: 'Online hospitals',
            icon: '🏥',
          }].map((card) => (
            <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{card.value}</p>
                  <p className="mt-1 text-xs font-medium text-gray-400">{card.helper}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-xl">
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative w-full md:max-w-sm">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, code, or address"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pl-10 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as typeof sortKey)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="name">Sort: Name</option>
                <option value="occupancy">Sort: Occupancy</option>
                <option value="patients">Sort: Patients</option>
              </select>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Updated {new Date().toLocaleString()}</p>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
              No hospitals match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Hospital</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Active Patients</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Staff</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Beds</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Occupancy</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHospitals.map((hospital) => {
                    const capacity = Number(hospital.bed_capacity) || 0
                    const occupied = Number(hospital.occupied_beds) || 0
                    const occupancy = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0
                    return (
                      <tr key={hospital.id} className="hover:bg-orange-50/40">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <div className="flex flex-col">
                            <span>{hospital.name}</span>
                            <span className="text-xs text-gray-400">{hospital.address || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{hospital.code || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{(hospital.active_patients ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600">{(hospital.staff_count ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600">{capacity.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
                                style={{ width: `${Math.min(100, occupancy)}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">{occupancy}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                              hospital.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            <span className="text-base">{hospital.is_active ? '●' : '○'}</span>
                            {hospital.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
