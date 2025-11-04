'use client'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
export default function ManagerOperationsCapacityPage() {
  return (
    <EnterpriseDashboardLayout role="manager">
      <div className="space-y-6">
        <div className="flex items-center gap-4"><BackButton fallbackUrl="/dashboard/manager" /><div><h1 className="text-3xl font-bold text-gray-900">Capacity Planning</h1><p className="text-gray-600 mt-1">Forecast and optimize hospital capacity</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[{label:'Current Capacity',value:'82%',icon:'🏥',color:'from-blue-500 to-indigo-500'},{label:'Projected',value:'95%',icon:'📈',color:'from-orange-500 to-red-500'},{label:'Optimal',value:'75-85%',icon:'🎯',color:'from-green-500 to-emerald-500'}].map((stat,index)=>(
            <motion.div key={index} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:index*0.1}} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}><div className="flex items-center justify-between"><div><p className="text-white/80 text-sm mb-1">{stat.label}</p><p className="text-4xl font-bold">{stat.value}</p></div><span className="text-5xl opacity-20">{stat.icon}</span></div></motion.div>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"><h3 className="text-xl font-bold text-gray-900 mb-4">Weekly Capacity Forecast</h3><div className="space-y-4">{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day,index)=>{const capacity=75+Math.random()*20;return(<div key={day}><div className="flex justify-between mb-2"><span className="text-gray-600">{day}</span><span className="font-bold">{capacity.toFixed(0)}%</span></div><div className="w-full bg-gray-200 rounded-full h-3"><div className={`h-3 rounded-full ${capacity>90?'bg-red-500':capacity>80?'bg-orange-500':'bg-green-500'}`} style={{width:`${capacity}%`}}></div></div></div>)})}</div></div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
