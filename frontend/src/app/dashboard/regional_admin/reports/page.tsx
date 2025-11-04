'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import SectionHeader from '@/components/common/SectionHeader'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type HospitalWithStats } from '@/lib/api'

const REPORT_TABS = [
  { id: 'monthly', label: 'Monthly Summary' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'export', label: 'Export Center' },
]

type RegionMetrics = Record<string, any>

export default function RegionalAdminReportsPage() {
  const { token, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeType = searchParams.get('type') || 'monthly'

  const [metrics, setMetrics] = useState<RegionMetrics | null>(null)
  const [hospitals, setHospitals] = useState<HospitalWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
  const regionId = user?.region_id
  if (!token || !regionId) return
  const safeRegionId = regionId as string
  const currentToken = token
    let cancelled = false

      async function load(currentRegionId: string, tokenStr: string) {
      setLoading(true)
      setError(null)
      try {
        const [metricsResponse, hospitalsResponse] = await Promise.all([
            apiClient.getRegionMetrics(currentRegionId, tokenStr),
            apiClient.getRegionHospitals(currentRegionId, tokenStr),
        ])
        if (!cancelled) {
          setMetrics(metricsResponse)
          setHospitals(hospitalsResponse)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to load report data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load(safeRegionId, currentToken as string)
    return () => {
      cancelled = true
    }
  }, [token, user?.region_id])

  const monthlyRows = useMemo(() =>
    hospitals.map((hospital) => {
      const capacity = Number(hospital.bed_capacity) || 0
      const occupied = Number(hospital.occupied_beds) || 0
      const occupancy = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0
      return {
        id: hospital.id,
        hospital: hospital.name,
        code: hospital.code || '—',
        patients: hospital.active_patients ?? 0,
        staff: hospital.staff_count ?? 0,
        capacity,
        occupancy,
        available: Math.max(0, capacity - occupied),
      }
    }),
  [hospitals])

  const complianceRows = useMemo(() =>
    monthlyRows.map((row) => {
      const capacity = row.capacity || 0
      const occupancyThreshold = 90
      const staffRatio = capacity > 0 ? row.staff / capacity : 0
      const staffThreshold = 0.7
      const occupancyOk = row.occupancy <= occupancyThreshold
      const staffingOk = staffRatio >= staffThreshold
      const issues: string[] = []
      if (!occupancyOk) issues.push('High occupancy')
      if (!staffingOk) issues.push('Low staffing')
      return {
        ...row,
        staffRatio,
        status: issues.length === 0 ? 'Compliant' : 'Action Needed',
        issues,
        complianceScore: Math.max(0, Math.round(((occupancyOk ? 1 : 0) + (staffingOk ? 1 : 0)) / 2 * 100)),
      }
    }),
  [monthlyRows])

  const exportDataset = activeType === 'compliance' ? complianceRows : monthlyRows

  const handleTab = (type: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', type)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleExport = () => {
    if (!exportDataset.length) return
    const header = Object.keys(exportDataset[0])
      .filter((key) => key !== 'issues')
    const rows = exportDataset.map((row) =>
      header.map((key) => {
        const value = (row as any)[key]
        if (Array.isArray(value)) return value.join('; ')
        return value ?? ''
      }).join(',')
    )
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `regional-${activeType}-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderMonthly = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {monthlyRows.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">No hospital metrics available for this month.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Hospital</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Patients</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Staff</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Beds</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Available</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyRows.map((row) => (
                <tr key={row.id} className="hover:bg-orange-50/40">
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">{row.hospital}</span>
                      <span className="text-xs text-gray-400">Code {row.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.patients.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{row.staff.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{row.capacity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{row.available.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{row.occupancy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderCompliance = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {complianceRows.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">No compliance insight available.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Hospital</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Occupancy</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Staff Ratio</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Compliance</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {complianceRows.map((row) => (
                <tr key={row.id} className="hover:bg-orange-50/40">
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">{row.hospital}</span>
                      <span className="text-xs text-gray-400">Code {row.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.occupancy}%</td>
                  <td className="px-4 py-3 text-gray-600">{row.staffRatio.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${row.status === 'Compliant' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <span className="text-base">{row.status === 'Compliant' ? '●' : '▲'}</span>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.complianceScore}%</td>
                  <td className="px-4 py-3 text-sm text-red-600">
                    {row.issues.length ? row.issues.join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderExport = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
          <p className="text-sm text-gray-500">Generate a CSV snapshot based on the current report view.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!exportDataset.length}
          className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          ⬇️ Export CSV
        </button>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p className="font-semibold text-gray-700">Included fields</p>
        <ul className="list-disc pl-5">
          <li>Hospital name and code</li>
          <li>Bed capacity, availability, and occupancy percentage</li>
          <li>Active patients and staff counts</li>
          <li>Compliance classification (if applicable)</li>
        </ul>
      </div>
    </div>
  )

  return (
    <EnterpriseDashboardLayout role="regional_admin">
      <div className="space-y-8 px-3 pb-10">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/regional_admin" />
          <SectionHeader
            title="Regional Reports"
            subtitle="Downloadable operational insights ready for stakeholders"
            chips={[
              { label: activeType.toUpperCase(), color: 'amber' },
              { label: new Date().toLocaleDateString(), color: 'gray' },
            ]}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {REPORT_TABS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleTab(option.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeType === option.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-orange-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {activeType === 'monthly' && renderMonthly()}
            {activeType === 'compliance' && renderCompliance()}
            {activeType === 'export' && renderExport()}
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
