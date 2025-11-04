'use client'

import { useState, useEffect } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'

interface Order {
  id: string
  medication: string
  supplier: string
  quantity: number
  unitPrice: number
  totalPrice: number
  orderDate: string
  expectedDelivery: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  priority: 'normal' | 'urgent'
}

export default function PharmacistOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showOrderForm, setShowOrderForm] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    setTimeout(() => {
      setOrders([
        {
          id: '1',
          medication: 'Amoxicillin 500mg (Box of 100)',
          supplier: 'MediSupply Inc.',
          quantity: 50,
          unitPrice: 45.00,
          totalPrice: 2250.00,
          orderDate: '2025-10-25',
          expectedDelivery: '2025-10-30',
          status: 'shipped',
          priority: 'normal'
        },
        {
          id: '2',
          medication: 'Insulin Glargine 100U/mL',
          supplier: 'PharmaCorp',
          quantity: 100,
          unitPrice: 78.50,
          totalPrice: 7850.00,
          orderDate: '2025-10-28',
          expectedDelivery: '2025-11-02',
          status: 'confirmed',
          priority: 'urgent'
        },
        {
          id: '3',
          medication: 'Lisinopril 10mg (Box of 90)',
          supplier: 'Global Pharma',
          quantity: 30,
          unitPrice: 32.00,
          totalPrice: 960.00,
          orderDate: '2025-10-29',
          expectedDelivery: '2025-11-05',
          status: 'pending',
          priority: 'normal'
        },
        {
          id: '4',
          medication: 'Metformin 500mg (Box of 100)',
          supplier: 'MediSupply Inc.',
          quantity: 40,
          unitPrice: 28.00,
          totalPrice: 1120.00,
          orderDate: '2025-10-20',
          expectedDelivery: '2025-10-25',
          status: 'delivered',
          priority: 'normal'
        }
      ])
      setLoading(false)
    }, 1000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    totalValue: orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalPrice, 0)
  }

  return (
    <EnterpriseDashboardLayout role="pharmacist">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallbackUrl="/dashboard/pharmacist" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders & Supplies</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track medication orders and inventory supplies
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowOrderForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:from-pink-700 hover:to-rose-700 transition-all shadow-lg"
          >
            📦 New Order
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Orders</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Pending</p>
                <p className="text-3xl font-bold mt-1">{stats.pending}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">In Transit</p>
                <p className="text-3xl font-bold mt-1">{stats.shipped}</p>
              </div>
              <div className="text-4xl">🚚</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Value</p>
                <p className="text-3xl font-bold mt-1">${stats.totalValue.toLocaleString()}</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </motion.div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {order.medication}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      {order.priority === 'urgent' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          🚨 URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Supplier: {order.supplier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${order.totalPrice.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ${order.unitPrice} × {order.quantity}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Order Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expected Delivery</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(order.expectedDelivery).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Quantity</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{order.quantity} units</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Order ID</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">ORD-{order.id}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="px-4 py-2 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-colors">
                    View Details
                  </button>
                  {order.status === 'shipped' && (
                    <button className="px-4 py-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                      Mark as Received
                    </button>
                  )}
                  {order.status === 'pending' && (
                    <button className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      Cancel Order
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowOrderForm(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">New Order</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Order form will be implemented here
            </p>
            <button
              onClick={() => setShowOrderForm(false)}
              className="w-full px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </EnterpriseDashboardLayout>
  )
}
