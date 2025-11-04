'use client'
import {EnterpriseDashboardLayout} from '@/components/dashboard/EnterpriseDashboardLayout'
import {BackButton} from '@/components/common/BackButton'
import {motion} from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { apiClient, type HospitalWithStats } from '@/lib/api'

export default function Page(){
	const { token } = useAuth()
	const [hospitals, setHospitals] = useState<HospitalWithStats[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!token) return
		setLoading(true)
		setError(null)
		;(async () => {
			try {
				const h = await apiClient.getHospitals(token)
				setHospitals(h)
			} catch (e: any) {
				setError(e?.message || 'Failed to load hospitals')
			} finally {
				setLoading(false)
			}
		})()
	}, [token])

	const summary = useMemo(() => {
		const totals = hospitals.reduce((acc, h) => {
			acc.capacity += h.bed_capacity || 0
			acc.occupied += h.occupied_beds || 0
			acc.available += h.available_beds || 0
			acc.staff += h.staff_count || 0
			acc.patients += h.active_patients || 0
			return acc
		}, { capacity: 0, occupied: 0, available: 0, staff: 0, patients: 0 })
		const occupancy = totals.capacity ? Math.round((totals.occupied / totals.capacity) * 100) : 0
		return { count: hospitals.length, occupancy, staff: totals.staff, patients: totals.patients }
	}, [hospitals])

	const cards = [
		{ label: 'Total Hospitals', value: String(summary.count), icon: '🏥', color: 'from-blue-500 to-indigo-500' },
		{ label: 'Active Patients', value: String(summary.patients), icon: '🩺', color: 'from-green-500 to-emerald-500' },
		{ label: 'Staff Count', value: String(summary.staff), icon: '👥', color: 'from-yellow-500 to-orange-500' },
		{ label: 'Avg Occupancy', value: `${summary.occupancy}%`, icon: '📊', color: 'from-purple-500 to-pink-500' },
	]

	return(
		<EnterpriseDashboardLayout role="super_admin">
			<div className="space-y-6">
				<div className="flex items-center gap-4"><BackButton fallbackUrl="/dashboard/super_admin"/><div><h1 className="text-3xl font-bold text-gray-900">Hospital Analytics</h1><p className="text-gray-600 mt-1">Individual hospital performance</p></div></div>

				{error && (<div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800">{error}</div>)}

				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
					{(loading && hospitals.length===0 ? Array.from({length:4}) : cards).map((stat:any,i:number)=>(
						<motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} className={`bg-gradient-to-br ${stat.color ?? 'from-gray-200 to-gray-300'} rounded-2xl p-6 text-white shadow-lg`}>
							{loading && hospitals.length===0 ? (
								<div className="animate-pulse space-y-3">
									<div className="h-4 bg-white/40 rounded w-1/3"></div>
									<div className="h-7 bg-white/40 rounded w-1/2"></div>
								</div>
							) : (
								<div className="flex items-center justify-between">
									<div><p className="text-white/80 text-sm mb-1">{stat.label}</p><p className="text-4xl font-bold">{stat.value}</p></div>
									<span className="text-5xl opacity-20">{stat.icon}</span>
								</div>
							)}
						</motion.div>
					))}
				</div>

				<div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
					<h3 className="text-xl font-bold mb-4">Hospital Metrics</h3>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b-2 border-gray-200">
									<th className="text-left py-3 px-4 font-semibold text-gray-700">Hospital</th>
									<th className="text-center py-3 px-4 font-semibold text-gray-700">Region</th>
									<th className="text-center py-3 px-4 font-semibold text-gray-700">Beds (Occ./Cap.)</th>
									<th className="text-center py-3 px-4 font-semibold text-gray-700">Staff</th>
									<th className="text-center py-3 px-4 font-semibold text-gray-700">Active Patients</th>
								</tr>
							</thead>
							<tbody>
								{hospitals.map((h)=> (
									<tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
										<td className="py-4 px-4"><span className="font-semibold text-gray-900">{h.name}</span></td>
										<td className="py-4 px-4 text-center text-gray-700">{h.region_id}</td>
										<td className="py-4 px-4 text-center text-gray-700">{h.occupied_beds}/{h.bed_capacity}</td>
										<td className="py-4 px-4 text-center text-gray-700">{h.staff_count}</td>
										<td className="py-4 px-4 text-center text-gray-700">{h.active_patients}</td>
									</tr>
								))}
								{hospitals.length===0 && !loading && (
									<tr><td colSpan={5} className="py-6 text-center text-gray-600">No hospitals found.</td></tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</EnterpriseDashboardLayout>
	)}
