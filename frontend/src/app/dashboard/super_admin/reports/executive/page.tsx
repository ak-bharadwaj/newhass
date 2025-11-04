'use client'

import React, { useEffect, useState } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, GlobalMetrics } from '@/lib/api'
import { NoAnalyticsDataEmptyState } from '@/components/ui/EmptyState'

export default function ExecutiveReportPage() {
	const { token } = useAuth()
	const [metrics, setMetrics] = useState<GlobalMetrics | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const load = async () => {
			if (!token) return
			setLoading(true)
			setError(null)
			try {
				const gm = await apiClient.getGlobalMetrics(token)
				setMetrics(gm)
			} catch (e: any) {
				console.error('Failed to load executive metrics', e)
				setError(e?.message || 'Failed to load executive metrics')
				setMetrics(null)
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [token])

	const hasData = !!metrics && (metrics.total_patients || metrics.total_hospitals || metrics.total_staff || metrics.active_visits)

	if (!loading && !hasData) {
		return (
			<EnterpriseDashboardLayout role="super_admin">
				<div className="p-8">
					<BackButton fallbackUrl="/dashboard/super_admin" />
					<NoAnalyticsDataEmptyState onRefresh={() => { if (token) apiClient.getGlobalMetrics(token).then(setMetrics).catch(() => setMetrics(null)) }} />
				</div>
			</EnterpriseDashboardLayout>
		)
	}

	return (
		<EnterpriseDashboardLayout role="super_admin">
			<div className="space-y-6 p-6">
				<div className="flex items-center gap-4">
					<BackButton fallbackUrl="/dashboard/super_admin" />
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Executive Report</h1>
						<p className="text-gray-600 mt-1">Board-level performance summary</p>
					</div>
				</div>

				{error && (
					<div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg">
						<p className="text-white/80 text-sm mb-1">Total Patients</p>
						<p className="text-4xl font-bold">{metrics?.total_patients ?? '—'}</p>
					</motion.div>

					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
						<p className="text-white/80 text-sm mb-1">Active Visits</p>
						<p className="text-4xl font-bold">{metrics?.active_visits ?? '—'}</p>
					</motion.div>

					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
						<p className="text-white/80 text-sm mb-1">Open Emergencies</p>
						<p className="text-4xl font-bold">{metrics?.open_emergencies ?? '—'}</p>
					</motion.div>

					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
						<p className="text-white/80 text-sm mb-1">Avg Bed Utilization</p>
						<p className="text-4xl font-bold">{metrics?.avg_bed_utilization ? `${metrics.avg_bed_utilization}%` : '—'}</p>
					</motion.div>
				</div>

				<div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mt-6">
					<h3 className="text-xl font-bold mb-4">Executive Summary</h3>
					<p className="text-gray-600">High-level strategic insights for leadership. Use the global metrics for system-wide decisions.</p>
				</div>
			</div>
		</EnterpriseDashboardLayout>
	)
}
