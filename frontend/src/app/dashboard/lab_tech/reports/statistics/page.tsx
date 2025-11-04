'use client'
import {EnterpriseDashboardLayout} from '@/components/dashboard/EnterpriseDashboardLayout'
import {BackButton} from '@/components/common/BackButton'
import {motion} from 'framer-motion'
import {useAuth} from '@/contexts/AuthContext'
import apiClient, { type LabTest } from '@/lib/api'
import { useEffect, useMemo, useState } from 'react'

export default function Page(){
	const { token, user } = useAuth()
	const [tests, setTests] = useState<LabTest[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(()=>{
		const load = async () => {
			if (!token) return
			setLoading(true); setError('')
			try {
				const now = new Date()
				const start = new Date(now)
				start.setDate(now.getDate() - 1)
				const list = await apiClient.listLabTests(token, { hospital_id: user?.hospital_id, start_date: start.toISOString(), end_date: now.toISOString(), limit: 200 })
				setTests(list || [])
			} catch(e:any){ setError('Failed to load lab statistics') }
			finally{ setLoading(false) }
		}
		load()
	},[])

	const today = new Date().toISOString().slice(0,10)
	const stats = useMemo(()=>{
		const todays = tests.filter(t=> new Date(t.requested_at).toISOString().slice(0,10)===today)
		const completed = todays.filter(t=> t.status==='completed').length
		const pending = todays.filter(t=> t.status!=='completed').length
		return [
			{label:'Tests Today', value: String(todays.length), icon:'🔬', color:'from-blue-500 to-indigo-500'},
			{label:'Completed', value: String(completed), icon:'✅', color:'from-green-500 to-emerald-500'},
			{label:'Pending/In Progress', value: String(pending), icon:'⏳', color:'from-yellow-500 to-orange-500'},
			{label:'Accuracy', value:'N/A', icon:'🎯', color:'from-purple-500 to-pink-500'}
		]
	},[tests])

	return(
		<EnterpriseDashboardLayout role="lab_tech">
			<div className="space-y-6">
				<div className="flex items-center gap-4"><BackButton fallbackUrl="/dashboard/lab_tech"/><div><h1 className="text-3xl font-bold text-gray-900">Test Statistics</h1><p className="text-gray-600 mt-1">Lab test performance metrics</p></div></div>
				{loading ? (
					<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500"></div></div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">{stats.map((stat,i)=>(<motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}><div className="flex items-center justify-between"><div><p className="text-white/80 text-sm mb-1">{stat.label}</p><p className="text-4xl font-bold">{stat.value}</p></div><span className="text-5xl opacity-20">{stat.icon}</span></div></motion.div>))}</div>
				)}
				{error && (<div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>)}
				<div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"><h3 className="text-xl font-bold mb-4">Lab Analytics</h3><p className="text-gray-600">Live metrics based on recent lab activity.</p></div>
			</div>
		</EnterpriseDashboardLayout>
	)
}
