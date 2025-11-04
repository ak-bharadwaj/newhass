'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'

// NOTE: Billing endpoints are not yet available in the API client.
// We present a professional empty state with the existing UI shell.
type InvoiceUI = {
  id: string
  patientName: string
  patientMRN: string
  dateIssued: string
  total: number
  amountPaid: number
  balance: number
  status: 'pending' | 'partial' | 'paid'
  items: { description: string; total: number }[]
  insuranceClaim?: { provider: string; claimNumber: string; status: string }
}

export default function ReceptionBilling() {
  const [invoices, setInvoices] = useState<InvoiceUI[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceUI | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = () => {
    // No billing API yet: render empty state gracefully
    setInvoices([])
    setLoading(false)
  }

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.patientMRN.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'pending').length,
    partial: invoices.filter(i => i.status === 'partial').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
    pendingAmount: invoices.filter(i => i.status !== 'paid').reduce((sum, inv) => sum + inv.balance, 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'partial': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'paid': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const processPayment = () => {
    if (selectedInvoice && paymentAmount) {
      const amount = parseFloat(paymentAmount)
      const newPaidAmount = selectedInvoice.amountPaid + amount
      const newBalance = selectedInvoice.total - newPaidAmount
      
      setInvoices(prev => prev.map(inv => 
        inv.id === selectedInvoice.id ? {
          ...inv,
          amountPaid: newPaidAmount,
          balance: newBalance,
          status: newBalance <= 0 ? 'paid' as const : 'partial' as const
        } : inv
      ))
      
      setShowPaymentModal(false)
      setSelectedInvoice(null)
      setPaymentAmount('')
    }
  }

  const openPaymentModal = (invoice: InvoiceUI) => {
    setSelectedInvoice(invoice)
    setPaymentAmount(invoice.balance.toFixed(2))
    setShowPaymentModal(true)
  }

  return (
    <EnterpriseDashboardLayout role="reception">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/reception" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Billing & Payments
          </h1>
          <p className="text-gray-600">Process payments and manage billing</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          {[
            { label: 'Total Invoices', value: stats.total, color: 'from-cyan-500 to-blue-500', icon: '📄', prefix: '' },
            { label: 'Pending', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳', prefix: '' },
            { label: 'Partial Paid', value: stats.partial, color: 'from-orange-500 to-red-500', icon: '💰', prefix: '' },
            { label: 'Fully Paid', value: stats.paid, color: 'from-green-500 to-emerald-500', icon: '✅', prefix: '' },
            { label: 'Total Amount', value: stats.totalAmount.toFixed(2), color: 'from-blue-500 to-indigo-500', icon: '💵', prefix: '$' },
            { label: 'Pending Amount', value: stats.pendingAmount.toFixed(2), color: 'from-red-500 to-pink-500', icon: '⚠️', prefix: '$' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl mb-3`}>
                  {stat.icon}
                </div>
                <p className="text-gray-600 text-xs font-medium">{stat.label}</p>
                <p className="text-xl font-bold mt-1">{stat.prefix}{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by patient, MRN, or invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            {filteredInvoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md p-6 border-2 border-gray-100 hover:border-cyan-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                      💳
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{invoice.patientName}</h3>
                      <p className="text-gray-600">Invoice: {invoice.id} | MRN: {invoice.patientMRN}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">📅 {invoice.dateIssued}</span>
                        <span className="text-sm font-bold text-blue-600">Total: ${invoice.total.toFixed(2)}</span>
                        <span className="text-sm font-bold text-green-600">Paid: ${invoice.amountPaid.toFixed(2)}</span>
                        {invoice.balance > 0 && (
                          <span className="text-sm font-bold text-red-600">Balance: ${invoice.balance.toFixed(2)}</span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(invoice.status)}`}>
                          {invoice.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1">
                        {invoice.items.map((item, i) => (
                          <p key={i} className="text-sm text-gray-600">
                            • {item.description}: ${item.total.toFixed(2)}
                          </p>
                        ))}
                      </div>
                      {invoice.insuranceClaim && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            🏥 Insurance: {invoice.insuranceClaim.provider} | Claim: {invoice.insuranceClaim.claimNumber} | Status: {invoice.insuranceClaim.status}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {invoice.status !== 'paid' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openPaymentModal(invoice)}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      Process Payment
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}

            {filteredInvoices.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No invoices found</p>
                <p className="text-gray-400 mt-2">Billing integration is not available yet. This page will display real invoices once enabled.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Process Payment</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-semibold text-lg">{selectedInvoice.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold">{selectedInvoice.id}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-bold text-lg">${selectedInvoice.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="font-bold text-lg text-green-600">${selectedInvoice.amountPaid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Balance</p>
                    <p className="font-bold text-lg text-red-600">${selectedInvoice.balance.toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Process
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
