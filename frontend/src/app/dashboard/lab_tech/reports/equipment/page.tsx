'use client'
import {EnterpriseDashboardLayout} from '@/components/dashboard/EnterpriseDashboardLayout'
import {BackButton} from '@/components/common/BackButton'
export default function Page(){
	return(
		<EnterpriseDashboardLayout role="lab_tech">
			<div className="space-y-6">
				<div className="flex items-center gap-4"><BackButton fallbackUrl="/dashboard/lab_tech"/><div><h1 className="text-3xl font-bold text-gray-900">Equipment Status</h1><p className="text-gray-600 mt-1">Lab equipment monitoring and maintenance</p></div></div>
				<div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
					<p className="text-gray-500 text-lg">Equipment monitoring isn’t connected yet</p>
					<p className="text-gray-400 text-sm mt-2">No backend endpoint available; once provided, we’ll display live equipment metrics here.</p>
				</div>
			</div>
		</EnterpriseDashboardLayout>
	)
}
