'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { FeedbackButton } from '@/components/common/FeedbackButton'

interface InventoryItem {
  id: string
  hospital_id: string
  medication_name: string
  quantity: number
  unit: string
  expiry_date: string
  notes?: string
  created_at: string
  updated_at: string
}

export default function InventoryPage() {
  const { user, token, hasRole } = useAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [view, setView] = useState<'all' | 'low' | 'expiring'>('all')
  const [loading, setLoading] = useState(true)

  const isPharmacist = hasRole('pharmacist')

  useEffect(() => {
    if (!token) return
    load()
  }, [token, view])

  const load = async () => {
    if (!user?.hospital_id) return
    setLoading(true)
    try {
      if (view === 'all') {
        const data = await apiClient.listInventory({ hospital_id: user.hospital_id }, token!)
        setItems(data)
      } else if (view === 'low') {
        const data = await apiClient.getLowStock({ hospital_id: user.hospital_id }, token!)
        setItems(data)
      } else {
        const data = await apiClient.getExpiringSoon({ hospital_id: user.hospital_id }, token!)
        setItems(data)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!user || !isPharmacist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only pharmacists can view inventory.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Pharmacy Inventory</h2>
          <div className="flex items-center gap-2">
            <FeedbackButton variant={view === 'all' ? 'primary' : 'ghost'} onClick={() => setView('all')}>All</FeedbackButton>
            <FeedbackButton variant={view === 'low' ? 'warning' : 'ghost'} onClick={() => setView('low')}>Low Stock</FeedbackButton>
            <FeedbackButton variant={view === 'expiring' ? 'secondary' : 'ghost'} onClick={() => setView('expiring')}>Expiring Soon</FeedbackButton>
            <FeedbackButton variant="ghost" onClickAsync={load}>Refresh</FeedbackButton>
          </div>
        </div>
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No items</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <div key={it.id} className="border rounded-xl p-4 bg-white/90">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{it.medication_name}</div>
                  <div className="text-sm text-gray-600">{it.quantity} {it.unit}</div>
                </div>
                <div className="mt-1 text-sm text-gray-600">Expiry: {new Date(it.expiry_date).toLocaleDateString()}</div>
                {it.notes && <div className="mt-1 text-xs text-gray-500">{it.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
