'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import Link from 'next/link'
import { BackButton } from '@/components/common/BackButton'

export default function PharmacistDrugsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Drug database will be available when backend API is implemented
  const drugs: any[] = []

  const filteredDrugs = drugs.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Antibiotic': 'bg-blue-100 text-blue-800',
      'Antidiabetic': 'bg-purple-100 text-purple-800',
      'ACE Inhibitor': 'bg-red-100 text-red-800',
      'PPI': 'bg-green-100 text-green-800',
      'Calcium Channel Blocker': 'bg-orange-100 text-orange-800',
      'Statin': 'bg-pink-100 text-pink-800',
      'Diuretic': 'bg-cyan-100 text-cyan-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  return (
    <EnterpriseDashboardLayout role="pharmacist">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/pharmacist" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Drug Database</h1>
            <p className="text-gray-600 mt-1">Browse medication information</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Drugs', value: drugs.length, color: 'from-blue-500 to-indigo-500', icon: '💊' },
            { label: 'Low Stock', value: drugs.filter(d => d.stock < d.reorder).length, color: 'from-red-500 to-rose-500', icon: '⚠️' },
            { label: 'Categories', value: new Set(drugs.map(d => d.category)).size, color: 'from-purple-500 to-pink-500', icon: '📁' },
            { label: 'Total Value', value: `$${Math.floor(drugs.reduce((sum, d) => sum + (d.stock * d.price), 0))}`, color: 'from-green-500 to-emerald-500', icon: '💰' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">{stat.label}</p>
                  <p className="text-4xl font-bold">{stat.value}</p>
                </div>
                <span className="text-5xl opacity-20">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <input
            type="text"
            placeholder="🔍 Search drugs by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Drug List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDrugs.length === 0 ? (
            <div className="col-span-2 text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">💊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Drugs Found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? 'No drugs match your search.'
                  : 'No drug records are available yet.'}
              </p>
              <p className="text-sm text-gray-500 mb-6">Manage stock in Inventory or review Orders.</p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/dashboard/pharmacist/inventory" className="px-5 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow hover:shadow-lg transition" data-testid="pharma-drugs-go-inventory">
                  Go to Inventory
                </Link>
                <Link href="/dashboard/pharmacist/orders" className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow hover:shadow-lg transition" data-testid="pharma-drugs-go-orders">
                  View Orders
                </Link>
              </div>
            </div>
          ) : (
            filteredDrugs.map((drug, index) => (
            <motion.div
              key={drug.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-purple-300 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{drug.name}</h3>
                  <p className="text-gray-600">{drug.id}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getCategoryColor(drug.category)}`}>
                  {drug.category}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Dosage</p>
                  <p className="font-bold text-gray-900">{drug.dosage}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Form</p>
                  <p className="font-bold text-gray-900">{drug.form}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Current Stock</p>
                  <p className={`font-bold ${drug.stock < drug.reorder ? 'text-red-600' : 'text-green-600'}`}>
                    {drug.stock} units
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Price/Unit</p>
                  <p className="font-bold text-gray-900">${drug.price}</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg mb-4">
                <p className="text-xs text-blue-600 mb-1">Manufacturer</p>
                <p className="font-bold text-blue-900">{drug.manufacturer}</p>
              </div>

              {drug.stock < drug.reorder && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-bold text-red-900">Low Stock Alert</p>
                    <p className="text-xs text-red-700">Reorder threshold: {drug.reorder} units</p>
                  </div>
                </div>
              )}
            </motion.div>
            ))
          )}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
