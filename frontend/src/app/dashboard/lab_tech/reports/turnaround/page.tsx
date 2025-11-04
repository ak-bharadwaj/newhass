'use client'
import {EnterpriseDashboardLayout} from '@/components/dashboard/EnterpriseDashboardLayout'
import {BackButton} from '@/components/common/BackButton'
import {motion} from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type LabTest } from '@/lib/api'
import { useEffect, useMemo, useState } from 'react'

function minutesBetween(a: string, b: string){
	const t1 = new Date(a).getTime(); const t2 = new Date(b).getTime();
	if (!t1 || !t2) return null; return Math.max(0, Math.round((t2 - t1)/60000))
}

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
				const now = new Date(); const start = new Date(now); start.setDate(now.getDate()-7)
				const list = await apiClient.listLabTests(token, { hospital_id: user?.hospital_id, start_date: start.toISOString(), end_date: now.toISOString(), limit: 500 })
				setTests(list || [])
			} catch(e:any){ setError('Failed to load turnaround metrics') } finally { setLoading(false) }
		}
		load()
	},[])

	const targetMin = 60
	const stat = useMemo(()=>{
		const completed = tests.filter(t=> t.status==='completed' && t.completed_at)
		const tats = completed.map(t=> minutesBetween(t.requested_at, t.completed_at!)).filter((n): n is number => n!==null)
		const avg = tats.length ? Math.round(tats.reduce((a,b)=>a+b,0)/tats.length) : null
		const onTimePct = tats.length ? Math.round(100 * tats.filter(m=>m<=targetMin).length / tats.length) : null
		const urgent = completed.filter(t=> String(t.urgency || '').toLowerCase()==='stat')
		const urgentTats = urgent.map(t=> minutesBetween(t.requested_at, t.completed_at!)).filter((n): n is number => n!==null)
		const urgentAvg = urgentTats.length ? Math.round(urgentTats.reduce((a,b)=>a+b,0)/urgentTats.length) : null
		return { avg, onTimePct, urgentAvg }
	},[tests])

	const cards = [
		{label:'Avg TAT (7d)', value: stat.avg!=null? `${stat.avg} min` : 'N/A', icon:'⏱️', color:'from-blue-500 to-indigo-500'},
		{label:'Target', value: `${targetMin} min`, icon:'🎯', color:'from-green-500 to-emerald-500'},
		{label:'On Time', value: stat.onTimePct!=null? `${stat.onTimePct}%` : 'N/A', icon:'✅', color:'from-purple-500 to-pink-500'},
		{label:'Urgent Avg', value: stat.urgentAvg!=null? `${stat.urgentAvg} min` : 'N/A', icon:'🚨', color:'from-red-500 to-rose-500'}
	]

	return(<EnterpriseDashboardLayout role="lab_tech"><div className="space-y-6"><div className="flex items-center gap-4"><BackButton fallbackUrl="/dashboard/lab_tech"/><div><h1 className="text-3xl font-bold text-gray-900">Turnaround Time</h1><p className="text-gray-600 mt-1">Test processing time analytics</p></div></div>
	{loading ? (<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500"></div></div>) : (
	<div className="grid grid-cols-1 md:grid-cols-4 gap-6">{cards.map((stat,i)=>(<motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}><div className="flex items-center justify-between"><div><p className="text-white/80 text-sm mb-1">{stat.label}</p><p className="text-4xl font-bold">{stat.value}</p></div><span className="text-5xl opacity-20">{stat.icon}</span></div></motion.div>))}</div>)}
	{error && (<div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>)}
	<div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"><h3 className="text-xl font-bold mb-4">TAT Analysis</h3><p className="text-gray-600">Metrics calculated from completed tests in the last 7 days.</p></div></div></EnterpriseDashboardLayout>)
}
