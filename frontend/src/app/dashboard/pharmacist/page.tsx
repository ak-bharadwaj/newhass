'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { RegionalBanner } from '@/components/branding/RegionalBanner'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { DashboardSkeleton } from '@/components/common/LoadingSkeletons'
import { promiseFeedback } from '@/lib/activityFeedback'
import { apiClient, Prescription } from '@/lib/api'
import { PrescriptionQueue } from '@/components/operations/PrescriptionQueue'
import { Modal } from '@/components/dashboard/Modal'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { useTheme } from '@/lib/themeUtils'
import SectionHeader from '@/components/common/SectionHeader'

export default function PharmacistDashboard() {
  const { user, token, hasRole } = useAuth()
  const { isDark } = useTheme()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showInventoryModal, setShowInventoryModal] = useState(false)

  // Inventory form
  const [inventoryForm, setInventoryForm] = useState({
    medication_name: '',
    quantity: 0,
    unit: 'tablets',
    expiry_date: '',
    notes: '',
  })

  useEffect(() => {
    loadPrescriptions()
  }, [])
  const loadPrescriptions = async () => {
    if (!token || !user?.hospital_id) return
    try {
      setIsLoading(true)
      setError(null)
      const list = await apiClient.listPrescriptions(token, { hospital_id: user.hospital_id, status: 'active', limit: 200 })
      setPrescriptions(list)
    } catch (err: any) {
      console.error('Failed to load prescriptions', err)
      setError(err?.message || 'Failed to load prescriptions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDispense = async (prescriptionId: string) => {
    if (!token) return
    try {
      // mark as dispensed via apiClient if available
      if (apiClient?.administerMedication) {
        await apiClient.administerMedication(prescriptionId, token)
      } else {
        // Fallback to direct endpoint (match backend API)
        const res = await fetch(`${apiClient['baseURL']}/api/v1/clinical/prescriptions/${prescriptionId}/administer`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: '' }),
        })
        if (!res.ok) throw new Error('Failed to mark as dispensed')
      }
      await loadPrescriptions()
    } catch (err: any) {
      console.error('Failed to mark prescription as dispensed', err)
      setError(err?.message || 'Failed to mark as dispensed')
    }
  }

  const handleAddInventory = async () => {
    if (!token || !user?.hospital_id) return

    await promiseFeedback(
      (async () => {
        // use central apiClient for inventory actions
        return await apiClient.createInventoryItem({ hospital_id: user.hospital_id, ...inventoryForm }, token)
      })(),
      {
        loading: 'Adding to inventory...',
        success: 'Inventory updated successfully!',
        error: 'Failed to add inventory',
      }
    )

    setShowInventoryModal(false)
    setInventoryForm({
      medication_name: '',
      quantity: 0,
      unit: 'tablets',
      expiry_date: '',
      notes: '',
    })
  }

  const filteredPrescriptions = filterStatus === 'all' ? prescriptions : prescriptions.filter(p => p.status === filterStatus)


  if (!user || user.role_name !== 'pharmacist') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be a pharmacist to access this dashboard.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen p-8 ${isDark ? 'bg-gradient-to-br from-gray-900 via-green-900/20 to-teal-900/20' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <EnterpriseDashboardLayout role="pharmacist">
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-green-900/20 to-teal-900/20' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
      {/* Regional Banner */}
      <RegionalBanner />

      {/* Header */}
      <SectionHeader
        title="Pharmacist Dashboard"
        subtitle={`Welcome, ${user.first_name} ${user.last_name}`}
        chips={[{ label: 'Live', color: 'blue' }, { label: new Date().toLocaleDateString(), color: 'gray' }]}
      />

      {/* Actions */}
      <div className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg rounded-2xl p-4">
        <div className="container mx-auto px-2">
          <div className="flex items-center gap-2 flex-wrap">
            <FeedbackButton
              onClick={() => setShowInventoryModal(true)}
              variant="primary"
              className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Manage Stock
            </FeedbackButton>
            <FeedbackButton
              onClick={() => setFilterStatus('all')}
              variant={filterStatus === 'all' ? 'primary' : 'ghost'}
              className={`${filterStatus === 'all' ? 'shadow-md' : 'bg-white hover:bg-gray-100 shadow-sm'} transition-all`}
              size="sm"
            >
              All
            </FeedbackButton>
            <FeedbackButton
              onClick={() => setFilterStatus('pending')}
              variant={filterStatus === 'pending' ? 'warning' : 'ghost'}
              className={`${filterStatus === 'pending' ? 'shadow-md' : 'bg-white hover:bg-gray-100 shadow-sm'} transition-all`}
              size="sm"
            >
              Pending
            </FeedbackButton>
            <FeedbackButton
              onClick={() => setFilterStatus('dispensed')}
              variant={filterStatus === 'dispensed' ? 'success' : 'ghost'}
              className={`${filterStatus === 'dispensed' ? 'shadow-md' : 'bg-white hover:bg-gray-100 shadow-sm'} transition-all`}
              size="sm"
            >
              Dispensed
            </FeedbackButton>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mb-6 p-4 bg-error-50 border-l-4 border-error-500 text-error-700 rounded-lg shadow-md"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <div className="glass bg-gradient-to-br from-primary-500 to-primary-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-medium">Total</span>
              </div>
              <p className="text-4xl font-bold mb-1">{prescriptions.length}</p>
              <p className="text-white/90 text-sm">Prescriptions</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <div className="glass bg-gradient-to-br from-warning-500 to-warning-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-medium">Waiting</span>
              </div>
              <p className="text-4xl font-bold mb-1">{prescriptions.filter(p => p.status === 'active' || p.status === 'pending').length}</p>
              <p className="text-white/90 text-sm">Pending</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <div className="glass bg-gradient-to-br from-success-500 to-success-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-medium">Today</span>
              </div>
              <p className="text-4xl font-bold mb-1">
                {prescriptions.filter(p => p.dispensed_at && new Date(p.dispensed_at).toDateString() === new Date().toDateString()).length}
              </p>
              <p className="text-white/90 text-sm">Dispensed Today</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
            <div className="glass bg-gradient-to-br from-secondary-500 to-secondary-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-medium">Stock</span>
              </div>
              <p className="text-4xl font-bold mb-1">Active</p>
              <p className="text-white/90 text-sm">Inventory</p>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <PrescriptionQueue
            prescriptions={filteredPrescriptions}
            onPrescriptionClick={setSelectedPrescription}
            onDispense={hasRole('nurse') ? handleDispense : undefined}
          />
        </motion.div>
      </div>

      <Modal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        title="Manage Pharmacy Stock"
        size="md"
        footer={
          <>
            <FeedbackButton onClick={() => setShowInventoryModal(false)} variant="ghost">Cancel</FeedbackButton>
            <FeedbackButton
              onClickAsync={handleAddInventory}
              loadingText="Adding..."
              successText="Added!"
              variant="primary"
              disabled={!inventoryForm.medication_name || inventoryForm.quantity <= 0}
            >
              Add to Inventory
            </FeedbackButton>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAddInventory(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name *</label>
            <input
              type="text"
              required
              value={inventoryForm.medication_name}
              onChange={(e) => setInventoryForm({ ...inventoryForm, medication_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Amoxicillin"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                required
                min="1"
                value={inventoryForm.quantity}
                onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select
                value={inventoryForm.unit}
                onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="tablets">Tablets</option>
                <option value="capsules">Capsules</option>
                <option value="bottles">Bottles</option>
                <option value="vials">Vials</option>
                <option value="boxes">Boxes</option>
                <option value="ml">mL</option>
                <option value="grams">Grams</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
            <input
              type="date"
              required
              value={inventoryForm.expiry_date}
              onChange={(e) => setInventoryForm({ ...inventoryForm, expiry_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={inventoryForm.notes}
              onChange={(e) => setInventoryForm({ ...inventoryForm, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Batch number, storage instructions, etc..."
            />
          </div>
        </form>
      </Modal>
      </div>
    </EnterpriseDashboardLayout>
  )
}
