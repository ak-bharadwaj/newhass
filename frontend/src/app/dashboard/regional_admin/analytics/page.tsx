'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from '@/components/charts/LazyRecharts'
import { colorForIndex, chartStyles } from '@/components/charts/chartTheme'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import SectionHeader from '@/components/common/SectionHeader'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type HospitalWithStats } from '@/lib/api'

const VIEW_OPTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'hospitals', label: 'Hospitals' },
  { id: 'beds', label: 'Beds & Capacity' },
  { id: 'staff', label: 'Staffing' },
]

type RegionMetrics = Record<string, any>

export default function RegionalAdminAnalyticsPage() {
  const MODE: 'light' | 'dark' = 'light'
  const { token, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeView = searchParams.get('view') || 'overview'

  const [metrics, setMetrics] = useState<RegionMetrics | null>(null)
  const [hospitals, setHospitals] = useState<HospitalWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const regionId = user?.region_id
    const currentToken = token
    if (!currentToken || !regionId) {
      // Avoid indefinite spinner when auth/region not ready
      setLoading(false)
      if (!error) setError('Your session or region context is missing. Please sign in again or select a region.')
      return
    }
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
        if (!cancelled) setError(e?.message || 'Unable to load regional analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load(regionId, currentToken)
    return () => {
      cancelled = true
    }
  }, [token, user?.region_id])

  const summary = useMemo(() => {
    if (!metrics) {
      return {
        hospitals: hospitals.length,
        totalPatients: hospitals.reduce((acc, h) => acc + (h.active_patients || 0), 0),
        bedUtilization: 0,
        totalBeds: hospitals.reduce((acc, h) => acc + (h.bed_capacity || 0), 0),
        staff: hospitals.reduce((acc, h) => acc + (h.staff_count || 0), 0),
      }
    }
    const totalBeds = Number(metrics.total_beds ?? 0)
    const occupiedBeds = Number(metrics.occupied_beds ?? 0)
    return {
      hospitals: Number(metrics.hospitals_count ?? hospitals.length),
      totalPatients: Number(metrics.total_patients ?? hospitals.reduce((acc, h) => acc + (h.active_patients || 0), 0)),
      bedUtilization: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : Number(metrics.bed_utilization ?? 0),
      totalBeds,
      staff: Number(metrics.staff_count ?? hospitals.reduce((acc, h) => acc + (h.staff_count || 0), 0)),
    }
  }, [metrics, hospitals])

  const occupancyData = useMemo(() =>
    hospitals.map((hospital) => ({
      name: hospital.code || hospital.name,
      occupancy: hospital.bed_capacity > 0 ? Math.round((hospital.occupied_beds / hospital.bed_capacity) * 100) : 0,
      patients: hospital.active_patients ?? 0,
      staff: hospital.staff_count ?? 0,
    })),
  [hospitals])

  const bedBreakdown = useMemo(() =>
    hospitals.map((hospital) => ({
      name: hospital.code || hospital.name,
      occupied: hospital.occupied_beds ?? 0,
      available: Math.max(0, Number(hospital.bed_capacity || 0) - Number(hospital.occupied_beds || 0)),
    })),
  [hospitals])

  const staffingDistribution = useMemo(() =>
    hospitals.map((hospital) => ({
      name: hospital.code || hospital.name,
      staff: hospital.staff_count ?? 0,
      patients: hospital.active_patients ?? 0,
      ratio: hospital.bed_capacity > 0 ? (hospital.staff_count || 0) / hospital.bed_capacity : 0,
    })),
  [hospitals])

  const admissionsTrend = useMemo(() => {
    const trend = metrics?.admissions_trend
    if (Array.isArray(trend) && trend.every((item) => item && typeof item.month === 'string')) {
      return trend.map((item: any) => ({
        month: item.month,
        admissions: Number(item.admissions ?? 0),
        discharges: Number(item.discharges ?? 0),
      }))
    }
    return []
  }, [metrics])

  const pushView = (view: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{
          label: 'Hospitals',
          value: summary.hospitals,
          helper: 'Active in region',
          icon: '🏥',
        }, {
          label: 'Total Beds',
          value: summary.totalBeds.toLocaleString(),
          helper: `${summary.bedUtilization}% occupancy`,
          icon: '🛏️',
        }, {
          label: 'Staff Members',
          value: summary.staff.toLocaleString(),
          helper: 'Licensed staff',
          icon: '🧑‍⚕️',
        }, {
          label: 'Active Patients',
          value: summary.totalPatients.toLocaleString(),
          helper: 'Current census',
          icon: '👥',
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Occupancy by Hospital</h3>
            <span className="text-xs uppercase tracking-wide text-gray-400">Live snapshot</span>
          </div>
          {occupancyData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-500">No hospital occupancy data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                <XAxis dataKey="name" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <YAxis tickFormatter={(value: any) => `${value}%`} domain={[0, 100]} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <Tooltip formatter={(value: any) => `${value}%`} contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                <Bar dataKey="occupancy" fill={colorForIndex(0, MODE)} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Admissions Trend</h3>
            <span className="text-xs uppercase tracking-wide text-gray-400">Past periods</span>
          </div>
          {admissionsTrend.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-500">Trend data is not yet available from the backend.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={admissionsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                <XAxis dataKey="month" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <YAxis stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                <Legend />
                <Line type="monotone" dataKey="admissions" stroke={colorForIndex(0, MODE)} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="discharges" stroke={colorForIndex(1, MODE)} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </div>
  )

  const renderHospitals = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {hospitals.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">No hospitals found for this region.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Hospital</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Patients</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Staff</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Beds</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Occupancy</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hospitals.map((hospital) => {
                const capacity = Number(hospital.bed_capacity) || 0
                const occupied = Number(hospital.occupied_beds) || 0
                const occupancy = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0
                return (
                  <tr key={hospital.id} className="hover:bg-orange-50/40">
                    <td className="px-4 py-3 text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{hospital.name}</span>
                        <span className="text-xs text-gray-400">Code {hospital.code || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{(hospital.active_patients ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{(hospital.staff_count ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{capacity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{occupancy}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${hospital.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
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
  )

  const renderBeds = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Bed Availability</h3>
          <span className="text-xs uppercase tracking-wide text-gray-400">By hospital</span>
        </div>
        {bedBreakdown.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">No bed data available.</div>
        ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bedBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                <XAxis dataKey="name" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <YAxis stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                <Legend />
                <Bar dataKey="occupied" stackId="beds" fill={colorForIndex(0, MODE)} radius={[6, 6, 0, 0]} />
                <Bar dataKey="available" stackId="beds" fill={colorForIndex(1, MODE)} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Utilization Detail</h3>
          <span className="text-xs uppercase tracking-wide text-gray-400">Occupancy %</span>
        </div>
        {occupancyData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">No occupancy values to chart.</div>
        ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                <XAxis dataKey="name" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <YAxis domain={[0, 100]} tickFormatter={(value: any) => `${value}%`} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <Tooltip formatter={(value: any) => `${value}%`} contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                <Line type="monotone" dataKey="occupancy" stroke={colorForIndex(0, MODE)} strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
        )}
      </div>
    </div>
  )

  const renderStaff = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Staff vs Patients</h3>
          <span className="text-xs uppercase tracking-wide text-gray-400">Per hospital</span>
        </div>
        {staffingDistribution.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">No staffing data available.</div>
        ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={staffingDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                <XAxis dataKey="name" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <YAxis stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                <Legend />
                <Bar dataKey="staff" fill={colorForIndex(0, MODE)} radius={[6, 6, 0, 0]} />
                <Bar dataKey="patients" fill={colorForIndex(1, MODE)} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Staffing Ratios</h3>
          <span className="text-xs uppercase tracking-wide text-gray-400">Staff per bed</span>
        </div>
        {staffingDistribution.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">No ratio data available.</div>
        ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={staffingDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                <XAxis dataKey="name" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <YAxis tickFormatter={(value: any) => value.toFixed(2)} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : String(value)} contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                <Line type="monotone" dataKey="ratio" stroke={colorForIndex(0, MODE)} strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
        )}
      </div>
    </div>
  )

  return (
    <EnterpriseDashboardLayout role="regional_admin">
      <div className="space-y-6 px-2 pb-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/regional_admin" />
          <SectionHeader
            title="Regional Analytics"
            subtitle="Operational intelligence powered by live data"
            chips={[
              { label: 'Analytics', color: 'amber' },
              { label: new Date().toLocaleDateString(), color: 'gray' },
            ]}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => pushView(option.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeView === option.id
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
          <div className="space-y-4">
            {activeView === 'overview' && renderOverview()}
            {activeView === 'hospitals' && renderHospitals()}
            {activeView === 'beds' && renderBeds()}
            {activeView === 'staff' && renderStaff()}
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
