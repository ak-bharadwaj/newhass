'use client'
import {EnterpriseDashboardLayout} from '@/components/dashboard/EnterpriseDashboardLayout'
import {BackButton} from '@/components/common/BackButton'
import {motion} from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { apiClient, type RegionWithStats } from '@/lib/api'

export default function Page(){
	const { token } = useAuth()
	const [regions, setRegions] = useState<RegionWithStats[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!token) return
		setLoading(true)
		setError(null)
		;(async () => {
			try {
				const r = await apiClient.getRegions(token)
				setRegions(r)
			} catch (e: any) {
				setError(e?.message || 'Failed to load regions')
			} finally {
				setLoading(false)
			}
		})()
	}, [token])

	const summary = useMemo(() => {
		const totals = regions.reduce((acc, r) => {
			acc.hospitals += r.hospitals_count || 0
			acc.staff += r.total_staff || 0
			acc.patients += r.total_patients || 0
			return acc
		}, { hospitals: 0, staff: 0, patients: 0 })
		return {
			regions: regions.length,
			hospitals: totals.hospitals,
			staff: totals.staff,
			patients: totals.patients,
		}
	}, [regions])

	const cards = [
		{ label: 'Regions', value: String(summary.regions), icon: '🌍', color: 'from-blue-500 to-indigo-500' },
		{ label: 'Total Hospitals', value: String(summary.hospitals), icon: '🏥', color: 'from-green-500 to-emerald-500' },
		{ label: 'Total Staff', value: String(summary.staff), icon: '👥', color: 'from-yellow-500 to-orange-500' },
		{ label: 'Active Patients', value: String(summary.patients), icon: '🩺', color: 'from-purple-500 to-pink-500' },
	]

	return(
		<EnterpriseDashboardLayout role="super_admin">
			<div className="space-y-6">
				<div className="flex items-center gap-4"><BackButton fallbackUrl="/dashboard/super_admin"/><div><h1 className="text-3xl font-bold text-gray-900">Regional Analytics</h1><p className="text-gray-600 mt-1">Performance by geographic region</p></div></div>

				{error && (<div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800">{error}</div>)}

				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
					{(loading && regions.length===0 ? Array.from({length:4}) : cards).map((stat:any,i:number)=>(
						<motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} className={`bg-gradient-to-br ${stat.color ?? 'from-gray-200 to-gray-300'} rounded-2xl p-6 text-white shadow-lg`}>
							{loading && regions.length===0 ? (
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
					<h3 className="text-xl font-bold mb-4">Regional Performance</h3>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b-2 border-gray-200">
									<th className="text-left py-3 px-4 font-semibold text-gray-700">Region</th>
									<th className="text-center py-3 px-4 font-semibold text-gray-700">Hospitals</th>
									<th className="text-center py-3 px-4 font-semibold text-gray-700">Staff</th>
									<th className="text-center py-3 px-4 font-semibold text-gray-700">Active Patients</th>
								</tr>
							</thead>
							<tbody>
								{regions.map((r)=> (
									<tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
										<td className="py-4 px-4"><span className="font-semibold text-gray-900">{r.name}</span></td>
										<td className="py-4 px-4 text-center text-gray-700">{r.hospitals_count}</td>
										<td className="py-4 px-4 text-center text-gray-700">{r.total_staff}</td>
										<td className="py-4 px-4 text-center text-gray-700">{r.total_patients}</td>
									</tr>
								))}
								{regions.length===0 && !loading && (
									<tr><td colSpan={4} className="py-6 text-center text-gray-600">No regions found.</td></tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</EnterpriseDashboardLayout>
	)}
